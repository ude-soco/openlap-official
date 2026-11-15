package com.openlap.analytics_module.drafts;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mongodb.*;
import com.mongodb.client.*;
import com.mongodb.client.result.UpdateResult;
import com.openlap.analytics_module.entities.Indicator;
import com.openlap.analytics_module.services.ComplexIndicatorReferences;
import com.openlap.infrastructure.exception.*;
import java.util.*;
import java.util.concurrent.atomic.*;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.junit.Before;
import org.junit.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.convert.MongoConverter;
import org.springframework.data.mongodb.core.mapping.event.*;

public class MongoIndicatorDraftTargetsTest {
  private final MongoTemplate mongo = mock(MongoTemplate.class);
  private final MongoConverter converter = mock(MongoConverter.class);
  private final ComplexIndicatorReferences sources = mock(ComplexIndicatorReferences.class);

  @SuppressWarnings("unchecked")
  private final MongoCollection<Document> indicators = mock(MongoCollection.class);

  @SuppressWarnings("unchecked")
  private final MongoCollection<Document> catalog = mock(MongoCollection.class);

  private final ObjectMapper mapper = new ObjectMapper();
  private final IndicatorDraftConfiguration configurations =
      new IndicatorDraftConfiguration(mapper);
  private final String owner = "0123456789abcdef01234567";
  private final String target = "abcdef0123456789abcdef01";
  private final AtomicReference<Document> saved = new AtomicReference<>();
  private final AtomicInteger inserts = new AtomicInteger();
  private MongoIndicatorDraftTargets targets;

  @Before
  public void setup() {
    when(mongo.getConverter()).thenReturn(converter);
    when(mongo.getCollection(anyString()))
        .thenAnswer(
            call -> "analytics-indicator".equals(call.getArgument(0)) ? indicators : catalog);
    @SuppressWarnings("unchecked")
    FindIterable<Document> rows = mock(FindIterable.class);
    @SuppressWarnings("unchecked")
    MongoCursor<Document> cursor = mock(MongoCursor.class);
    when(catalog.find()).thenReturn(rows);
    when(rows.projection(any())).thenReturn(rows);
    when(rows.iterator()).thenReturn(cursor);
    when(indicators.find(any(Document.class)))
        .thenAnswer(
            call -> {
              @SuppressWarnings("unchecked")
              FindIterable<Document> found = mock(FindIterable.class);
              when(found.first())
                  .thenAnswer(ignored -> saved.get() == null ? null : new Document(saved.get()));
              return found;
            });
    doAnswer(
            call -> {
              Document out = call.getArgument(1);
              Indicator indicator = call.getArgument(0);
              out.putAll(
                  new Document("_id", new ObjectId(indicator.getId()))
                      .append("name", "Updated")
                      .append("createdBy", new DBRef("openlap-users", new ObjectId(owner)))
                      .append("indicatorType", "BASIC")
                      .append("createdOn", new Date(2000))
                      .append("configurationRequest", "{\"new\":true}"));
              return null;
            })
        .when(converter)
        .write(any(Indicator.class), any(Document.class));
    doAnswer(
            call -> {
              inserts.incrementAndGet();
              saved.set(new Document(call.getArgument(0, Document.class)));
              return null;
            })
        .when(indicators)
        .insertOne(any(Document.class));
    when(indicators.updateOne(any(Document.class), any(Document.class)))
        .thenAnswer(
            call -> {
              Document filter = call.getArgument(0),
                  update = call.getArgument(1),
                  current = saved.get();
              boolean matches =
                  current != null
                      && filter.entrySet().stream()
                          .allMatch(
                              entry -> {
                                Object expected = entry.getValue();
                                return expected instanceof Document doc
                                        && doc.containsKey("$exists")
                                    ? !current.containsKey(entry.getKey())
                                    : Objects.equals(expected, current.get(entry.getKey()));
                              });
              if (matches) {
                current.putAll(update.get("$set", Document.class));
                if (update.containsKey("$unset"))
                  update.get("$unset", Document.class).keySet().forEach(current::remove);
              }
              return UpdateResult.acknowledged(matches ? 1L : 0L, matches ? 1L : 0L, null);
            });
    targets = new MongoIndicatorDraftTargets(mongo, sources, mapper, configurations);
  }

  private Document draft() {
    return new Document("_id", "draft").append("targetIndicatorId", target);
  }

