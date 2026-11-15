package com.openlap.community;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.openlap.analytics_module.entities.Indicator;
import com.openlap.analytics_module.entities.utility_entities.*;
import com.openlap.analytics_module.repositories.IndicatorRepository;
import com.openlap.analytics_module.services.ComplexIndicatorReferences;
import com.openlap.infrastructure.exception.ConflictException;
import com.openlap.infrastructure.exception.ValidationException;
import com.openlap.user.entities.User;
import com.openlap.user.services.TokenService;
import com.openlap.visualization_methods.entities.VisType;
import java.util.*;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.mock.web.MockHttpServletRequest;

class CommunityIndicatorServiceTest {
  final CommunityCatalogService catalog = mock(CommunityCatalogService.class);
  final CommunityIndicatorExecution execution = mock(CommunityIndicatorExecution.class);
  final CommunityPreviewStore receipts = mock(CommunityPreviewStore.class);
  final IndicatorRepository indicators = mock(IndicatorRepository.class);
  final TokenService tokens = mock(TokenService.class);
  final MongoTemplate mongo = mock(MongoTemplate.class);
  final ComplexIndicatorReferences references = mock(ComplexIndicatorReferences.class);
  final CommunityIndicatorService service = new CommunityIndicatorService(catalog, execution, receipts, indicators, tokens, mongo, references);
  final MockHttpServletRequest request = new MockHttpServletRequest();
  final User viewer = new User();
  final Indicator source = new Indicator();
  final String pool = UUID.randomUUID().toString();
  final String receiptId = UUID.randomUUID().toString();

  @BeforeEach void setup() {
    viewer.setId(new ObjectId().toHexString());
    source.setId(new ObjectId().toHexString());
    when(tokens.getUserFromToken(request)).thenReturn(viewer);
    when(catalog.resolveIndicator(pool)).thenReturn(source);
    when(execution.fingerprint(source)).thenReturn("version");
    when(execution.currentBindingsHash(eq(source), eq(viewer), anyMap())).thenReturn("bindings");
  }

  @Test void previewPersistsOnlyPrivateProofAndNeverAnyIndicatorRows() {
    var graph = graph();
    when(execution.execute(eq(source), eq(viewer), anyMap(), anyMap())).thenReturn(graph);
    var result = service.preview(request, pool, Map.of());
    assertThat(result.status()).isEqualTo("READY");
    assertThat(result.previewCode()).isEqualTo("viewer chart");
    assertThat(result.visualizationTypeId()).isEqualTo("chart");
    var receipt = ArgumentCaptor.forClass(Document.class);
    verify(receipts).create(receipt.capture());
    assertThat(receipt.getValue()).containsEntry("owner", viewer.getId()).containsEntry("version", "version");
    assertThat(receipt.getValue().getDate("expiresAt")).isAfter(new Date());
    verifyNoInteractions(indicators, mongo, references);
  }

  @Test void failedPreviewNeverCreatesAReceiptOrAnyCopy() {
    when(execution.execute(eq(source), eq(viewer), anyMap(), anyMap()))
        .thenThrow(new ValidationException("NO_DATA", "No matching data is available."));
    var result = service.preview(request, pool, Map.of());
    assertThat(result.status()).isEqualTo("NO_DATA");
    assertThat(result.receiptId()).isNull();
    verifyNoInteractions(receipts, indicators, mongo, references);
  }

  @Test void unexpectedPluginFailureDoesNotExposePrivateExceptionText() {
    when(execution.execute(eq(source), eq(viewer), anyMap(), anyMap()))
        .thenThrow(new IllegalStateException("author@example.test original-store-id /private/plugin.jar"));
    var result = service.preview(request, pool, Map.of());
    assertThat(result.status()).isEqualTo("ERROR");
    assertThat(result.message()).doesNotContain("author", "store", "plugin.jar");
    verifyNoInteractions(receipts, indicators);
  }

