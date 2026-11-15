package com.openlap.analytics_module.drafts;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.*;
import com.openlap.analytics_module.entities.Indicator;
import com.openlap.analytics_module.entities.utility_entities.IndicatorType;
import com.openlap.analytics_module.services.impl.IndicatorDraftDefinitionService;
import com.openlap.infrastructure.exception.*;
import com.openlap.plugins.management.PluginReferences;
import com.openlap.user.entities.User;
import com.openlap.user.services.TokenService;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import org.bson.Document;
import org.junit.Before;
import org.junit.Test;
import org.springframework.data.domain.*;
import org.springframework.mock.web.MockHttpServletRequest;

public class IndicatorDraftLifecycleTest {
  private final ObjectMapper mapper = new ObjectMapper();
  private final IndicatorDraftConfiguration configs = new IndicatorDraftConfiguration(mapper);
  private final TokenService tokens = mock(TokenService.class);
  private final IndicatorDraftDefinitionService definitions =
      mock(IndicatorDraftDefinitionService.class);
  private final IndicatorDraftTargets targets = mock(IndicatorDraftTargets.class);
  private final MemoryStore store = new MemoryStore();
  private final MockHttpServletRequest request = new MockHttpServletRequest();
  private final IndicatorDraftService service =
      new IndicatorDraftService(store, targets, definitions, configs, mapper, tokens);
  private String owner = "owner";

  @Before
  public void setup() {
    when(tokens.getUserFromToken(any()))
        .thenAnswer(
            call -> {
              User user = new User();
              user.setId(owner);
              return user;
            });
    when(definitions.prepare(any(), any(), any())).thenAnswer(call -> new Indicator());
  }

  private JsonNode config(String name) {
    return mapper.valueToTree(
        Map.of(
            "schemaVersion",
            1,
            "type",
            "BASIC",
            "indicator",
            Map.of("indicatorName", name, "type", "BASIC"),
            "analysis",
            Map.of(
                "selectedAnalyticsMethod",
                Map.of("method", Map.of("id", "plugin", "name", "Count")))));
  }

  private IndicatorDraftResponse create(String requestId, String name) {
    return service.create(
        request,
        new IndicatorDraftRequests.Create(requestId, IndicatorType.BASIC, name, config(name), 1));
  }

  private IndicatorDraftResponse create() {
    return create(UUID.randomUUID().toString(), "Draft");
  }

  private IndicatorDraftRequests.Update change(long revision, String name, String requestId) {
    return new IndicatorDraftRequests.Update(revision, name, config(name), 1, requestId);
  }

  private JsonNode completeBody() {
    return mapper.valueToTree(
        Map.of(
            "indicatorType",
            "BASIC",
            "name",
            "Saved",
            "configuration",
            config("Saved").toString()));
  }

  @Test
  public void createHasAStableIdentityAcrossRetriesAndDoesNotReplaceInterveningEdits() {
    String key = UUID.randomUUID().toString();
    IndicatorDraftResponse first = create(key, "First");
    var updated =
        service.update(request, first.id(), change(0, "Newer", UUID.randomUUID().toString()));
    var retried = create(key, "First");
    assertThat(retried.id()).isEqualTo(first.id());
    assertThat(retried.configuration()).isEqualTo(updated.configuration());
    assertThat(retried.revision()).isEqualTo(1);
    assertThat(store.rows).hasSize(1);
    verifyNoInteractions(definitions, targets);
  }

  @Test
  public void listingReturnsOnlyMetadataAndDetailsRetainTheFullPrivateConfiguration() {
    var draft = create();
    var page = service.list(request, 0, 10, "", null, "updatedAt", "desc");
    assertThat(page.getTotalElements()).isEqualTo(1);
    var summary = page.getContent().get(0);
    assertThat(summary.id()).isEqualTo(draft.id());
    assertThat(summary.name()).isEqualTo(draft.name());
    assertThat(summary.indicatorType()).isEqualTo(IndicatorType.BASIC);
    assertThat(summary.revision()).isZero();
    assertThat(summary.configuration()).isNull();
    assertThat(service.get(request, draft.id()).configuration()).isEqualTo(draft.configuration());
  }

