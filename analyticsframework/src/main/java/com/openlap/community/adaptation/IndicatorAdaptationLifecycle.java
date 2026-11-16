package com.openlap.community.adaptation;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openlap.analytics_module.drafts.*;
import com.openlap.analytics_module.entities.Indicator;
import com.openlap.analytics_module.repositories.IndicatorRepository;
import com.openlap.dataset.OpenLAPDataSet;
import com.openlap.infrastructure.exception.ConflictException;
import com.openlap.infrastructure.exception.OpenLapException;
import com.openlap.infrastructure.exception.ValidationException;
import com.openlap.user.services.TokenService;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;

/** Draft-scoped completion: variants never share the exact-copy pool's uniqueness claim. */
@Service
public class IndicatorAdaptationLifecycle implements IndicatorDraftAdaptationLifecycle {
  private final IndicatorDraftService drafts;
  private final IndicatorDraftStore store;
  private final IndicatorDraftTargets targets;
  private final IndicatorDraftConfiguration configurations;
  private final AdaptationExecution execution;
  private final AdaptationProofStore proofs;
  private final IndicatorRepository indicators;
  private final TokenService tokens;
  private final ObjectMapper mapper;
  private final MongoTemplate mongo;

  public IndicatorAdaptationLifecycle(IndicatorDraftService drafts, IndicatorDraftStore store,
      IndicatorDraftTargets targets, IndicatorDraftConfiguration configurations, AdaptationExecution execution,
      AdaptationProofStore proofs, IndicatorRepository indicators, TokenService tokens, ObjectMapper mapper,
      @Qualifier("primaryMongoTemplate") MongoTemplate mongo) {
    this.drafts = drafts; this.store = store; this.targets = targets; this.configurations = configurations;
    this.execution = execution; this.proofs = proofs; this.indicators = indicators; this.tokens = tokens;
    this.mapper = mapper; this.mongo = mongo;
  }

  public record Preview(String status, String message, OpenLAPDataSet data, String previewCode,
      String visualizationTypeId, String receiptId, long revision, String configurationHash) {}

  public Preview preview(HttpServletRequest request, String id, AdaptationPreviewController.Request body) {
    Document current = drafts.requireAdaptation(request, id);
    requireRevision(current, body.revision());
    if (!"DRAFT".equals(current.getString("status"))) throw conflict("Resume the unfinished save before previewing this draft.");
    String hash = hash(current);
    try {
      var result = execution.execute(request, current, body.stage(), Map.of());
      Document latest = drafts.requireAdaptation(request, id);
      requireRevision(latest, body.revision());
      if (!"DRAFT".equals(latest.getString("status")) || !hash.equals(hash(latest))) throw conflict("The draft changed while its preview was running. Preview it again.");
      String receipt = "visualization".equals(body.stage())
          ? proofs.create(current.getString("ownerId"), id, revision(current), hash, result) : null;
      return new Preview("READY", "Preview generated using your data.", result.data(), result.previewCode(),
          result.root().getVisualizationTechniqueReference() == null ? null : result.root().getVisualizationTechniqueReference().getVisType().getId(),
          receipt, revision(current), hash);
    } catch (ConflictException error) { throw error;
    } catch (OpenLapException error) {
      // Only errors authored by this boundary have contextual, safe messages; plugin/driver errors
      // can contain paths or raw selectors and must never become a community-detail response.
      boolean safe = error instanceof ValidationException && Set.of("INCOMPLETE_ADAPTATION", "PERSONAL_DATA_REQUIRED", "MISSING_LRS", "NO_DATA", "PLUGIN_UNAVAILABLE").contains(error.getCode());
      return new Preview(safe ? error.getCode() : "INCOMPATIBLE", safe ? error.getMessage()
          : "Review the data selections and mappings for this step.", null, null, null, null, revision(current), hash);
    } catch (RuntimeException error) {
      return new Preview("ERROR", "The preview could not be completed. Review the selections and try again.", null, null, null, null, revision(current), hash);
    }
  }

