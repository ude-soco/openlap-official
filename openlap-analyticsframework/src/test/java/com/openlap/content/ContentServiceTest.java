package com.openlap.content;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.openlap.infrastructure.exception.ConflictException;
import java.time.Instant;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;
import org.bson.Document;
import org.junit.Before;
import org.junit.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.Page;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

public class ContentServiceTest {
  private final MongoTemplate mongo = mock(MongoTemplate.class);
  private final ContentService service = new ContentService(mongo, new ContentValidator());
  private ContentEntry entry;

  @Before public void setup() {
    entry = new ContentEntry(); entry.setId("entry"); entry.setVersion(1); entry.setStatus("DRAFT");
    entry.setDraft(ContentValidatorTest.news()); entry.setCreatedAt(Instant.now());
    when(mongo.findById("entry", ContentEntry.class, "homepage_news")).thenAnswer(call -> entry);
    when(mongo.findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class), eq(ContentEntry.class), eq("homepage_news")))
        .thenAnswer(call -> {
          Query query = call.getArgument(0);
          if (((Number) query.getQueryObject().get("version")).longValue() != entry.getVersion()) return null;
          Update update = call.getArgument(1);
          Document sets = (Document) update.getUpdateObject().get("$set");
          if (sets.containsKey("draft")) entry.setDraft((Map<String, Object>) sets.get("draft"));
          if (sets.containsKey("published")) entry.setPublished((Map<String, Object>) sets.get("published"));
          if (sets.containsKey("status")) entry.setStatus(sets.getString("status"));
          if (sets.containsKey("deletedAt")) entry.setDeletedAt((Instant) sets.get("deletedAt"));
          entry.setVersion(entry.getVersion() + 1);
          return entry;
        });
  }

  @Test public void savingPublishedDraftDoesNotChangeThePublicSnapshot() {
    service.transition(ContentKind.NEWS, "entry", 1L, "publish");
    Map<String, Object> edited = new LinkedHashMap<>(entry.getDraft()); edited.put("title", "Changed title");
    service.save(ContentKind.NEWS, "entry", edited, 2L);
    assertThat(entry.getPublished()).containsEntry("title", "News");
    assertThat(entry.getDraft()).containsEntry("title", "Changed title");
    assertThat(entry.isHasUnpublishedChanges()).isTrue();
    service.transition(ContentKind.NEWS, "entry", 3L, "publish");
    assertThat(entry.getPublished()).containsEntry("title", "Changed title");
    assertThat(entry.isHasUnpublishedChanges()).isFalse();
  }

  @Test public void trashAndRestoreNeverRepublishAnEntry() {
    service.transition(ContentKind.NEWS, "entry", 1L, "publish");
    service.transition(ContentKind.NEWS, "entry", 2L, "trash");
    assertThat(entry.getStatus()).isEqualTo("TRASH"); assertThat(entry.getDeletedAt()).isNotNull();
    service.transition(ContentKind.NEWS, "entry", 3L, "restore");
    assertThat(entry.getStatus()).isEqualTo("DRAFT"); assertThat(entry.getPublished()).isNull();
    assertThat(entry.getDraft()).containsEntry("title", "News"); assertThat(entry.getDeletedAt()).isNull();
  }

  @Test public void staleEditsAndConcurrentChangesReturnConflict() {
    assertThatThrownBy(() -> service.save(ContentKind.NEWS, "entry", entry.getDraft(), 9L)).isInstanceOf(ConflictException.class);
    when(mongo.findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class), eq(ContentEntry.class), eq("homepage_news"))).thenReturn(null);
    assertThatThrownBy(() -> service.save(ContentKind.NEWS, "entry", entry.getDraft(), 1L)).isInstanceOf(ConflictException.class);
    ArgumentCaptor<Query> query = ArgumentCaptor.forClass(Query.class);
    verify(mongo).findAndModify(query.capture(), any(Update.class), any(FindAndModifyOptions.class), eq(ContentEntry.class), eq("homepage_news"));
    assertThat(query.getValue().getQueryObject()).containsEntry("_id", "entry").containsEntry("version", 1L);
  }

  @Test public void publicResponseContainsOnlyPublishedFieldsAndUsesSafeFilter() {
    entry.setPublished(ContentValidatorTest.news()); entry.setStatus("PUBLISHED");
    when(mongo.count(any(Query.class), eq("homepage_news"))).thenReturn(1L);
    when(mongo.find(any(Query.class), eq(ContentEntry.class), eq("homepage_news"))).thenReturn(Arrays.asList(entry));
    Page<Map<String, Object>> result = service.published(ContentKind.NEWS, 0, 6);
    assertThat(result.getContent().get(0)).containsEntry("id", "entry").doesNotContainKeys("draft", "version", "status");
    ArgumentCaptor<Query> query = ArgumentCaptor.forClass(Query.class);
    verify(mongo).find(query.capture(), eq(ContentEntry.class), eq("homepage_news"));
    assertThat(query.getValue().getQueryObject()).containsEntry("status", "PUBLISHED").containsEntry("deletedAt", null);
    assertThat(query.getValue().getSortObject()).containsEntry("published.date", -1).containsEntry("sortOrder", 1);
  }

  @Test public void unpublishKeepsDraftAndClearsPublicSnapshot() {
    service.transition(ContentKind.NEWS, "entry", 1L, "publish");
    service.transition(ContentKind.NEWS, "entry", 2L, "unpublish");
    assertThat(entry.getStatus()).isEqualTo("DRAFT"); assertThat(entry.getPublished()).isNull();
    assertThat(entry.getDraft()).containsEntry("title", "News");
  }
}