  @Test
  public void staleUpdatesAndDiscardNeverOverwriteNewerWork() {
    var draft = create();
    service.update(request, draft.id(), change(0, "Newer", null));
    assertThatThrownBy(() -> service.update(request, draft.id(), change(0, "Old", null)))
        .isInstanceOf(ConflictException.class);
    assertThatThrownBy(() -> service.discard(request, draft.id(), 0))
        .isInstanceOf(ConflictException.class);
    assertThat(service.get(request, draft.id()).name()).isEqualTo("Newer");
  }

  @Test
  public void mutationRetryReturnsAcknowledgedRevisionAndRejectsReusingItsKey() {
    var draft = create();
    String key = UUID.randomUUID().toString();
    service.update(request, draft.id(), change(0, "Updated", key));
    assertThat(service.update(request, draft.id(), change(0, "Updated", key)).revision())
        .isEqualTo(1);
    assertThatThrownBy(() -> service.update(request, draft.id(), change(1, "Different", key)))
        .isInstanceOf(ConflictException.class);
  }

  @Test
  public void discardReleasesPluginReferencesAndLateAutosavesCannotResurrectIt() {
    var draft = create();
    var references = new PluginReferences();
    assertThat(references.collect(store.rows.get(draft.id()), Set.of("plugin")))
        .containsExactly("plugin");
    service.discard(request, draft.id(), 0);
    assertThat(references.collect(store.rows.get(draft.id()), Set.of("plugin"))).isEmpty();
    assertThat(service.discard(request, draft.id(), 0).status()).isEqualTo("DISCARDED");
    assertThatThrownBy(() -> service.update(request, draft.id(), change(0, "Late", null)))
        .isInstanceOf(ConflictException.class);
    assertThat(service.list(request, 0, 10, "", null, "updatedAt", "desc").getTotalElements())
        .isZero();
  }

  @Test
  public void otherOwnersCannotReadUpdateDiscardOrCompleteDrafts() {
    var draft = create();
    owner = "another";
    assertThatThrownBy(() -> service.get(request, draft.id()))
        .isInstanceOf(NotFoundException.class);
    assertThatThrownBy(() -> service.update(request, draft.id(), change(0, "Stolen", null)))
        .isInstanceOf(NotFoundException.class);
    assertThatThrownBy(() -> service.discard(request, draft.id(), 0))
        .isInstanceOf(NotFoundException.class);
    assertThatThrownBy(
            () ->
                service.complete(
                    request, draft.id(), new IndicatorDraftRequests.Complete(0L, completeBody())))
        .isInstanceOf(NotFoundException.class);
    assertThatThrownBy(() -> service.resume(request, draft.id()))
        .isInstanceOf(NotFoundException.class);
    verifyNoInteractions(definitions, targets);
  }

  @Test
  public void completionPublishesOnceAndKeepsOnlyANonExecutableReceipt() {
    var draft = create();
    var body = new IndicatorDraftRequests.Complete(0L, completeBody());
    var saved = service.complete(request, draft.id(), body);
    var retry = service.complete(request, draft.id(), body);
    assertThat(saved.status()).isEqualTo("COMPLETED");
    assertThat(retry.savedIndicatorId()).isEqualTo(saved.savedIndicatorId());
    assertThat(saved.savedIndicatorId()).isNotBlank();
    assertThat(saved.configuration()).isNull();
    assertThat(new PluginReferences().collect(store.rows.get(draft.id()), Set.of("plugin")))
        .isEmpty();
    verify(targets, times(1)).publish(eq(owner), any(), any(), anyString());
    assertThatThrownBy(
            () -> service.update(request, draft.id(), change(saved.revision(), "Late", null)))
        .isInstanceOf(ConflictException.class);
  }