  @Override
  public IndicatorDraftResponse complete(HttpServletRequest request, Document current, IndicatorDraftRequests.Complete body) {
    String owner = tokens.getUserFromToken(request).getId(), id = current.get("_id").toString();
    String receiptId = receipt(body);
    String completionHash = configurations.hash(body.indicator());
    String status = current.getString("status");
    if ("COMPLETED".equals(status)) {
      requireCompletion(current, body.revision(), completionHash);
      return drafts.adaptationResponse(current);
    }
    if ("DISCARDED".equals(status)) throw conflict("This draft has already been discarded.");
    if ("COMPLETING".equals(status)) {
      requireCompletion(current, body.revision(), completionHash);
      // An acknowledged, visible graph is already committed. Recovery releases uncertain pins
      // before considering current plugin availability or the short-lived preview's expiry.
      if (recoverVisible(owner, current, completionHash)) return terminal(owner, current, completionHash);
    } else {
      requireRevision(current, body.revision());
      String configHash = hash(current);
      Document proof = proofs.require(receiptId, owner, id, revision(current), configHash);
      var prepared = execution.execute(request, current, "visualization", targetIds(current));
      requireProof(proof, prepared);
      Document claim = new Document(current);
      claim.put("status", "COMPLETING"); claim.put("completionHash", completionHash);
      claim.put("completionRevision", body.revision()); claim.put("completionClaimRevision", revision(current) + 1);
      claim.put("completionPayload", body.indicator().toString()); claim.put("adaptationConfigurationHash", configHash);
      claim.put("adaptationBindingsHash", prepared.bindingsHash()); claim.put("adaptationPluginsHash", prepared.pluginsHash());
      claim.put("adaptationTargets", new Document(prepared.targets()));
      claim.put("targetIndicatorId", prepared.targets().get("root"));
      claim.put("revision", revision(current) + 1); claim.put("updatedAt", new Date());
      if (!store.replace(owner, current, claim)) return complete(request, drafts.requireAdaptation(request, id), body);
      current = claim;
    }

    try {
      Map<String, String> ids = targetIds(current);
      var result = execution.execute(request, current, "visualization", ids);
      requireClaim(current, result);
      execution.remapForPublication(result, ids);
      var origin = current.get("adaptation", Document.class);
      String pending = pending(current);
      for (int index = 0; index < result.leaves().size(); index++) {
        Indicator leaf = result.leaves().get(index);
        provenance(leaf, origin, true, pending);
        Document childClaim = childClaim(current, index, leaf.getId());
        targets.publish(owner, childClaim, leaf, completionHash);
      }
      provenance(result.root(), origin, false, pending);
      targets.publish(owner, current, result.root(), completionHash);
      // Revalidate the personal graph after writes but before any row is exposed. A changed profile
      // or plugin can leave a resumable hidden graph, never a partially visible saved indicator.
      var latest = execution.execute(request, current, "visualization", ids);
      requireClaim(current, latest);
      makeVisible(owner, current, completionHash);
      return terminal(owner, current, completionHash);
    } catch (ValidationException error) {
      // Once a claim exists, 400 would incorrectly tell the draft client that no write started.
      // Keep its durable terminal request and make it resume the same graph after repair.
      throw new ConflictException("ADAPTATION_SAVE_PENDING",
          "This save is unfinished. Check your learner connections and selected plugins, then resume the save. Your draft and hidden sources are preserved.");
    }
  }

  @Override
  public IndicatorDraftResponse resume(HttpServletRequest request, Document current) {
    if ("COMPLETED".equals(current.getString("status"))) return drafts.adaptationResponse(current);
    if (!"COMPLETING".equals(current.getString("status"))) throw conflict("This draft has no unfinished save to resume.");
    try {
      return complete(request, current, new IndicatorDraftRequests.Complete(current.get("completionRevision", Number.class).longValue(),
          mapper.readTree(current.getString("completionPayload"))));
    } catch (com.fasterxml.jackson.core.JsonProcessingException | NullPointerException error) {
      throw conflict("The saved completion request is unavailable. Your draft is preserved for recovery.");
    }
  }

