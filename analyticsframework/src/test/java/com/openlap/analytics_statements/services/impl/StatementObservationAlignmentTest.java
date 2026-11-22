package com.openlap.analytics_statements.services.impl;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.openlap.analytics_statements.dtos.StatementInputAvailability.ScoreCategoryPair;
import com.openlap.analytics_statements.dtos.request.*;
import com.openlap.analytics_statements.entities.utility_entities.UserQueryCondition;
import com.openlap.analytics_statements.services.LrsService;
import com.openlap.dataset.OpenLAPColumnDataType;
import com.openlap.infrastructure.exception.ValidationException;
import java.util.*;
import java.util.stream.IntStream;
import java.util.stream.Stream;
import org.bson.Document;
import org.junit.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.*;
import org.springframework.test.util.ReflectionTestUtils;

public class StatementObservationAlignmentTest {
  private static StatementsRequest inputQuery(List<String> outputs) {
    return new StatementsRequest(
        List.of(new LrsStoresStatementRequest("000000000000000000000001", "viewer")),
        List.of("type"), List.of("action"),
        Map.of("statement.object.definition.name.en", new ArrayList<>(List.of("Quiz"))),
        new StatementDuration("2020-01-01", "2030-01-01"), outputs, UserQueryCondition.INCLUDE_ME);
  }

  @Test public void missingFieldsRetainTheirEventPositionAndLegacyTextMetadata() {
    MongoTemplate mongo = mock(MongoTemplate.class);
    when(mongo.aggregate(any(Aggregation.class), eq("statements"), eq(Document.class)))
        .thenReturn(new AggregationResults<>(List.of(
            new Document("field1", "Quiz A").append("field2", 12.5),
            new Document("field1", "Quiz B"),
            new Document("field2", 7).append("field3", false),
            new Document("field1", "Quiz C").append("field2", null)), new Document()));
    var service = new StatementServiceImpl(mongo, mock(LrsService.class));
    ReflectionTestUtils.setField(service, "collection", "statements");
    List<String> outputs = List.of("statement.object.definition.name.en", "statement.result.score.raw", "statement.result.success");
    var query = new StatementsRequest(
        List.of(new LrsStoresStatementRequest("000000000000000000000001", "viewer")),
        List.of("type"), List.of("action"),
        Map.of("statement.object.definition.name.en", new ArrayList<>(List.of("Quiz"))),
        new StatementDuration("2020-01-01", "2030-01-01"), outputs, UserQueryCondition.INCLUDE_ME);

    var data = service.findStatements(query);

    assertThat(data.getColumns().get(outputs.get(0)).getData()).containsExactly("Quiz A", "Quiz B", null, "Quiz C");
    assertThat(data.getColumns().get(outputs.get(1)).getData()).containsExactly(12.5, null, 7, null);
    assertThat(data.getColumns().get(outputs.get(2)).getData()).containsExactly(null, null, false, null);
    assertThat(data.getColumnsConfigurationData()).allSatisfy(column ->
        assertThat(column.getType()).isEqualTo(OpenLAPColumnDataType.Text));
    ArgumentCaptor<Aggregation> pipeline = ArgumentCaptor.forClass(Aggregation.class);
    verify(mongo).aggregate(pipeline.capture(), eq("statements"), eq(Document.class));
    assertThat(pipeline.getValue().toPipeline(Aggregation.DEFAULT_CONTEXT).get(1))
        .isEqualTo(new Document("$sort", new Document("statement.timestamp", 1)
            .append("statement.stored", 1).append("_id", 1)));
  }

  @Test public void learnerIdentifiersAreRejectedBeforeProjectingAnalysisRows() {
    MongoTemplate mongo = mock(MongoTemplate.class);
    var service = new StatementServiceImpl(mongo, mock(LrsService.class));
    var query = new StatementsRequest();
    query.setOutputs(List.of("statement.object.id", "statement.actor.account.name"));

    assertThatThrownBy(() -> service.findStatements(query))
        .isInstanceOf(ValidationException.class).extracting("code").isEqualTo("PRIVATE_ANALYSIS_INPUT");
    verifyNoInteractions(mongo);
  }