  @Test
  public void aLostPublicationAcknowledgementRetriesTheSameReservedTarget() {
    var draft = create();
    var ids = new ArrayList<String>();
    AtomicInteger tries = new AtomicInteger();
    doAnswer(
            call -> {
              Document row = call.getArgument(1);
              ids.add(row.getString("targetIndicatorId"));
              if (tries.getAndIncrement() == 0)
                throw new IllegalStateException("lost driver acknowledgement");
              return null;
            })
        .when(targets)
        .publish(anyString(), any(), any(), anyString());
    var body = new IndicatorDraftRequests.Complete(0L, completeBody());
    assertThatThrownBy(() -> service.complete(request, draft.id(), body))
        .isInstanceOf(IllegalStateException.class);
    assertThat(service.get(request, draft.id()).completionPending()).isTrue();
    assertThatThrownBy(() -> service.update(request, draft.id(), change(1, "Late", null)))
        .isInstanceOf(ConflictException.class);
    assertThatThrownBy(() -> service.discard(request, draft.id(), 1))
        .isInstanceOf(ConflictException.class);
    var saved = service.complete(request, draft.id(), body);
    assertThat(ids).hasSize(2).allMatch(id -> id.equals(saved.savedIndicatorId()));
  }

  @Test
  public void retryAfterTheTargetWasWrittenButReceiptAckWasLostKeepsItsIdentity() {
    var draft = create();
    store.failReceiptOnce = true;
    var body = new IndicatorDraftRequests.Complete(0L, completeBody());
    assertThatThrownBy(() -> service.complete(request, draft.id(), body))
        .isInstanceOf(IllegalStateException.class);
    String target = store.rows.get(draft.id()).getString("targetIndicatorId");
    assertThat(service.complete(request, draft.id(), body).savedIndicatorId()).isEqualTo(target);
  }

  @Test
  public void committedTargetRecoveryPrecedesAnyLaterPluginValidationFailure() {
    var draft = create();
    var body = new IndicatorDraftRequests.Complete(0L, completeBody());
    doThrow(new IllegalStateException("lost acknowledgement"))
        .when(targets)
        .publish(anyString(), any(), any(), anyString());
    assertThatThrownBy(() -> service.complete(request, draft.id(), body))
        .isInstanceOf(IllegalStateException.class);
    when(targets.recover(anyString(), any(), anyString())).thenReturn(true);
    when(definitions.prepare(any(), any(), any()))
        .thenThrow(new ValidationException("Plugin was disabled after the committed save"));
    assertThat(service.complete(request, draft.id(), body).status()).isEqualTo("COMPLETED");
    verify(definitions, times(1)).prepare(any(), any(), any());
  }

  @Test
  public void aReloadedPendingDraftCanRetryItsSameCompletionUsingTheCurrentClaimRevision() {
    var draft = create();
    var original = new IndicatorDraftRequests.Complete(0L, completeBody());
    doThrow(new IllegalStateException("lost acknowledgement"))
        .when(targets)
        .publish(anyString(), any(), any(), anyString());
    assertThatThrownBy(() -> service.complete(request, draft.id(), original))
        .isInstanceOf(IllegalStateException.class);
    var reloaded = service.get(request, draft.id());
    assertThat(reloaded.completionPending()).isTrue();
    assertThat(reloaded.revision()).isEqualTo(1);
    var different = completeBody().deepCopy();
    ((com.fasterxml.jackson.databind.node.ObjectNode) different).put("name", "Changed");
    assertThatThrownBy(
            () ->
                service.complete(
                    request,
                    draft.id(),
                    new IndicatorDraftRequests.Complete(reloaded.revision(), different)))
        .isInstanceOf(ConflictException.class);
    assertThatThrownBy(
            () ->
                service.complete(
                    request, draft.id(), new IndicatorDraftRequests.Complete(2L, completeBody())))
        .isInstanceOf(ConflictException.class);
    when(targets.recover(anyString(), any(), anyString())).thenReturn(true);
    var afterReload = new IndicatorDraftRequests.Complete(reloaded.revision(), completeBody());
    var saved = service.complete(request, draft.id(), afterReload);
    assertThat(saved.status()).isEqualTo("COMPLETED");
    assertThat(service.complete(request, draft.id(), afterReload).savedIndicatorId())
        .isEqualTo(saved.savedIndicatorId());
    assertThat(service.complete(request, draft.id(), original).savedIndicatorId())
        .isEqualTo(saved.savedIndicatorId());
    assertThatThrownBy(
            () ->
                service.complete(
                    request, draft.id(), new IndicatorDraftRequests.Complete(2L, completeBody())))
        .isInstanceOf(ConflictException.class);
    verify(definitions, times(1)).prepare(any(), any(), any());
  }

