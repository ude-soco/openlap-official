package com.openlap.community.adaptation;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mongodb.DBRef;
import com.mongodb.client.FindIterable;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.result.UpdateResult;
import com.openlap.analytics_module.drafts.*;
import com.openlap.analytics_module.entities.Indicator;
import com.openlap.analytics_module.entities.utility_entities.*;
import com.openlap.analytics_module.repositories.IndicatorRepository;
import com.openlap.dataset.OpenLAPDataSet;
import com.openlap.infrastructure.exception.ValidationException;
import com.openlap.user.entities.User;
import com.openlap.user.services.TokenService;
import com.openlap.visualization_methods.entities.*;
import jakarta.servlet.http.HttpServletRequest;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;
import org.bson.Document;
import org.bson.conversions.Bson;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.*;
import org.springframework.data.mongodb.core.MongoTemplate;

class IndicatorAdaptationLifecycleTest {
  final ObjectMapper mapper = new ObjectMapper();
  final IndicatorDraftService drafts = mock(IndicatorDraftService.class);
  final IndicatorDraftStore store = mock(IndicatorDraftStore.class);
  final IndicatorDraftTargets targets = mock(IndicatorDraftTargets.class);
  final AdaptationExecution execution = mock(AdaptationExecution.class);
  final AdaptationProofStore proofs = mock(AdaptationProofStore.class);
  final IndicatorRepository indicators = mock(IndicatorRepository.class);
  final TokenService tokens = mock(TokenService.class);
  final MongoTemplate mongo = mock(MongoTemplate.class);
  @SuppressWarnings("unchecked") final MongoCollection<Document> rows = mock(MongoCollection.class);
  final HttpServletRequest request = mock(HttpServletRequest.class);
  final User viewer = new User();
  final AtomicReference<Document> current = new AtomicReference<>();
  final Map<String, Document> saved = new LinkedHashMap<>();
  final IndicatorAdaptationLifecycle lifecycle = new IndicatorAdaptationLifecycle(drafts, store, targets,
      new IndicatorDraftConfiguration(mapper), execution, proofs, indicators, tokens, mapper, mongo);

  @BeforeEach void setup() {
    viewer.setId(new ObjectId().toHexString());
    current.set(draft("draft-first"));
    when(tokens.getUserFromToken(request)).thenReturn(viewer);
    when(drafts.requireAdaptation(eq(request), anyString())).thenAnswer(call -> current.get());
    when(store.find(eq(viewer.getId()), anyString())).thenAnswer(call -> current.get());
    when(store.replace(eq(viewer.getId()), any(), any())).thenAnswer(call -> {
      Document previous = call.getArgument(1), next = call.getArgument(2);
      if (!Objects.equals(previous.get("revision"), current.get().get("revision")) || !Objects.equals(previous.getString("status"), current.get().getString("status"))) return false;
      current.set(new Document(next)); return true;
    });
    when(drafts.adaptationResponse(any())).thenAnswer(call -> response(call.getArgument(0)));
    when(proofs.require(anyString(), eq(viewer.getId()), anyString(), anyLong(), anyString()))
        .thenReturn(new Document("bindingsHash", "bindings1").append("pluginsHash", "plugins1"));
    when(proofs.create(anyString(), anyString(), anyLong(), anyString(), any())).thenReturn("preview-id");
    when(execution.execute(eq(request), any(), anyString(), anyMap())).thenAnswer(call -> graph(call.getArgument(3), "bindings1", "plugins1"));
    when(mongo.getCollection("analytics-indicator")).thenReturn(rows);
    when(rows.find(any(Bson.class))).thenAnswer(call -> {
      Document filter = call.getArgument(0); String id = identity(filter);
      @SuppressWarnings("unchecked") FindIterable<Document> found = mock(FindIterable.class);
      when(found.first()).thenAnswer(ignored -> saved.get(id)); return found;
    });
    when(rows.updateOne(any(Bson.class), any(Bson.class))).thenAnswer(call -> {
      Document filter = call.getArgument(0), update = call.getArgument(1), row = saved.get(identity(filter));
      if (row != null && Objects.equals(row.get("communityCopyPending"), filter.get("communityCopyPending"))) {
        update.get("$unset", Document.class).keySet().forEach(row::remove); return UpdateResult.acknowledged(1, 1L, null);
      }
      return UpdateResult.acknowledged(0, 0L, null);
    });
    doAnswer(call -> {
      Document claim = call.getArgument(1); Indicator value = call.getArgument(2); String hash = call.getArgument(3);
      String id = claim.getString("targetIndicatorId");
      saved.putIfAbsent(id, new Document("_id", new ObjectId(id)).append("createdBy", new DBRef("users", new ObjectId(viewer.getId())))
          .append("_draftCompletionId", claim.get("_id").toString()).append("_draftCompletionHash", hash)
          .append("communitySourceId", value.getCommunitySourceId()).append("communitySourceVersion", value.getCommunitySourceVersion())
          .append("communityCopyPending", value.getCommunityCopyPending()).append("communityDependency", value.isCommunityDependency()));
      return null;
    }).when(targets).publish(eq(viewer.getId()), any(), any(), anyString());
    when(targets.recover(eq(viewer.getId()), any(), anyString())).thenAnswer(call -> {
      Document claim = call.getArgument(1), row = saved.get(claim.getString("targetIndicatorId"));
      return row != null && claim.get("_id").toString().equals(row.getString("_draftCompletionId")) && call.getArgument(2).equals(row.getString("_draftCompletionHash"));
    });
    when(indicators.findById(anyString())).thenAnswer(call -> {
      Document row = saved.get(call.getArgument(0));
      if (row == null) return Optional.empty();
      Indicator value = new Indicator(); value.setId(row.get("_id").toString()); value.setCreatedBy(viewer);
      value.setCommunityCopyPending(row.getString("communityCopyPending")); return Optional.of(value);
    });
  }

