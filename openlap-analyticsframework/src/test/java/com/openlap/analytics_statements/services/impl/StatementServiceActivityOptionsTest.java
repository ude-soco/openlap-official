package com.openlap.analytics_statements.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.openlap.analytics_statements.dtos.request.ActivitiesRequest;
import com.openlap.analytics_statements.dtos.request.LrsStoresStatementRequest;
import com.openlap.analytics_statements.services.LrsService;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.junit.Before;
import org.junit.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import org.springframework.test.util.ReflectionTestUtils;

/** xAPI definition.name is a language map, including after MongoDB groups it. */
public class StatementServiceActivityOptionsTest {
  private static final String FIRST_LRS = "000000000000000000000001";
  private static final String SECOND_LRS = "000000000000000000000002";
  private static final String PDF = "https://example.test/activity-types/pdf";
  private static final String VIDEO = "https://example.test/activity-types/video";
  private static final String VIEWED = "https://example.test/verbs/viewed";
  private static final String COMPLETED = "https://example.test/verbs/completed";

  private final MongoTemplate mongo = mock(MongoTemplate.class);
  private final StatementServiceImpl service =
      new StatementServiceImpl(mongo, mock(LrsService.class));

  @Before
  public void setUp() {
    ReflectionTestUtils.setField(service, "collection", "statements");
  }

  @Test
  public void bsonLanguageMapBecomesAnActivityOptionInsteadOfAClassCastFailure() {
    assertThat(options(activity(new Document("en-US", "PDF handout"))))
        .containsExactly(option("en-US", "PDF handout"));
  }

  @Test
  public void usesTheFirstUsableLanguageAndSkipsNullBlankOrNonStringValues() {
    Document names = new Document("null-value", null)
        .append("blank-value", "  ")
        .append("number-value", 42)
        .append("nested-value", new Document("unexpected", "object"))
        .append("de-DE", "Folie")
        .append("en-US", "Slide");

    assertThat(options(activity(names))).containsExactly(option("de-DE", "Folie"));
  }

  @Test
  public void preservesTheExactLabelUsedToMatchStatements() {
    // Trimming a usable label would make the subsequent equality filter miss its statements.
    assertThat(options(activity(new Document("en-US", "  PDF handout  "))))
        .containsExactly(option("en-US", "  PDF handout  "));
  }

  @Test
  public void readsOnlyTheProjectedActivityNameAndDoesNotInterpretTheGroupIdAsALabel() {
    Document result = new Document("_id", "not an activity label")
        .append("activityName", new Document("en-GB", "Activity label"));

    assertThat(options(result)).containsExactly(option("en-GB", "Activity label"));
  }

  @Test
  public void absentOrMalformedLanguageMapsDoNotProduceBrokenOptions() {
    assertThat(options(
        new Document(),
        activity(null),
        activity("not a language map"),
        activity(new Document()),
        activity(new Document("en-US", "")),
        activity(new Document("en-US", new Document("unexpected", true)))))
        .isEmpty();
  }

  @Test
  public void sortsResolvedLabelsAndHandlesAnEmptyAggregation() {
    assertThat(options(
        activity(new Document("en-US", "Zeta")),
        activity(new Document("en-US", "Alpha"))))
        .containsExactly(option("en-US", "Alpha"), option("en-US", "Zeta"));

    assertThat(options()).isEmpty();
  }

  @Test
  public void aggregationKeepsStoreTypeAndVerbScopeAndProjectsTheGroupedLanguageMap() {
    options();
    ArgumentCaptor<Aggregation> aggregation = ArgumentCaptor.forClass(Aggregation.class);
    verify(mongo).aggregate(aggregation.capture(), eq("statements"), eq(Document.class));
    List<Document> pipeline = aggregation.getValue().toPipeline(Aggregation.DEFAULT_CONTEXT);
    Document match = pipeline.get(0).get("$match", Document.class);

    assertThat(match.get("lrs_id", Document.class).getList("$in", ObjectId.class))
        .containsExactly(new ObjectId(FIRST_LRS), new ObjectId(SECOND_LRS));
    assertThat(match.get("statement.object.definition.type", Document.class)
        .getList("$in", String.class)).containsExactly(PDF, VIDEO);
    assertThat(match.get("statement.verb.id", Document.class)
        .getList("$in", String.class)).containsExactly(VIEWED, COMPLETED);
    assertThat(pipeline.get(1).get("$group", Document.class).get("_id"))
        .isEqualTo("$statement.object.definition.name");
    Document project = pipeline.get(2).get("$project", Document.class);
    assertThat(project.get("activityName")).isEqualTo("$_id");
    assertThat(project.get("_id")).isEqualTo(0);
  }

  private List<Object> options(Document... results) {
    when(mongo.aggregate(any(Aggregation.class), eq("statements"), eq(Document.class)))
        .thenReturn(new AggregationResults<>(Arrays.asList(results), new Document()));
    ActivitiesRequest request = new ActivitiesRequest(
        List.of(new LrsStoresStatementRequest(FIRST_LRS, "fixture-one"),
            new LrsStoresStatementRequest(SECOND_LRS, "fixture-two")),
        List.of(PDF, VIDEO), List.of(VIEWED, COMPLETED));
    return service.findUniqueActivities(request);
  }

  private static Document activity(Object names) {
    return new Document("activityName", names);
  }

  private static Map<String, String> option(String language, String label) {
    return Map.of("id", label, "queryId", "statement.object.definition.name." + language,
        "name", label);
  }
}