  @Test
  public void resumeReplaysTheDurableExactPayloadAfterReloadAndRecoversBeforePluginValidation() {
    var draft = create();
    JsonNode originalPayload = completeBody();
    doThrow(new IllegalStateException("lost acknowledgement"))
        .when(targets)
        .publish(anyString(), any(), any(), anyString());
    assertThatThrownBy(
            () ->
                service.complete(
                    request, draft.id(), new IndicatorDraftRequests.Complete(0L, originalPayload)))
        .isInstanceOf(IllegalStateException.class);
    assertThat(store.rows.get(draft.id()).getString("completionPayload"))
        .isEqualTo(originalPayload.toString());
    var reloaded = service.get(request, draft.id());
    assertThat(reloaded.completionPending()).isTrue();
    assertThat(reloaded.configuration()).isEqualTo(draft.configuration());
    when(targets.recover(anyString(), any(), anyString())).thenReturn(true);
    when(definitions.prepare(any(), any(), any()))
        .thenThrow(new ValidationException("Plugin disabled after the saved target committed"));
    var saved = service.resume(request, draft.id());
    assertThat(saved.status()).isEqualTo("COMPLETED");
    assertThat(saved.configuration()).isNull();
    assertThat(service.resume(request, draft.id()).savedIndicatorId())
        .isEqualTo(saved.savedIndicatorId());
    assertThat(store.rows.get(draft.id()))
        .doesNotContainKeys("configuration", "completionPayload", "sourceSnapshot");
    assertThat(new PluginReferences().collect(store.rows.get(draft.id()), Set.of("plugin")))
        .isEmpty();
    verify(definitions, times(1)).prepare(any(), any(), any());
  }

  @Test
  public void resumeUsesTheOriginalDefinitionWhenTheTargetHadNotCommitted() {
    var draft = create();
    JsonNode originalPayload = completeBody();
    doThrow(new IllegalStateException("lost acknowledgement"))
        .when(targets)
        .publish(anyString(), any(), any(), anyString());
    assertThatThrownBy(
            () ->
                service.complete(
                    request, draft.id(), new IndicatorDraftRequests.Complete(0L, originalPayload)))
        .isInstanceOf(IllegalStateException.class);
    reset(definitions);
    when(definitions.prepare(any(), any(), eq(originalPayload))).thenReturn(new Indicator());
    doNothing().when(targets).publish(anyString(), any(), any(), anyString());
    assertThat(service.resume(request, draft.id()).status()).isEqualTo("COMPLETED");
    verify(definitions).prepare(any(), eq(IndicatorType.BASIC), eq(originalPayload));
  }

  @Test
  public void resumeCannotStartANewSaveOrReviveADiscardedDraft() {
    var draft = create();
    assertThatThrownBy(() -> service.resume(request, draft.id()))
        .isInstanceOf(ConflictException.class);
    service.discard(request, draft.id(), 0);
    assertThatThrownBy(() -> service.resume(request, draft.id()))
        .isInstanceOf(ConflictException.class);
    verifyNoInteractions(definitions, targets);
  }

  @Test
  public void aReceiptWithAnUnexpectedCompletionPayloadStillPinsItsReferences() {
    Document receipt =
        new Document("_indicatorDraftReceipt", true)
            .append("status", "COMPLETED")
            .append("completionPayload", new Document("methodId", "plugin"));
    assertThat(new PluginReferences().collect(receipt, Set.of("plugin"))).containsExactly("plugin");
  }

  @Test
  public void publicationConflictsNeverAllocateAnotherTargetIdentity() {
    var draft = create();
    List<String> identities = new ArrayList<>();
    doAnswer(
            call -> {
              identities.add(call.getArgument(1, Document.class).getString("targetIndicatorId"));
              throw new ConflictException("Source changed");
            })
        .when(targets)
        .publish(anyString(), any(), any(), anyString());
    assertThatThrownBy(
            () ->
                service.complete(
                    request, draft.id(), new IndicatorDraftRequests.Complete(0L, completeBody())))
        .isInstanceOf(ConflictException.class);
    var retry = service.get(request, draft.id());
    assertThatThrownBy(
            () ->
                service.complete(
                    request,
                    draft.id(),
                    new IndicatorDraftRequests.Complete(retry.revision(), completeBody())))
        .isInstanceOf(ConflictException.class);
    assertThat(identities).hasSize(2);
    assertThat(identities.get(1)).isEqualTo(identities.get(0));
  }

