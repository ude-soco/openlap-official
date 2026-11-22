package com.openlap.community;

import static org.assertj.core.api.Assertions.*;
import com.google.gson.JsonParser;
import com.openlap.analytics_module.entities.Indicator;
import com.openlap.analytics_module.entities.utility_entities.IndicatorType;
import com.openlap.analytics_module.entities.utility_entities.VisualizationTechniqueReference;
import com.openlap.user.entities.User;
import com.openlap.user.entities.utility_entities.LrsConsumer;
import com.openlap.visualization_methods.entities.VisType;
import java.util.List;
import org.bson.Document;
import org.junit.Test;

public class CommunitySanitizerTest {
  static User creator() {
    User user = new User(); user.setId("0123456789abcdef01234567");
    user.setName("Alice Researcher"); user.setEmail("alice@private.example");
    user.setLrsConsumerList(List.of(new LrsConsumer(null, "private-store-id", "private-learner-id")));
    return user;
  }
  @Test public void personalTextUrlsHtmlAndActorIdentifiersFallBackRatherThanLeak() {
    for (String raw : List.of("Alice's weekly progress", "RESEARCHER summary", "alice@private.example report",
        "Learning at https://private.example/alice", "Account 0123456789abcdef01234567", "<b>Private</b>",
        "Chart for private-learner-id", "From private-store-id"))
      assertThat(CommunitySanitizer.text(raw, creator(), "Anonymous specification")).isEqualTo("Anonymous specification");
    assertThat(CommunitySanitizer.text("Weekly material accesses", creator(), "fallback")).isEqualTo("Weekly material accesses");
    User shortName = creator(); shortName.setName("Ed");
    assertThat(CommunitySanitizer.text("Ed's progress", shortName, "fallback")).isEqualTo("fallback");
    assertThat(CommunitySanitizer.text("Learning data", null, "fallback")).isEqualTo("fallback");
  }
  @Test public void contactAndFixedWidthIdentifierDetectionPreservesPrivacy() {
    for (String raw : List.of("user+group@example.test", "Contact @ hidden identity", "HTTP://example.test",
        "HTTPS://example.test", "WWW.example.test", "MAILTO:learner", "Markup > text",
        "Account fedcba9876543210fedcba98", "Reference 12345678-abcd-0123-4567-89abcdef0123"))
      assertThat(CommunitySanitizer.text(raw, creator(), "fallback")).as(raw).isEqualTo("fallback");
    assertThat(CommunitySanitizer.text("Weekly  material\naccesses", creator(), "fallback"))
        .isEqualTo("Weekly material accesses");
  }

  @Test(timeout = 5000) public void adversarialNonEmailRunsRemainBoundedAndOversizedInputIsRejectedEarly() {
    String plus = "+".repeat(500);
    String dotted = "a.".repeat(250);
    for (int count = 0; count < 1000; count++) {
      assertThat(CommunitySanitizer.text(plus, creator(), "fallback")).isEqualTo(plus);
      assertThat(CommunitySanitizer.text(dotted, creator(), "fallback")).isEqualTo(dotted);
    }
    assertThat(CommunitySanitizer.text("+".repeat(1_000_000), creator(), "fallback")).isEqualTo("fallback");
    assertThat(CommunitySanitizer.text(" ".repeat(1_000_000) + "Weekly accesses", creator(), "fallback"))
        .isEqualTo("fallback");
    assertThat(CommunitySanitizer.text("+".repeat(498) + "@x", creator(), "fallback")).isEqualTo("fallback");
  }

  @Test public void chartStyleKeepsPresentationButDropsIdentifyingStringsCallbacksAndData() {
    Object sanitized = CommunitySanitizer.safeStyle(JsonParser.parseString("""
        {"title":{"text":"Alice"},"annotations":[{"label":"private-learner-id"}],
        "colors":["#ff8800","https://private.example"],"height":400,"showLegend":true,
        "legendPosition":"bottom","formatter":"function(){sendSecret()}","name":"private-store-id",
        "xAxisTitle":"Alice","privateField":"not an enum","chart":{"zoom":{"enabled":true}}}
        """));
    String json = CommunitySanitizer.json(sanitized);
    assertThat(json).contains("#ff8800", "400", "bottom", "enabled");
    assertThat(json).doesNotContain("Alice", "private", "formatter", "annotations", "title", "https", "function");
  }
  @Test public void dataDrivenCustomizationsAreOmittedEvenWithHarmlessFieldNamesAndLabelValues() {
    var chart = new VisType();
    chart.setVisualizationDescriptor(new Document("customizations", List.of(
        new Document("id", "visibility").append("type", "categoryFilter"),
        new Document("id", "palette").append("type", "seriesColors"))));
    var indicator = new Indicator();
    indicator.setVisualizationTechniqueReference(new VisualizationTechniqueReference("""
        {"visibility":["left"],"palette":[{"key":"right","color":"#123456"}],"showLegend":true}
        """, "{}", null, chart));

    assertThat(CommunitySanitizer.json(CommunitySanitizer.visualizationParams(indicator)))
        .isEqualTo("{\"showLegend\":true}");
  }
  @Test public void compositeMethodFiltersUseTheSourcesCommonAnalyticsMethod() {
    var method = new com.openlap.analytics_technique.entities.AnalyticsTechnique();
    method.setName("Count items");
    Indicator basic = new Indicator();
    basic.setAnalyticsTechniqueReference(new com.openlap.analytics_module.entities.utility_entities.AnalyticsTechniqueReference("[]", "{}", method));
    Indicator composite = new Indicator(); composite.setCreatedBy(creator());
    composite.setIndicatorType(IndicatorType.COMPOSITE);
    composite.setIndicators(List.of(new com.openlap.analytics_module.entities.utility_entities.IndicatorsToMerge(basic, null)));
    Document document = new Document(); CommunityMetadata.populate(composite, document);
    assertThat(document.get("communityMetadata", Document.class).getString("method")).isEqualTo("Count items");
    assertThat(document.toJson()).doesNotContain("createdBy", "Alice", "indicators");
  }
  @Test public void indexedMetadataUsesOnlyAnonymizedNamesNotRawTitlesOrQueries() {
    Indicator source = new Indicator(); source.setCreatedBy(creator()); source.setIndicatorType(IndicatorType.BASIC);
    source.setName("Alice's private indicator"); source.setIndicatorQuery("private original query");
    source.setConfigurationRequest("private original editor settings");
    Document document = new Document(); CommunityMetadata.populate(source, document);
    assertThat(document.get("communityMetadata", Document.class).getString("name")).isEqualTo("Learning activity indicator");
    assertThat(document.toJson()).doesNotContain("Alice", "private original", "createdBy", "createdById");
  }
}