  @Test void directCopyWithoutProofFailsBeforeResolvingOrExecutingAnySource() {
    when(receipts.require(null, viewer.getId(), pool)).thenThrow(CommunityPreviewStore.invalid());
    assertThatThrownBy(() -> service.copy(request, pool, null)).isInstanceOf(ValidationException.class);
    verifyNoInteractions(catalog, execution, indicators, mongo, references);
  }

  @Test void sourceEditsAfterPreviewInvalidateCopyBeforeAnyWrites() {
    when(receipts.require(receiptId, viewer.getId(), pool)).thenReturn(receipt());
    when(execution.fingerprint(source)).thenReturn("changed-version");
    assertThatThrownBy(() -> service.copy(request, pool, receiptId)).isInstanceOf(ConflictException.class)
        .extracting("code").isEqualTo("PREVIEW_CHANGED");
    verify(execution, never()).execute(any(), any(), anyMap(), anyMap());
    verify(indicators, never()).save(any());
  }

  @Test void currentConnectionFingerprintMustStillMatchTheSuccessfulPreview() {
    var graph = graph();
    when(receipts.require(receiptId, viewer.getId(), pool)).thenReturn(receipt());
    when(execution.execute(eq(source), eq(viewer), anyMap(), anyMap())).thenReturn(
        new CommunityIndicatorExecution.Graph(graph.root(), graph.leaves(), "version", "changed-bindings", Map.of(), Map.of(), "chart"));
    assertThatThrownBy(() -> service.copy(request, pool, receiptId)).isInstanceOf(ConflictException.class)
        .extracting("code").isEqualTo("PREVIEW_CHANGED");
    verify(receipts, never()).claim(any()); verify(indicators, never()).save(any());
  }

  @Test void copiedTargetCannotBeReusedIfItBelongsToAnotherUserOrPool() {
    when(receipts.require(receiptId, viewer.getId(), pool)).thenReturn(receipt());
    var prior = new Document("owner", viewer.getId()).append("poolId", pool).append("version", "version")
        .append("targetId", "foreign-id").append("receiptId", receiptId).append("state", "PENDING");
    when(receipts.existing(viewer.getId(), pool)).thenReturn(prior);
    var foreign = new Indicator(); foreign.setId("foreign-id"); foreign.setCreatedBy(new User());
    when(indicators.findById("foreign-id")).thenReturn(Optional.of(foreign));
    var graph = graph(); when(execution.execute(eq(source), eq(viewer), anyMap(), anyMap())).thenReturn(graph);
    when(receipts.claim(any())).thenReturn(prior);
    when(receipts.acquire(any())).thenReturn("lease");
    var existing = new Indicator(); existing.setCreatedBy(new User());
    when(indicators.findById(graph.root().getId())).thenReturn(Optional.of(existing));
    assertThatThrownBy(() -> service.copy(request, pool, receiptId)).isInstanceOf(ConflictException.class);
    verify(indicators, never()).save(any());
    verify(receipts).releaseLease(any(), eq("lease"));
  }

  @Test void repeatSaveReturnsTheExistingOwnCopyWithoutRunningAnotherPreviewOrSavingAgain() {
    when(receipts.require(receiptId, viewer.getId(), pool)).thenReturn(receipt());
    var prior = new Document("owner", viewer.getId()).append("poolId", pool).append("version", "version")
        .append("targetId", "my-copy").append("receiptId", receiptId).append("state", "SAVED");
    when(receipts.existing(viewer.getId(), pool)).thenReturn(prior);
    var owned = new Indicator(); owned.setId("my-copy"); owned.setCreatedBy(viewer);
    owned.setCommunitySourceId(pool); owned.setCommunitySourceVersion("version");
    when(indicators.findById("my-copy")).thenReturn(Optional.of(owned));
    var result = service.copy(request, pool, receiptId);
    assertThat(result.id()).isEqualTo("my-copy"); assertThat(result.alreadySaved()).isTrue();
    verifyNoInteractions(catalog, execution, mongo, references);
    verify(indicators, never()).save(any());
  }