  @Test
  public void terminalDisplayMetadataCannotAccidentallyPinAMatchingPluginId() {
    var draft = create(UUID.randomUUID().toString(), "plugin");
    service.discard(request, draft.id(), 0);
    assertThat(new PluginReferences().collect(store.rows.get(draft.id()), Set.of("plugin")))
        .isEmpty();
  }

  @Test
  public void completeValidationFailureLeavesThePartialDraftEditable() {
    var draft = create();
    when(definitions.prepare(any(), any(), any()))
        .thenThrow(new ValidationException("Required mapping missing"));
    assertThatThrownBy(
            () ->
                service.complete(
                    request, draft.id(), new IndicatorDraftRequests.Complete(0L, completeBody())))
        .isInstanceOf(ValidationException.class);
    assertThat(service.get(request, draft.id()).revision()).isZero();
    assertThat(service.update(request, draft.id(), change(0, "Fixing it", null)).revision())
        .isEqualTo(1);
    verifyNoInteractions(targets);
  }

  @Test
  public void conflictingSourcePreservesDraftAndDoesNotLeaveItStuckFinalizing() {
    var draft = create();
    doThrow(new ConflictException("SOURCE_INDICATOR_CHANGED", "Source changed"))
        .when(targets)
        .publish(anyString(), any(), any(), anyString());
    assertThatThrownBy(
            () ->
                service.complete(
                    request, draft.id(), new IndicatorDraftRequests.Complete(0L, completeBody())))
        .isInstanceOf(ConflictException.class);
    var preserved = service.get(request, draft.id());
    assertThat(preserved.completionPending()).isFalse();
    assertThat(preserved.configuration()).isEqualTo(draft.configuration());
    assertThat(store.rows.get(draft.id())).doesNotContainKey("completionPayload");
    assertThat(
            service.update(request, draft.id(), change(preserved.revision(), "Fix", null)).name())
        .isEqualTo("Fix");
  }

  @Test
  public void simultaneousEditRequestsReuseOneActiveDraftAndCaptureSourceRevision()
      throws Exception {
    when(targets.snapshot(owner, "source"))
        .thenReturn(
            new Document("_id", "source")
                .append("name", "Original")
                .append("indicatorType", "BASIC")
                .append("configurationRequest", config("Original").toString()));
    when(targets.fingerprint(any())).thenReturn("fingerprint");
    var pool = Executors.newFixedThreadPool(2);
    try {
      var a = pool.submit(() -> service.edit(request, "source"));
      var b = pool.submit(() -> service.edit(request, "source"));
      var first = a.get(5, TimeUnit.SECONDS);
      var second = b.get(5, TimeUnit.SECONDS);
      assertThat(first.id()).isEqualTo(second.id());
      assertThat(first.sourceRevision()).isEqualTo("fingerprint");
      assertThat(first.sourceIndicatorId()).isEqualTo("source");
      assertThat(store.rows).hasSize(1);
      service.discard(request, first.id(), 0);
      assertThat(service.edit(request, "source").id()).isNotEqualTo(first.id());
    } finally {
      pool.shutdownNow();
    }
  }

  @Test
  public void legacyRowsAreSafelyProjectedAndUnrecoverableRowsCanBeDiscarded() {
    store.rows.put(
        "legacy",
        new Document("_id", "legacy")
            .append("ownerIdForTest", owner)
            .append("indicatorType", "BASIC")
            .append(
                "session",
                config("Older")
                    .toString()
                    .replace("\"analysis\"", "\"oldCatalog\":[],\"analysis\"")));
    var recovered = service.get(request, "legacy");
    assertThat(recovered.recoverable()).isTrue();
    assertThat(recovered.configuration().has("oldCatalog")).isFalse();
    assertThat(store.rows.get("legacy")).doesNotContainKey("session");
    store.rows.put(
        "broken",
        new Document("_id", "broken")
            .append("ownerIdForTest", owner)
            .append("indicatorType", "BASIC")
            .append("session", "{broken"));
    assertThat(service.get(request, "broken").recoverable()).isFalse();
    service.discard(request, "broken", 0);
    assertThat(store.rows.get("broken")).doesNotContainKeys("session", "legacyRecovery");
  }

