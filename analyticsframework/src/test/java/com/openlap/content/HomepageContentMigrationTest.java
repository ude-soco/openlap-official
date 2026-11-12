package com.openlap.content;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openlap.content.migration.HomepageContentMigration;
import com.openlap.infrastructure.exception.ConflictException;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import org.bson.Document;
import org.junit.Before;
import org.junit.Test;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.IndexOperations;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

/** Stateful test double verifies partial retry and no resurrection without requiring Docker. */
public class HomepageContentMigrationTest {
  private final MongoTemplate mongo = mock(MongoTemplate.class);
  private final HomepageContentMigration migration = new HomepageContentMigration(mongo, new ContentValidator(), new ObjectMapper());
  private final Map<String, ContentEntry> entries = new HashMap<>();
  private final Document ledger = new Document();
  private int contentWrites;
  private int failOnWrite = -1;
  private boolean corruptExisting;

  @Before public void setup() {
    when(mongo.indexOps(anyString())).thenReturn(mock(IndexOperations.class));
    when(mongo.upsert(any(Query.class), any(Update.class), anyString())).thenAnswer(call -> {
      Query query = call.getArgument(0); Update update = call.getArgument(1); String collection = call.getArgument(2);
      if (HomepageContentMigration.LEDGER.equals(collection)) {
        ledger.putIfAbsent("state", "PENDING"); return null;
      }
      contentWrites++;
      if (contentWrites == failOnWrite) throw new IllegalStateException("simulated interrupted import");
      String id = query.getQueryObject().getString("_id");
      String key = collection + "/" + id;
      if (!entries.containsKey(key)) {
        Document values = (Document) update.getUpdateObject().get("$setOnInsert");
        ContentEntry entry = new ContentEntry(); entry.setId(id); entry.setVersion(1); entry.setStatus("PUBLISHED");
        entry.setDraft(new LinkedHashMap<>((Map<String, Object>) values.get("draft")));
        entry.setPublished(new LinkedHashMap<>((Map<String, Object>) values.get("published")));
        if (corruptExisting) entry.getDraft().put("title", "Existing content must survive");
        entries.put(key, entry);
      }
      return null;
    });
    when(mongo.findOne(any(Query.class), eq(Document.class), eq(HomepageContentMigration.LEDGER)))
        .thenAnswer(call -> new Document(ledger));
    when(mongo.findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class), eq(Document.class), eq(HomepageContentMigration.LEDGER)))
        .thenAnswer(call -> {
          if (ledger.get("owner") != null || ledger.get("completedAt") != null) return null;
          apply(call.getArgument(1)); return new Document(ledger);
        });
    when(mongo.updateFirst(any(Query.class), any(Update.class), eq(HomepageContentMigration.LEDGER)))
        .thenAnswer(call -> { apply(call.getArgument(1)); return null; });
    when(mongo.findById(anyString(), eq(ContentEntry.class), anyString()))
        .thenAnswer(call -> entries.get(call.getArgument(2) + "/" + call.getArgument(0)));
    when(mongo.count(any(Query.class), anyString())).thenAnswer(call -> {
      String collection = call.getArgument(1);
      return entries.keySet().stream().filter(key -> key.startsWith(collection + "/")).count();
    });
  }

  private void apply(Update update) {
    Document fields = update.getUpdateObject();
    if (fields.containsKey("$set")) ledger.putAll((Map<String, Object>) fields.get("$set"));
    if (fields.containsKey("$unset")) ((Map<?, ?>) fields.get("$unset")).keySet().forEach(ledger::remove);
  }

  @Test public void importsAllSixteenEntriesWithTheirOriginalLinksAndNeverResurrectsAfterCompletion() throws Exception {
    assertThat(migration.fixture(ContentKind.NEWS)).hasSize(7);
    assertThat(migration.fixture(ContentKind.PUBLICATIONS)).hasSize(9);
    assertThat(migration.migrate(false)).isTrue();
    assertThat(entries).hasSize(16);
    assertThat(ledger).containsEntry("state", "COMPLETED");
    ContentEntry example = entries.get("homepage_news/2026-03-jla-self-service-indicators");
    assertThat(example.getDraft()).isEqualTo(example.getPublished());
    assertThat(example.getDraft().get("body").toString()).contains("https://arxiv.org/pdf/2504.07811");
    entries.clear();
    assertThat(migration.migrate(false)).isFalse();
    assertThat(entries).isEmpty();
    assertThat(contentWrites).isEqualTo(16);
  }

  @Test public void interruptedMigrationCanRetryWithoutDuplicatingOrOverwritingEntries() throws Exception {
    failOnWrite = 3;
    assertThatThrownBy(() -> migration.migrate(false)).isInstanceOf(IllegalStateException.class);
    assertThat(entries).hasSize(2); assertThat(ledger).doesNotContainKey("owner");
    assertThat(migration.migrate(false)).isTrue();
    assertThat(entries).hasSize(16);
  }

  @Test public void conflictingContentFailsVerificationAndIsNeverOverwritten() {
    corruptExisting = true;
    assertThatThrownBy(() -> migration.migrate(false)).isInstanceOf(IllegalStateException.class).hasMessageContaining("collision");
    assertThat(entries.values().iterator().next().getDraft()).containsEntry("title", "Existing content must survive");
    assertThat(ledger).containsEntry("state", "FAILED").doesNotContainKey("completedAt");
  }

  @Test public void anotherOwnerPreventsConcurrentImports() {
    ledger.put("owner", "another-process");
    assertThatThrownBy(() -> migration.migrate(false)).isInstanceOf(ConflictException.class);
    assertThat(entries).isEmpty();
  }
}