  @Test void forgedOrdinaryCompletionCannotBypassThePersonalPreview() {
    var forged = new IndicatorDraftRequests.Complete(0L, mapper.valueToTree(Map.of("indicatorType", "BASIC", "name", "forged")));
    assertThatThrownBy(() -> lifecycle.complete(request, current.get(), forged)).isInstanceOf(ValidationException.class)
        .extracting("code").isEqualTo("ADAPTATION_PREVIEW_REQUIRED");
    verifyNoInteractions(execution, targets);
    assertThat(current.get().getString("status")).isEqualTo("DRAFT");
  }

  @Test void changedBindingsOrPluginVersionInvalidateTheProofBeforeTheClaim() {
    when(execution.execute(eq(request), any(), anyString(), anyMap())).thenAnswer(call -> graph(call.getArgument(3), "different-binding", "plugins1"));
    assertThatThrownBy(() -> lifecycle.complete(request, current.get(), completion())).isInstanceOf(ValidationException.class);
    assertThat(current.get().getString("status")).isEqualTo("DRAFT");
    verifyNoInteractions(targets);
  }

  @Test void expiredOrWrongRevisionProofIsRejectedWithoutExecutingTheGraph() {
    when(proofs.require(anyString(), anyString(), anyString(), anyLong(), anyString())).thenThrow(AdaptationProofStore.invalid());
    assertThatThrownBy(() -> lifecycle.complete(request, current.get(), completion())).isInstanceOf(ValidationException.class);
    verifyNoInteractions(execution, targets);
  }

  @Test void changingAComplexSourcesScopeInvalidatesItsPreviousPreviewProof() {
    Document childFilters = new Document("selectedUserFilter", "ONLY_ME");
    current.get().get("configuration", Document.class).append("sourceDrafts",
        new Document("one", new Document("filters", childFilters)));
    var previous = lifecycle.preview(request, "draft-first", new AdaptationPreviewController.Request(0L, "visualization"));
    childFilters.put("selectedUserFilter", "EXCLUDE_ME");
    when(proofs.require(anyString(), eq(viewer.getId()), eq("draft-first"), eq(0L), anyString()))
        .thenAnswer(call -> {
          assertThat(call.<String>getArgument(4)).isNotEqualTo(previous.configurationHash());
          throw AdaptationProofStore.invalid();
        });
    clearInvocations(execution, targets);
    assertThatThrownBy(() -> lifecycle.complete(request, current.get(), completion()))
        .isInstanceOf(ValidationException.class).extracting("code").isEqualTo("ADAPTATION_PREVIEW_REQUIRED");
    verifyNoInteractions(execution, targets);
    assertThat(current.get().getString("status")).isEqualTo("DRAFT");
  }

  @Test void scopeChangedWhilePreviewRunsCannotIssueASaveProof() {
    Document filters = new Document("selectedUserFilter", "ONLY_ME");
    current.get().get("configuration", Document.class).append("filters", filters);
    when(execution.execute(eq(request), any(), anyString(), anyMap())).thenAnswer(call -> {
      filters.put("selectedUserFilter", "INCLUDE_ME");
      return graph(call.getArgument(3), "bindings1", "plugins1");
    });
    assertThatThrownBy(() -> lifecycle.preview(request, "draft-first", new AdaptationPreviewController.Request(0L, "visualization")))
        .isInstanceOf(com.openlap.infrastructure.exception.ConflictException.class).extracting("code").isEqualTo("ADAPTATION_CHANGED");
    verify(proofs, never()).create(anyString(), anyString(), anyLong(), anyString(), any());
  }

