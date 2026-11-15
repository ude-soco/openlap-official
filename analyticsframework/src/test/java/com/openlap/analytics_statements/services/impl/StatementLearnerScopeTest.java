package com.openlap.analytics_statements.services.impl;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.openlap.analytics_statements.dtos.request.*;
import com.openlap.analytics_statements.entities.LrsStore;
import com.openlap.analytics_statements.entities.utility_entities.*;
import com.openlap.analytics_statements.services.LrsService;
import java.util.*;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.junit.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.*;
import org.springframework.test.util.ReflectionTestUtils;

/** The same identifier can belong to different people in different LRSs. */
public class StatementLearnerScopeTest {
  private static final String FIRST = "000000000000000000000001";
  private static final String SECOND = "000000000000000000000002";

  private Document scope(UserQueryCondition condition, boolean duplicateStore) {
    MongoTemplate mongo = mock(MongoTemplate.class);
    LrsService lrs = mock(LrsService.class);
    LrsStore first = new LrsStore(); first.setUniqueIdentifierType(UniqueIdentifierType.MBOX);
    LrsStore second = new LrsStore(); second.setUniqueIdentifierType(UniqueIdentifierType.ACCOUNT_NAME);
    when(lrs.getLrsStore(FIRST)).thenReturn(first);
    when(lrs.getLrsStore(SECOND)).thenReturn(second);
    when(mongo.aggregate(any(Aggregation.class), eq("statements"), eq(Document.class)))
        .thenReturn(new AggregationResults<>(List.of(), new Document()));
    var service = new StatementServiceImpl(mongo, lrs);
    ReflectionTestUtils.setField(service, "collection", "statements");
    List<LrsStoresStatementRequest> stores = new ArrayList<>(List.of(
        new LrsStoresStatementRequest(FIRST, "learner-a"),
        new LrsStoresStatementRequest(SECOND, "learner-b")));
    if (duplicateStore) stores.add(new LrsStoresStatementRequest(FIRST, "learner-c"));
    var query = new StatementsRequest(stores, List.of("type"), List.of("action"),
        Map.of("statement.object.definition.name.en", new ArrayList<>(List.of("Material"))),
        new StatementDuration("2020-01-01", "2030-01-01"), List.of("statement.object.id"), condition);
    service.findStatements(query);
    ArgumentCaptor<Aggregation> pipeline = ArgumentCaptor.forClass(Aggregation.class);
    verify(mongo).aggregate(pipeline.capture(), eq("statements"), eq(Document.class));
    return Document.parse(pipeline.getValue().toPipeline(Aggregation.DEFAULT_CONTEXT).get(0).get("$match", Document.class).toJson());
  }

  @Test public void ownDataPairsEachIdentityWithItsSpecificStoreAndIdentifierType() {
    var clauses = scope(UserQueryCondition.ONLY_ME, false).getList("$and", Document.class);
    var pairs = clauses.get(2).getList("$or", Document.class);
    assertThat(pairs).containsExactly(
        new Document("lrs_id", new ObjectId(FIRST))
            .append("statement.actor.mbox", new Document("$in", List.of("learner-a"))),
        new Document("lrs_id", new ObjectId(SECOND))
            .append("statement.actor.account.name", new Document("$in", List.of("learner-b"))));
  }

  @Test public void exclusionsExcludeAllOwnIdentitiesWithinEachStoreRatherThanOrOfNotEquals() {
    var pairs = scope(UserQueryCondition.EXCLUDE_ME, true).getList("$and", Document.class)
        .get(2).getList("$or", Document.class);
    assertThat(pairs).containsExactly(
        new Document("lrs_id", new ObjectId(FIRST))
            .append("statement.actor.mbox", new Document("$nin", List.of("learner-a", "learner-c"))),
        new Document("lrs_id", new ObjectId(SECOND))
            .append("statement.actor.account.name", new Document("$nin", List.of("learner-b"))));
  }

  @Test public void allUsersModeRetainsItsExistingStoreScope() {
    var clauses = scope(UserQueryCondition.INCLUDE_ME, false).getList("$and", Document.class);
    assertThat(clauses).hasSize(2);
    assertThat(clauses.get(0).get("lrs_id", Document.class))
        .containsEntry("$in", List.of(new ObjectId(FIRST), new ObjectId(SECOND)));
  }
}