  private boolean recoverVisible(String owner, Document current, String hash) {
    if (!targets.recover(owner, current, hash)) return false;
    Indicator root = indicators.findById(current.getString("targetIndicatorId")).orElse(null);
    if (root == null || root.getCommunityCopyPending() != null) return false;
    requireGraph(owner, current, hash, false);
    return true;
  }

  private void makeVisible(String owner, Document current, String hash) {
    requireGraph(owner, current, hash, true);
    List<String> leaves = leafIds(current);
    for (int i = 0; i < leaves.size(); i++) {
      targets.recover(owner, childClaim(current, i, leaves.get(i)), hash);
      clearPending(owner, leaves.get(i), current, hash, childClaim(current, i, leaves.get(i)).get("_id").toString());
    }
    requireGraph(owner, current, hash, false);
    clearPending(owner, current.getString("targetIndicatorId"), current, hash, current.get("_id").toString());
  }

  private void requireGraph(String owner, Document current, String hash, boolean allowPending) {
    List<String> children = leafIds(current);
    for (int i = 0; i < children.size(); i++) requireRow(owner, children.get(i), current, hash,
        childClaim(current, i, children.get(i)).get("_id").toString(), allowPending);
    requireRow(owner, current.getString("targetIndicatorId"), current, hash, current.get("_id").toString(), true);
  }

  private void requireRow(String owner, String id, Document current, String hash, String completionId, boolean allowPending) {
    Document row = mongo.getCollection("analytics-indicator").find(identity(id)).first();
    var origin = current.get("adaptation", Document.class);
    if (row == null || !(row.get("createdBy") instanceof com.mongodb.DBRef creator) || !owner.equals(creator.getId().toString())
        || !completionId.equals(row.getString("_draftCompletionId")) || !hash.equals(row.getString("_draftCompletionHash"))
        || !origin.getString("poolId").equals(row.getString("communitySourceId"))
        || !origin.getString("sourceVersion").equals(row.getString("communitySourceVersion"))
        || row.get("communityCopyPending") != null && (!allowPending || !pending(current).equals(row.getString("communityCopyPending"))))
      throw conflict("A staged source changed. Your draft is preserved; retry its unfinished save.");
  }

  private void clearPending(String owner, String id, Document current, String hash, String completionId) {
    requireRow(owner, id, current, hash, completionId, true);
    Document filter = identity(id); filter.put("communityCopyPending", pending(current));
    filter.put("_draftCompletionId", completionId); filter.put("_draftCompletionHash", hash);
    mongo.getCollection("analytics-indicator").updateOne(filter, new Document("$unset", new Document("communityCopyPending", "")));
    requireRow(owner, id, current, hash, completionId, false);
  }

  private IndicatorDraftResponse terminal(String owner, Document current, String hash) {
    Document receipt = new Document(current);
    for (String key : List.of("configuration", "completionPayload", "sourceSnapshot", "activeSourceKey", "targetIndicatorId",
        "lastMutationId", "lastMutationHash", "_pluginReferenceWrite", "adaptationTargets", "adaptationConfigurationHash",
        "adaptationBindingsHash", "adaptationPluginsHash")) receipt.remove(key);
    receipt.put("_indicatorDraftReceipt", true); receipt.put("status", "COMPLETED"); receipt.put("recoverable", false);
    receipt.put("savedIndicatorId", current.getString("targetIndicatorId")); receipt.put("revision", revision(current) + 1); receipt.put("updatedAt", new Date());
    if (!store.replace(owner, current, receipt)) {
      Document latest = store.find(owner, current.get("_id").toString());
      if (latest == null || !"COMPLETED".equals(latest.getString("status")) || !hash.equals(latest.getString("completionHash")))
        throw conflict("The save changed. Reload your dashboard to check its status.");
      return drafts.adaptationResponse(latest);
    }
    return drafts.adaptationResponse(receipt);
  }

