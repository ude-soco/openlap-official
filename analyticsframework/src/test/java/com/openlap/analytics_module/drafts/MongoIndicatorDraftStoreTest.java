package com.openlap.analytics_module.drafts;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.mongodb.*;
import com.mongodb.client.*;
import com.mongodb.client.model.IndexOptions;
import com.mongodb.client.result.UpdateResult;
import java.util.*;
import org.bson.Document;
import org.junit.Before;
import org.junit.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.mongodb.core.MongoTemplate;

public class MongoIndicatorDraftStoreTest {
  private final MongoTemplate mongo=mock(MongoTemplate.class);
  @SuppressWarnings("unchecked") private final MongoCollection<Document> rows=mock(MongoCollection.class);
  @SuppressWarnings("unchecked") private final MongoCollection<Document> catalog=mock(MongoCollection.class);
  private MongoIndicatorDraftStore store;
  @Before public void setup() {
    when(mongo.getCollection(anyString())).thenAnswer(call->IndicatorDraftStore.COLLECTION.equals(call.getArgument(0))?rows:catalog);
    @SuppressWarnings("unchecked") FindIterable<Document> found=mock(FindIterable.class);
    @SuppressWarnings("unchecked") MongoCursor<Document> cursor=mock(MongoCursor.class);
    when(catalog.find()).thenReturn(found); when(found.projection(any())).thenReturn(found); when(found.iterator()).thenReturn(cursor);
    store=new MongoIndicatorDraftStore(mongo);
  }
  @Test public void conditionalDraftWritesIncludeOwnerRevisionAndLifecycleInOneDatabaseOperation() {
    Document before=new Document("_id","draft").append("ownerId","owner").append("revision",5L).append("status","DRAFT");
    Document after=new Document(before).append("revision",6L).append("name","Updated");
    when(rows.replaceOne(any(Document.class),any(Document.class))).thenReturn(UpdateResult.acknowledged(1,1L,null));
    assertThat(store.replace("owner",before,after)).isTrue();
    ArgumentCaptor<Document> filter=ArgumentCaptor.forClass(Document.class);
    verify(rows).replaceOne(filter.capture(),eq(after));
    assertThat(filter.getValue()).containsEntry("_id","draft").containsEntry("revision",5L).containsEntry("status","DRAFT");
    assertThat(filter.getValue().getList("$or",Document.class)).contains(new Document("ownerId","owner"));
    when(rows.replaceOne(any(Document.class),any(Document.class))).thenReturn(UpdateResult.acknowledged(0,0L,null));
    assertThat(store.replace("owner",before,after)).isFalse();
  }
  @Test public void activeEditUniquenessIsEnforcedByMongoAndDuplicateCreateIsRecoverable() {
    Document draft=new Document("_id","draft").append("ownerId","owner").append("activeSourceKey","owner:source");
    store.insert(draft);
    ArgumentCaptor<IndexOptions> options=ArgumentCaptor.forClass(IndexOptions.class);
    verify(rows).createIndex(eq(new Document("activeSourceKey",1)),options.capture());
    assertThat(options.getValue().isUnique()).isTrue(); assertThat(options.getValue().isSparse()).isTrue();
    MongoWriteException duplicate=mock(MongoWriteException.class);
    when(duplicate.getError()).thenReturn(new WriteError(11000,"duplicate",new org.bson.BsonDocument()));
    doThrow(duplicate).when(rows).insertOne(any(Document.class));
    assertThat(store.insert(draft)).isFalse();
    verify(rows,times(1)).createIndex(eq(new Document("activeSourceKey",1)),any(IndexOptions.class));
  }
}