  @Test void choiceOutcomeContainsOnlyExplicitViewerOwnedOptions() {
    when(execution.execute(eq(source), eq(viewer), anyMap(), anyMap()))
        .thenThrow(new ValidationException("CHOOSE_CONNECTION", "Choose a learner identity."));
    var choices = List.of(new CommunityIndicatorExecution.ConnectionChoice("own-store", "Your source",
        List.of(new CommunityIndicatorExecution.ConnectionOption("own-connection", "own-identity"))));
    when(execution.connectionChoices(source, viewer)).thenReturn(choices);
    assertThat(service.preview(request, pool, Map.of()).choices()).isEqualTo(choices);
    verifyNoInteractions(receipts, indicators);
  }

  @Test void aComplexParentIsExposedOnlyAfterEveryViewerOwnedLeafIsReady() {
    var graph = complexGraph();
    Map<String, Indicator> persisted = new HashMap<>();
    setupCopy(graph, persisted);
    List<String> released = new ArrayList<>();
    @SuppressWarnings("unchecked") var collection = mock(com.mongodb.client.MongoCollection.class);
    when(mongo.getCollection("analytics-indicator")).thenReturn(collection);
    when(collection.updateOne(any(org.bson.conversions.Bson.class), any(org.bson.conversions.Bson.class))).thenAnswer(invocation -> {
      Document filter = invocation.getArgument(0);
      Object id = filter.get("_id");
      String selected = id instanceof Document identities ? identities.getList("$in", Object.class).get(0).toString() : id.toString();
      if (selected.equals(graph.root().getId())) assertThat(graph.leaves()).allSatisfy(leaf ->
          assertThat(persisted.get(leaf.getId()).getCommunityCopyPending()).isNull());
      persisted.get(selected).setCommunityCopyPending(null); released.add(selected);
      return com.mongodb.client.result.UpdateResult.acknowledged(1, 1L, null);
    });
    var result = service.copy(request, pool, receiptId);
    assertThat(result.id()).isEqualTo(graph.root().getId());
    assertThat(released).containsExactly(graph.leaves().get(0).getId(), graph.leaves().get(1).getId(), graph.root().getId());
    assertThat(persisted.values()).allSatisfy(value -> {
      assertThat(value.getCreatedBy()).isSameAs(viewer);
      assertThat(value.getCommunitySourceId()).isEqualTo(pool);
      assertThat(value.getCommunityCopyPending()).isNull();
    });
    assertThat(graph.leaves()).allSatisfy(value -> assertThat(value.isCommunityDependency()).isTrue());
    assertThat(graph.root().isCommunityDependency()).isFalse();
    verify(receipts).complete(any(), eq("lease"));
  }

  @Test void interruptedComplexCopyNeverCreatesAVisibleParentAndRetryKeepsTheSameLeafIds() {
    var graph = complexGraph(); Map<String, Indicator> persisted = new HashMap<>(); setupCopy(graph, persisted);
    var calls = new java.util.concurrent.atomic.AtomicInteger();
    doAnswer(invocation -> {
      Indicator value = invocation.getArgument(0);
      if (calls.incrementAndGet() == 2) throw new IllegalStateException("temporary write failure");
      persisted.put(value.getId(), value); return value;
    }).when(indicators).save(any());
    assertThatThrownBy(() -> service.copy(request, pool, receiptId)).isInstanceOf(IllegalStateException.class);
    assertThat(persisted).hasSize(1).doesNotContainKey(graph.root().getId());
    assertThat(persisted.values()).allSatisfy(value -> assertThat(value.getCommunityCopyPending()).isEqualTo(receiptId));
    verify(receipts, never()).complete(any(), any());
    var firstLeaf = graph.leaves().get(0).getId();
    @SuppressWarnings("unchecked") var collection = mock(com.mongodb.client.MongoCollection.class);
    when(mongo.getCollection("analytics-indicator")).thenReturn(collection);
    when(collection.updateOne(any(org.bson.conversions.Bson.class), any(org.bson.conversions.Bson.class))).thenAnswer(invocation -> {
      Document filter = invocation.getArgument(0); var id = filter.get("_id", Document.class).getList("$in", Object.class).get(0).toString();
      persisted.get(id).setCommunityCopyPending(null); return com.mongodb.client.result.UpdateResult.acknowledged(1, 1L, null);
    });
    assertThat(service.copy(request, pool, receiptId).id()).isEqualTo(graph.root().getId());
    assertThat(persisted).hasSize(3).containsKey(firstLeaf);
    verify(indicators, times(1)).save(argThat(value -> value.getId().equals(firstLeaf)));
  }

