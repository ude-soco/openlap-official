package com.openlap.analytics_statements.services.impl;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.openlap.analytics_statements.dtos.request.*;
import com.openlap.analytics_statements.entities.utility_entities.UserQueryCondition;
import com.openlap.analytics_statements.services.LrsService;
import com.openlap.dataset.OpenLAPColumnDataType;
import java.util.*;
import org.bson.Document;
import org.junit.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.*;
import org.springframework.test.util.ReflectionTestUtils;

public class StatementObservationAlignmentTest {
  @Test public void missingFieldsRetainTheirEventPositionAndLegacyTextMetadata() {
    MongoTemplate mongo = mock(MongoTemplate.class);
    when(mongo.aggregate(any(Aggregation.class), eq("statements"), eq(Document.class)))
        .thenReturn(new AggregationResults<>(List.of(
            new Document("field1", "learner-a").append("field2", 12.5),
            new Document("field1", "learner-b"),
            new Document("field2", 7).append("field3", false),
            new Document("field1", "learner-c").append("field2", null)), new Document()));
    var service = new StatementServiceImpl(mongo, mock(LrsService.class));
    ReflectionTestUtils.setField(service, "collection", "statements");
    List<String> outputs = List.of("statement.actor.account.name", "statement.result.score.raw", "statement.result.success");
    var query = new StatementsRequest(
        List.of(new LrsStoresStatementRequest("000000000000000000000001", "viewer")),
        List.of("type"), List.of("action"),
        Map.of("statement.object.definition.name.en", new ArrayList<>(List.of("Quiz"))),
        new StatementDuration("2020-01-01", "2030-01-01"), outputs, UserQueryCondition.INCLUDE_ME);

    var data = service.findStatements(query);

    assertThat(data.getColumns().get(outputs.get(0)).getData()).containsExactly("learner-a", "learner-b", null, "learner-c");
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
}