  @Test public void availabilityReportsUsableTypesAndSameRowPairsWithoutValues() {
    String score = "statement.result.score.raw";
    String invalidScore = "statement.result.score.min";
    String success = "statement.result.success";
    String completion = "statement.result.completion";
    String category = "statement.object.definition.name.en-US";
    String secondCategory = "statement.object.id";
    String stored = "statement.stored";
    String timestamp = "statement.timestamp";
    MongoTemplate mongo = mock(MongoTemplate.class);
    when(mongo.aggregateStream(any(Aggregation.class), eq("statements"), eq(Document.class))).thenReturn(Stream.of(
        new Document("field1", 0).append("field2", Double.POSITIVE_INFINITY).append("field3", false)
            .append("field5", "Quiz A").append("field7", new Date(0)).append("field8", "2026-02-09T10:00:00Z"),
        new Document("field2", 1).append("field4", " FALSE ").append("field6", "http://test.example/quiz")
            .append("field8", "2026-02-09T10:00:00")));
    var service = new StatementServiceImpl(mongo, mock(LrsService.class));
    ReflectionTestUtils.setField(service, "collection", "statements");

    var profile = service.findInputAvailability(inputQuery(List.of(
        score, invalidScore, success, completion, category, secondCategory, stored, timestamp)));

    assertThat(profile.checkedStatements()).isEqualTo(2);
    assertThat(profile.complete()).isTrue();
    assertThat(profile.availableFields()).containsExactlyInAnyOrder(score, success, completion, category, secondCategory, stored);
    assertThat(profile.invalidFields()).containsExactlyInAnyOrder(invalidScore, timestamp);
    assertThat(profile.scoreCategoryPairs()).containsExactly(new ScoreCategoryPair(score, category));
    assertThat(profile.toString()).doesNotContain("Quiz A", "viewer", "test.example", "2026-02-09");
  }

  @Test public void availabilityLimitsTheScanAndReportsWhetherTheProbeExhaustedIt() {
    MongoTemplate mongo = mock(MongoTemplate.class);
    when(mongo.aggregateStream(any(Aggregation.class), eq("statements"), eq(Document.class)))
        .thenAnswer(call -> IntStream.range(0, 2_001).mapToObj(row ->
            row == 2_000 ? new Document("field1", 5) : new Document()));
    var service = new StatementServiceImpl(mongo, mock(LrsService.class));
    ReflectionTestUtils.setField(service, "collection", "statements");

    var profile = service.findInputAvailability(inputQuery(List.of("statement.result.score.raw")));

    assertThat(profile.checkedStatements()).isEqualTo(2_000);
    assertThat(profile.complete()).isFalse();
    assertThat(profile.availableFields()).isEmpty();
    ArgumentCaptor<Aggregation> pipeline = ArgumentCaptor.forClass(Aggregation.class);
    verify(mongo).aggregateStream(pipeline.capture(), eq("statements"), eq(Document.class));
    assertThat(pipeline.getValue().toPipeline(Aggregation.DEFAULT_CONTEXT)).contains(
        new Document("$limit", 2_001L),
        new Document("$project", new Document("_id", 0).append("field1", "$statement.result.score.raw")));
    assertThat(pipeline.getValue().getOptions().getMaxTime()).isEqualTo(java.time.Duration.ofSeconds(4));
  }

  @Test public void availabilityRejectsPrivateFieldsAndInvalidFiltersBeforeQuerying() {
    MongoTemplate mongo = mock(MongoTemplate.class);
    var service = new StatementServiceImpl(mongo, mock(LrsService.class));
    assertThatThrownBy(() -> service.findInputAvailability(inputQuery(List.of("statement.actor.name"))))
        .isInstanceOf(ValidationException.class).extracting("code").isEqualTo("PRIVATE_ANALYSIS_INPUT");
    assertThatThrownBy(() -> service.findInputAvailability(inputQuery(List.of("statement.result.response"))))
        .isInstanceOf(ValidationException.class).extracting("code").isEqualTo("ANALYSIS_INPUT_AVAILABILITY_INVALID");
    var badFilter = inputQuery(List.of("statement.result.score.raw"));
    badFilter.setActivities(Map.of("statement.actor.name", new ArrayList<>(List.of("Learner"))));
    assertThatThrownBy(() -> service.findInputAvailability(badFilter))
        .isInstanceOf(ValidationException.class).extracting("code").isEqualTo("ANALYSIS_INPUT_AVAILABILITY_INVALID");
    var missingDuration = inputQuery(List.of("statement.result.score.raw"));
    missingDuration.setDuration(null);
    assertThatThrownBy(() -> service.findInputAvailability(missingDuration))
        .isInstanceOf(ValidationException.class).extracting("code").isEqualTo("ANALYSIS_INPUT_AVAILABILITY_INVALID");
    verifyNoInteractions(mongo);
  }
}