  @Test
  public void longLegacyTitlesRemainReadableAndDiscardableWithoutTruncatingTheirConfiguration() {
    String title = "a".repeat(299) + "😀" + "older title";
    store.rows.put(
        "long-legacy",
        new Document("_id", "long-legacy")
            .append("ownerIdForTest", owner)
            .append("indicatorType", "BASIC")
            .append("session", config(title).toString()));
    var list = service.list(request, 0, 10, "", null, "updatedAt", "desc");
    assertThat(list.getContent()).hasSize(1);
    assertThat(list.getContent().get(0).name()).isEqualTo("a".repeat(299));
    var detail = service.get(request, "long-legacy");
    assertThat(detail.configuration().path("indicator").path("indicatorName").asText())
        .isEqualTo(title);
    assertThat(service.discard(request, detail.id(), detail.revision()).status())
        .isEqualTo("DISCARDED");
  }

  @Test
  public void invalidRequestIdsSortColumnsAndOversizedSearchesFailBeforePersistence() {
    assertThatThrownBy(() -> create("not-a-uuid", "Draft")).isInstanceOf(ValidationException.class);
    assertThatThrownBy(() -> service.list(request, 0, 10, "", null, "createdBy.$id", "asc"))
        .isInstanceOf(ValidationException.class);
    assertThatThrownBy(() -> service.list(request, 0, 10, "x".repeat(301), null, "name", "asc"))
        .isInstanceOf(ValidationException.class);
    assertThat(store.rows).isEmpty();
  }

  static class MemoryStore implements IndicatorDraftStore {
    final Map<String, Document> rows = new ConcurrentHashMap<>();
    boolean failReceiptOnce;

    private boolean owned(Document doc, String owner) {
      return owner.equals(doc.getString("ownerId"))
          || owner.equals(doc.getString("ownerIdForTest"));
    }

    @Override
    public synchronized Document find(String owner, String id) {
      Document doc = rows.get(id);
      return doc != null && owned(doc, owner) ? new Document(doc) : null;
    }

    @Override
    public synchronized Document findActiveEdit(String owner, String id) {
      return rows.values().stream()
          .filter(doc -> (owner + ":" + id).equals(doc.getString("activeSourceKey")))
          .findFirst()
          .map(Document::new)
          .orElse(null);
    }

    @Override
    public synchronized boolean insert(Document doc) {
      if (rows.containsKey(doc.get("_id").toString())
          || doc.containsKey("activeSourceKey")
              && rows.values().stream()
                  .anyMatch(row -> doc.get("activeSourceKey").equals(row.get("activeSourceKey"))))
        return false;
      rows.put(doc.get("_id").toString(), new Document(doc));
      return true;
    }

    @Override
    public synchronized boolean replace(String owner, Document previous, Document next) {
      Document current = rows.get(previous.get("_id").toString());
      if (current == null
          || !owned(current, owner)
          || !Objects.equals(current.get("revision"), previous.get("revision"))
          || !Objects.equals(current.get("status"), previous.get("status"))) return false;
      if (failReceiptOnce && "COMPLETED".equals(next.getString("status"))) {
        failReceiptOnce = false;
        throw new IllegalStateException("lost receipt write");
      }
      rows.put(previous.get("_id").toString(), new Document(next));
      return true;
    }

    @Override
    public synchronized Page<Document> list(
        String owner, int page, int size, String search, String type, String sortBy, boolean desc) {
      var all =
          rows.values().stream()
              .filter(
                  doc ->
                      owned(doc, owner)
                          && (!doc.containsKey("status")
                              || Set.of("DRAFT", "COMPLETING").contains(doc.getString("status"))))
              .filter(doc -> search.isEmpty() || doc.getString("name").contains(search))
              .filter(doc -> type == null || type.equals(doc.getString("indicatorType")))
              .map(Document::new)
              .toList();
      return new PageImpl<>(all, PageRequest.of(page, size), all.size());
    }
  }
}