  @Test void unacknowledgedVisibilityChangeCannotReturnASavedCopy() {
    var graph = graph(); Map<String, Indicator> persisted = new HashMap<>(); setupCopy(graph, persisted);
    @SuppressWarnings("unchecked") var collection = mock(com.mongodb.client.MongoCollection.class);
    when(mongo.getCollection("analytics-indicator")).thenReturn(collection);
    when(collection.updateOne(any(org.bson.conversions.Bson.class), any(org.bson.conversions.Bson.class)))
        .thenReturn(com.mongodb.client.result.UpdateResult.acknowledged(0, 0L, null));
    assertThatThrownBy(() -> service.copy(request, pool, receiptId)).isInstanceOf(ConflictException.class);
    assertThat(persisted.get(graph.root().getId()).getCommunityCopyPending()).isEqualTo(receiptId);
    verify(receipts, never()).complete(any(), any());
  }

  @Test void recoveryRetainsACompleteOwnGraphIfItsFinalReceiptAcknowledgementWasLost() {
    var graph = graph(); var root = graph.root(); root.setCommunitySourceId(pool); root.setCommunitySourceVersion("version");
    var claim = new Document("owner", viewer.getId()).append("poolId", pool).append("version", "version")
        .append("targetId", root.getId()).append("receiptId", receiptId);
    when(receipts.acquireCleanup(claim)).thenReturn("cleanup-lease");
    when(indicators.findById(root.getId())).thenReturn(Optional.of(root));
    service.cleanup(claim);
    verify(receipts).recoverComplete(claim, "cleanup-lease");
    verifyNoInteractions(mongo, references);
    verify(receipts, never()).abandon(any(), any());
  }

  @Test void expiredIncompleteGraphsAreRemovedParentFirstUnderDeletionGates() {
    var graph = complexGraph(); var claim = copyClaim(graph);
    var rows = new HashMap<String, Indicator>();
    for (var row : List.of(graph.root(), graph.leaves().get(0), graph.leaves().get(1))) {
      row.setCommunitySourceId(pool); row.setCommunitySourceVersion("version"); row.setCommunityCopyPending(receiptId);
      row.setCommunityDependency(row != graph.root()); rows.put(row.getId(), row);
    }
    when(indicators.findById(anyString())).thenAnswer(invocation -> Optional.ofNullable(rows.get(invocation.getArgument(0, String.class))));
    when(receipts.acquireCleanup(claim)).thenReturn("cleanup-lease");
    when(references.beginDelete(anyString())).thenReturn("gate");
    @SuppressWarnings("unchecked") var collection = mock(com.mongodb.client.MongoCollection.class);
    @SuppressWarnings("unchecked") var found = mock(com.mongodb.client.FindIterable.class);
    when(mongo.getCollection("analytics-indicator")).thenReturn(collection);
    when(collection.find(any(org.bson.conversions.Bson.class))).thenReturn(found);
    when(collection.deleteOne(any(org.bson.conversions.Bson.class))).thenReturn(com.mongodb.client.result.DeleteResult.acknowledged(1));
    service.cleanup(claim);
    var order = inOrder(references);
    order.verify(references).beginDelete(graph.root().getId());
    order.verify(references).cancelDelete(graph.root().getId(), "gate");
    order.verify(references).beginDelete(graph.leaves().get(0).getId());
    order.verify(references).cancelDelete(graph.leaves().get(0).getId(), "gate");
    order.verify(references).beginDelete(graph.leaves().get(1).getId());
    order.verify(references).cancelDelete(graph.leaves().get(1).getId(), "gate");
    verify(collection, times(3)).deleteOne(any(org.bson.conversions.Bson.class));
    verify(receipts).abandon(claim, "cleanup-lease");
  }

