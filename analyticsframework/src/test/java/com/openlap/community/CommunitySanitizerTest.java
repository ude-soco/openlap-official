package com.openlap.community;

import static org.assertj.core.api.Assertions.*;
import com.google.gson.JsonParser;
import com.openlap.analytics_module.entities.Indicator;
import com.openlap.analytics_module.entities.utility_entities.IndicatorType;
import com.openlap.user.entities.User;
import com.openlap.user.entities.utility_entities.LrsConsumer;
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
  @Test public void indexedMetadataUsesOnlyAnonymizedNamesNotRawTitlesOrQueries() {
    Indicator source = new Indicator(); source.setCreatedBy(creator()); source.setIndicatorType(IndicatorType.BASIC);
    source.setName("Alice's private indicator"); source.setIndicatorQuery("private original query");
    source.setConfigurationRequest("private original editor settings");
    Document document = new Document(); CommunityMetadata.populate(source, document);
    assertThat(document.get("communityMetadata", Document.class).getString("name")).isEqualTo("Learning activity indicator");
    assertThat(document.toJson()).doesNotContain("Alice", "private original", "createdBy", "createdById");
  }
}