  private Indicator indicator() {
    return new Indicator();
  }

  private Document original() {
    return new Document("_id", new ObjectId(target))
        .append("name", "Original")
        .append("createdBy", new DBRef("openlap-users", new ObjectId(owner)))
        .append("indicatorType", "BASIC")
        .append("createdOn", new Date(1000))
        .append("configurationRequest", "{\"old\":true}")
        .append("timesExecuted", 17);
  }

  @Test
  public void newTargetIsInsertedOnceAndMatchingRetriesRecoverItsReceipt() {
    targets.publish(owner, draft(), indicator(), "hash");
    targets.publish(owner, draft(), indicator(), "hash");
    assertThat(inserts).hasValue(1);
    assertThat(saved.get().getString("_draftCompletionId")).isEqualTo("draft");
    assertThat(saved.get().getString("_draftCompletionHash")).isEqualTo("hash");
    verify(sources, times(1)).onBeforeSave(any());
    verify(sources, times(2)).onAfterSave(any());
  }

  @Test
  public void lostInsertAcknowledgementNeverCreatesASecondTargetAndRecoveryDoesNotRunPluginCode() {
    doAnswer(
            call -> {
              inserts.incrementAndGet();
              saved.set(new Document(call.getArgument(0, Document.class)));
              throw new MongoException("unknown write outcome");
            })
        .when(indicators)
        .insertOne(any(Document.class));
    assertThatThrownBy(() -> targets.publish(owner, draft(), indicator(), "hash"))
        .isInstanceOf(MongoException.class);
    verify(sources, never()).onAfterSave(any());
    assertThat(targets.recover(owner, draft(), "hash")).isTrue();
    assertThat(inserts).hasValue(1);
    verify(sources).onAfterSave(any());
  }

  @Test
  public void conditionalEditPreservesCountersAndMatchesTheOriginalDefinition() {
    saved.set(original());
    Document snapshot = targets.snapshot(owner, target);
    assertThat(snapshot).doesNotContainKey("timesExecuted");
    Document draft = draft().append("sourceSnapshot", snapshot);
    targets.publish(owner, draft, indicator(), "hash");
    assertThat(saved.get()).containsEntry("timesExecuted", 17).containsEntry("name", "Updated");
    assertThat(inserts).hasValue(0);
    ArgumentCaptor<Document> filters = ArgumentCaptor.forClass(Document.class);
    verify(indicators).updateOne(filters.capture(), any(Document.class));
    assertThat(filters.getValue())
        .containsEntry("name", "Original")
        .containsEntry("configurationRequest", "{\"old\":true}")
        .containsEntry("indicatorQuery", new Document("$exists", false));
    assertThat(targets.recover(owner, draft, "hash")).isTrue();
  }

  @Test
  public void changedSourceIsNeverOverwrittenByAnOlderEditDraft() {
    saved.set(original());
    Document snapshot = targets.snapshot(owner, target);
    saved.get().put("name", "Changed elsewhere");
    assertThatThrownBy(
            () ->
                targets.publish(
                    owner, draft().append("sourceSnapshot", snapshot), indicator(), "hash"))
        .isInstanceOf(ConflictException.class)
        .hasMessageContaining("changed");
    assertThat(saved.get())
        .containsEntry("name", "Changed elsewhere")
        .doesNotContainKey("_draftCompletionId");
    verify(sources).onAfterSave(any());
  }

  @Test
  public void ownershipAndDefinitionFingerprintExcludeExecutionCounters() {
    saved.set(original());
    assertThatThrownBy(() -> targets.snapshot("other", target))
        .isInstanceOf(NotFoundException.class);
    String before = targets.fingerprint(targets.snapshot(owner, target));
    saved.get().put("timesExecuted", 99);
    assertThat(targets.fingerprint(targets.snapshot(owner, target))).isEqualTo(before);
    saved.get().put("name", "Changed");
    assertThat(targets.fingerprint(targets.snapshot(owner, target))).isNotEqualTo(before);
  }

  @Test
  public void aDifferentCompletionHashCannotOverwriteAnExistingReservedTarget() {
    targets.publish(owner, draft(), indicator(), "first");
    assertThatThrownBy(() -> targets.publish(owner, draft(), indicator(), "different"))
        .isInstanceOf(ConflictException.class);
    assertThat(inserts).hasValue(1);
    assertThat(saved.get()).containsEntry("_draftCompletionHash", "first");
  }
}