  @Test void recoveryPreservesAnUncertainWriteRatherThanBypassingItsReferencePin() {
    var graph = graph(); var root = graph.root(); root.setCommunitySourceId(pool); root.setCommunitySourceVersion("version"); root.setCommunityCopyPending(receiptId);
    var claim = copyClaim(graph);
    when(receipts.acquireCleanup(claim)).thenReturn("cleanup-lease");
    when(indicators.findById(root.getId())).thenReturn(Optional.of(root));
    when(references.beginDelete(root.getId())).thenThrow(new ConflictException("INDICATOR_REFERENCE_BUSY", "Protected pending write"));
    assertThatThrownBy(() -> service.cleanup(claim)).isInstanceOf(ConflictException.class);
    verifyNoInteractions(mongo);
    verify(receipts, never()).abandon(any(), any());
    verify(receipts).releaseLease(any(), eq("cleanup-lease"));
  }

  @Test void aWorkerThatResumesAfterItsClaimWasAbandonedCannotLeaveAPermanentHiddenRow() {
    var row = orphanRow();
    when(references.beginDelete(row.get("_id").toString())).thenReturn("gate");
    @SuppressWarnings("unchecked") var collection = mock(com.mongodb.client.MongoCollection.class);
    @SuppressWarnings("unchecked") var found = mock(com.mongodb.client.FindIterable.class);
    when(mongo.getCollection("analytics-indicator")).thenReturn(collection);
    when(collection.find(any(org.bson.conversions.Bson.class))).thenReturn(found);
    when(collection.deleteOne(any(org.bson.conversions.Bson.class))).thenReturn(com.mongodb.client.result.DeleteResult.acknowledged(1));
    // This row is the delayed insert after the old claim has already disappeared.
    service.cleanupOrphan(row);
    var filter = ArgumentCaptor.forClass(org.bson.conversions.Bson.class);
    verify(collection).deleteOne(filter.capture());
    assertThat((Document) filter.getValue()).containsEntry("_id", row.get("_id"))
        .containsEntry("communityCopyPending", receiptId).containsEntry("communitySourceId", pool)
        .containsEntry("createdBy", row.get("createdBy"));
    verify(receipts, times(3)).hasClaim(viewer.getId(), pool, receiptId);
    verify(references).cancelDelete(row.get("_id").toString(), "gate");
    verifyNoInteractions(indicators);
  }

  @Test void orphanSweepDoesNotTouchARecoveredActiveCopyClaim() {
    var row = orphanRow();
    when(receipts.hasClaim(viewer.getId(), pool, receiptId)).thenReturn(false, true);
    when(references.beginDelete(row.get("_id").toString())).thenReturn("gate");
    service.cleanupOrphan(row);
    verifyNoInteractions(mongo, indicators);
    verify(references).cancelDelete(row.get("_id").toString(), "gate");
  }

  @Test void orphanSweepRetainsAReferencedSupportingSource() {
    var row = orphanRow();
    when(references.beginDelete(row.get("_id").toString())).thenReturn("gate");
    @SuppressWarnings("unchecked") var collection = mock(com.mongodb.client.MongoCollection.class);
    @SuppressWarnings("unchecked") var found = mock(com.mongodb.client.FindIterable.class);
    when(mongo.getCollection("analytics-indicator")).thenReturn(collection);
    when(collection.find(any(org.bson.conversions.Bson.class))).thenReturn(found);
    when(found.first()).thenReturn(new Document("_id", "referencing-parent"));
    service.cleanupOrphan(row);
    verify(collection, never()).deleteOne(any(org.bson.conversions.Bson.class));
    verify(references).cancelDelete(row.get("_id").toString(), "gate");
  }