  private Map<String, String> targetIds(Document current) {
    if (current.get("adaptationTargets") instanceof Document saved) {
      Map<String, String> result = new LinkedHashMap<>(); saved.forEach((key, value) -> result.put(key, value.toString())); return result;
    }
    String draftId = current.get("_id").toString();
    Map<String, String> result = new LinkedHashMap<>(); result.put("root", target(draftId, "root"));
    Document config = current.get("configuration", Document.class);
    if (config != null) for (Document source : config.getList("sources", Document.class, List.of()))
      result.put(source.getString("id"), target(draftId, source.getString("id")));
    return result;
  }
  private static String target(String draftId, String slot) { return java.util.HexFormat.of().formatHex(java.util.Arrays.copyOf(
      digest((draftId + "\u0000" + slot).getBytes(StandardCharsets.UTF_8)), 12)); }
  private static byte[] digest(byte[] bytes) { try { return java.security.MessageDigest.getInstance("SHA-256").digest(bytes); } catch (java.security.NoSuchAlgorithmException error) { throw new IllegalStateException(error); } }
  private static Document childClaim(Document parent, int index, String id) { return new Document("_id", parent.get("_id") + "/source/" + index).append("targetIndicatorId", id); }
  private static List<String> leafIds(Document current) { var targets = current.get("adaptationTargets", Document.class); List<String> ids = new ArrayList<>(); targets.forEach((slot, id) -> { if (!"root".equals(slot)) ids.add(id.toString()); }); return ids; }
  private static String pending(Document current) { return "adaptation:" + current.get("_id"); }
  private static void provenance(Indicator value, Document origin, boolean dependency, String pending) {
    value.setCommunitySourceId(origin.getString("poolId")); value.setCommunitySourceVersion(origin.getString("sourceVersion"));
    value.setCommunityDependency(dependency); value.setCommunityCopyPending(pending);
    value.setCommunityAdapted(true);
  }
  private String hash(Document current) { return configurations.hash(mapper.valueToTree(Arrays.asList(current.get("configuration"), current.getString("name"), current.getString("indicatorType")))); }
  private static long revision(Document current) { return current.get("revision", Number.class).longValue(); }
  private static void requireRevision(Document current, long revision) { if (revision(current) != revision) throw conflict("The draft changed. Reload its latest version before previewing or saving."); }
  private static String receipt(IndicatorDraftRequests.Complete body) { if (body == null || body.revision() == null || body.indicator() == null || !body.indicator().isObject() || body.indicator().size() != 1 || !body.indicator().path("adaptationReceiptId").isTextual()) throw AdaptationProofStore.invalid(); return body.indicator().path("adaptationReceiptId").asText(); }
  private static void requireCompletion(Document current, long revision, String hash) { if (!hash.equals(current.getString("completionHash")) || current.get("completionRevision", Number.class) == null || current.get("completionRevision", Number.class).longValue() != revision) throw conflict("This draft already has a different unfinished save. Resume that save first."); }
  private static void requireProof(Document proof, AdaptationExecution.Result result) { if (!result.bindingsHash().equals(proof.getString("bindingsHash")) || !result.pluginsHash().equals(proof.getString("pluginsHash"))) throw AdaptationProofStore.invalid(); }
  private void requireClaim(Document claim, AdaptationExecution.Result result) { if (!hash(claim).equals(claim.getString("adaptationConfigurationHash")) || !result.bindingsHash().equals(claim.getString("adaptationBindingsHash")) || !result.pluginsHash().equals(claim.getString("adaptationPluginsHash"))) throw AdaptationProofStore.invalid(); }
  private static Document identity(String id) { return new Document("_id", ObjectId.isValid(id) ? new Document("$in", List.of(id, new ObjectId(id))) : id); }
  private static ConflictException conflict(String message) { return new ConflictException("ADAPTATION_CHANGED", message); }
}