  @Test void stagesNeverIssueSaveProofUntilVisualizationHasSucceeded() {
    var combine = lifecycle.preview(request, "draft-first", new AdaptationPreviewController.Request(0L, "combine"));
    assertThat(combine.status()).isEqualTo("READY"); assertThat(combine.receiptId()).isNull();
    verify(proofs, never()).create(anyString(), anyString(), anyLong(), anyString(), any());
    var finalPreview = lifecycle.preview(request, "draft-first", new AdaptationPreviewController.Request(0L, "visualization"));
    assertThat(finalPreview.receiptId()).isEqualTo("preview-id");
  }

  @Test void backendPreviewDoesNotExposeRawPluginErrorsOrReferenceSelectors() {
    when(execution.execute(eq(request), any(), anyString(), anyMap())).thenThrow(new ValidationException("MAPPING_FAILURE", "/private/plugins/original-owner.jar original-actor"));
    var value = lifecycle.preview(request, "draft-first", new AdaptationPreviewController.Request(0L, "analysis"));
    assertThat(value.status()).isEqualTo("INCOMPATIBLE");
    assertThat(value.message()).doesNotContain("original", "/private", ".jar");
  }

  @Test void invalidScopePreviewGivesActionableSafeFeedback() {
    when(execution.execute(eq(request), any(), anyString(), anyMap()))
        .thenThrow(new ValidationException("INVALID_USER_SCOPE", "Choose whose data to include in the analysis."));
    var value = lifecycle.preview(request, "draft-first", new AdaptationPreviewController.Request(0L, "analysis"));
    assertThat(value.status()).isEqualTo("INVALID_USER_SCOPE");
    assertThat(value.message()).isEqualTo("Choose whose data to include in the analysis.");
  }

  @Test void savesCompleteOwnedGraphAndRetainsOnlySafeTerminalReference() {
    var value = lifecycle.complete(request, current.get(), completion());
    assertThat(value.status()).isEqualTo("COMPLETED");
    assertThat(saved).hasSize(3);
    assertThat(saved.values()).allSatisfy(row -> {
      assertThat(row.get("communityCopyPending")).isNull();
      assertThat(((DBRef) row.get("createdBy")).getId().toString()).isEqualTo(viewer.getId());
      assertThat(row.getString("communitySourceId")).isEqualTo("anonymous-pool");
    });
    assertThat(current.get()).doesNotContainKeys("configuration", "completionPayload", "targetIndicatorId", "adaptationTargets");
    assertThat(current.get().get("adaptation", Document.class).getString("poolId")).isEqualTo("anonymous-pool");
    assertThat(saved.get(value.savedIndicatorId()).getBoolean("communityDependency")).isFalse();
  }

  @Test void separateDraftsOfTheSameCommunityIndicatorProduceIndependentVariants() {
    String first = lifecycle.complete(request, current.get(), completion()).savedIndicatorId();
    current.set(draft("draft-second"));
    String second = lifecycle.complete(request, current.get(), completion()).savedIndicatorId();
    assertThat(second).isNotEqualTo(first); assertThat(saved).hasSize(6);
  }

  @Test void retryAfterUncertainRootInsertRecoversExactlyTheSameHiddenGraph() {
    AtomicBoolean fail = new AtomicBoolean(true);
    doAnswer(call -> {
      Document claim = call.getArgument(1); Indicator value = call.getArgument(2); String hash = call.getArgument(3);
      save(claim, value, hash);
      if (!claim.get("_id").toString().contains("/source/") && fail.getAndSet(false)) throw new IllegalStateException("uncertain acknowledgement");
      return null;
    }).when(targets).publish(eq(viewer.getId()), any(), any(), anyString());
    assertThatThrownBy(() -> lifecycle.complete(request, current.get(), completion())).isInstanceOf(IllegalStateException.class);
    assertThat(current.get().getString("status")).isEqualTo("COMPLETING");
    assertThat(saved.values()).allSatisfy(row -> assertThat(row.getString("communityCopyPending")).startsWith("adaptation:"));
    String reserved = current.get().getString("targetIndicatorId");
    var retried = lifecycle.resume(request, current.get());
    assertThat(retried.savedIndicatorId()).isEqualTo(reserved); assertThat(saved).hasSize(3);
    assertThat(saved.values()).allSatisfy(row -> assertThat(row.get("communityCopyPending")).isNull());
  }