  @Test void orphanSweepNeverOverridesAnUncertainWriteReservation() {
    var row = orphanRow();
    when(references.beginDelete(row.get("_id").toString())).thenThrow(new ConflictException("INDICATOR_REFERENCE_BUSY", "Protected write"));
    assertThatThrownBy(() -> service.cleanupOrphan(row)).isInstanceOf(ConflictException.class);
    verifyNoInteractions(mongo, indicators);
  }

  @Test void orphanScanReadsOnlyIdentitiesAndProvenanceAndExcludesRowsWithExistingClaims() {
    var pipeline = CommunityPreviewStore.orphanPipeline(new Date());
    Document projection = pipeline.get(1).get("$project", Document.class);
    assertThat(projection.keySet()).contains("_id", "createdBy", "communityCopyPending")
        .doesNotContain("indicatorQuery", "configurationRequest", "analyticsTechniqueReference");
    assertThat(pipeline.toString()).contains("$lookup", "receiptId", "_copyClaims", "$size=0", "$limit=50");
  }

  Document orphanRow() {
    return new Document("_id", new ObjectId()).append("createdBy", new com.mongodb.DBRef("openlap-users", new ObjectId(viewer.getId())))
        .append("communitySourceId", pool).append("communitySourceVersion", "version")
        .append("communityCopyPending", receiptId).append("communityDependency", true);
  }

  Document copyClaim(CommunityIndicatorExecution.Graph graph) {
    var ids = new ArrayList<String>(); ids.add(graph.root().getId()); graph.leaves().forEach(row -> ids.add(row.getId()));
    return new Document("owner", viewer.getId()).append("poolId", pool).append("version", "version")
        .append("targetId", graph.root().getId()).append("receiptId", receiptId).append("targetIds", ids).append("state", "PENDING");
  }

  void setupCopy(CommunityIndicatorExecution.Graph graph, Map<String, Indicator> persisted) {
    when(receipts.require(receiptId, viewer.getId(), pool)).thenReturn(receipt());
    when(execution.execute(eq(source), eq(viewer), anyMap(), anyMap())).thenReturn(graph);
    when(receipts.claim(any())).thenReturn(new Document("owner", viewer.getId()).append("poolId", pool)
        .append("version", "version").append("targetId", graph.root().getId()).append("receiptId", receiptId).append("state", "PENDING"));
    when(receipts.acquire(any())).thenReturn("lease");
    when(indicators.findById(anyString())).thenAnswer(invocation -> Optional.ofNullable(persisted.get(invocation.getArgument(0, String.class))));
    when(indicators.save(any())).thenAnswer(invocation -> { Indicator value = invocation.getArgument(0); persisted.put(value.getId(), value); return value; });
  }

  CommunityIndicatorExecution.Graph complexGraph() {
    var base = graph(); var first = new Indicator(); first.setId(new ObjectId().toHexString()); first.setCreatedBy(viewer);
    var second = new Indicator(); second.setId(new ObjectId().toHexString()); second.setCreatedBy(viewer);
    base.root().setIndicatorType(IndicatorType.COMPOSITE);
    base.root().setIndicators(List.of(new IndicatorsToMerge(first, "key"), new IndicatorsToMerge(second, "key")));
    return new CommunityIndicatorExecution.Graph(base.root(), List.of(first, second), "version", "bindings", Map.of(), base.targets(), base.previewCode());
  }

  Document receipt() {
    return new Document("_id", receiptId).append("owner", viewer.getId()).append("poolId", pool)
        .append("version", "version").append("bindingsHash", "bindings")
        .append("connections", new Document()).append("targets", new Document());
  }
  CommunityIndicatorExecution.Graph graph() {
    var root = new Indicator(); root.setId(new ObjectId().toHexString()); root.setCreatedBy(viewer);
    root.setIndicatorType(IndicatorType.BASIC);
    var chart = new VisType(); chart.setId("chart");
    root.setVisualizationTechniqueReference(new VisualizationTechniqueReference("{}", "{}", null, chart));
    return new CommunityIndicatorExecution.Graph(root, List.of(), "version", "bindings", Map.of(), Map.of(source.getId(), root.getId()), "viewer chart");
  }
}