  @Test void visibleAcknowledgedGraphCompletesAfterCrashWithoutRequiringAnUnexpiredProofOrAvailablePlugin() {
    var originalReplace = current.get();
    AtomicBoolean fail = new AtomicBoolean(true);
    when(store.replace(eq(viewer.getId()), any(), any())).thenAnswer(call -> {
      Document next = call.getArgument(2);
      if ("COMPLETED".equals(next.getString("status")) && fail.getAndSet(false)) throw new IllegalStateException("receipt write interrupted");
      current.set(new Document(next)); return true;
    });
    assertThatThrownBy(() -> lifecycle.complete(request, originalReplace, completion())).isInstanceOf(IllegalStateException.class);
    assertThat(saved.values()).allSatisfy(row -> assertThat(row.get("communityCopyPending")).isNull());
    clearInvocations(execution, proofs);
    when(execution.execute(eq(request), any(), anyString(), anyMap())).thenThrow(AdaptationExecution.plugin());
    var result = lifecycle.resume(request, current.get());
    assertThat(result.status()).isEqualTo("COMPLETED");
    verifyNoInteractions(execution, proofs);
  }

  @Test void changedOwnProfileDuringPublicationLeavesEveryRowHiddenAndResumable() {
    when(execution.execute(eq(request), any(), anyString(), anyMap())).thenAnswer(call -> {
      // First run validates proof; second prepares claimed graph; third catches profile change.
      int count = mockingDetails(execution).getInvocations().size();
      return graph(call.getArgument(3), count >= 3 ? "changed" : "bindings1", "plugins1");
    });
    assertThatThrownBy(() -> lifecycle.complete(request, current.get(), completion()))
        .isInstanceOf(com.openlap.infrastructure.exception.ConflictException.class).extracting("code").isEqualTo("ADAPTATION_SAVE_PENDING");
    assertThat(current.get().getString("status")).isEqualTo("COMPLETING");
    assertThat(saved.values()).allSatisfy(row -> assertThat(row.getString("communityCopyPending")).startsWith("adaptation:"));
  }

  private void save(Document claim, Indicator value, String hash) {
    saved.putIfAbsent(claim.getString("targetIndicatorId"), new Document("_id", new ObjectId(claim.getString("targetIndicatorId")))
        .append("createdBy", new DBRef("users", new ObjectId(viewer.getId()))).append("_draftCompletionId", claim.get("_id").toString())
        .append("_draftCompletionHash", hash).append("communitySourceId", value.getCommunitySourceId())
        .append("communitySourceVersion", value.getCommunitySourceVersion()).append("communityCopyPending", value.getCommunityCopyPending())
        .append("communityDependency", value.isCommunityDependency()));
  }
  private AdaptationExecution.Result graph(Map<String, String> ids, String bindings, String plugins) {
    Indicator root = indicator(ids.getOrDefault("root", "preview-root")), one = indicator(ids.getOrDefault("one", "one")), two = indicator(ids.getOrDefault("two", "two"));
    return new AdaptationExecution.Result(root, List.of(one, two), new OpenLAPDataSet(), "private-chart", bindings, plugins, ids);
  }
  private Indicator indicator(String id) { Indicator value = new Indicator(); value.setId(id); value.setCreatedBy(viewer); value.setIndicatorType(IndicatorType.BASIC);
    VisLibrary library = new VisLibrary(); library.setId("lib"); VisType chart = new VisType(); chart.setId("bar");
    value.setVisualizationTechniqueReference(new VisualizationTechniqueReference("{}", "{}", library, chart)); return value; }
  private Document draft(String id) { return new Document("_id", id).append("ownerId", viewer.getId()).append("indicatorType", "COMPOSITE").append("name", "My variant")
      .append("configuration", new Document("sources", List.of(new Document("id", "one"), new Document("id", "two"))))
      .append("adaptation", new Document("poolId", "anonymous-pool").append("sourceVersion", "original-version").append("reference", new Document("name", "Anonymous source")))
      .append("revision", 0L).append("status", "DRAFT").append("createdAt", new Date()).append("updatedAt", new Date()); }
  private IndicatorDraftRequests.Complete completion() { return new IndicatorDraftRequests.Complete(0L, mapper.valueToTree(Map.of("adaptationReceiptId", "9ec2cdee-9912-4a9c-a683-877a1572ee15"))); }
  private static String identity(Document filter) { Object id = filter.get("_id"); return id instanceof Document choices ? choices.getList("$in", Object.class).get(0).toString() : id.toString(); }
  private static IndicatorDraftResponse response(Document doc) { return new IndicatorDraftResponse(doc.get("_id").toString(), IndicatorType.COMPOSITE, doc.getString("name"), null, 1,
      doc.get("revision", Number.class).longValue(), null, null, null, null, doc.getString("status"), doc.getString("savedIndicatorId"), false, "COMPLETING".equals(doc.getString("status"))); }
}
