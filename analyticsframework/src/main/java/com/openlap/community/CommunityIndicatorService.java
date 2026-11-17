package com.openlap.community;

import com.openlap.analytics_module.entities.Indicator;
import com.openlap.analytics_module.repositories.IndicatorRepository;
import com.openlap.infrastructure.exception.ConflictException;
import com.openlap.infrastructure.exception.OpenLapException;
import com.openlap.user.entities.User;
import com.openlap.user.services.TokenService;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.*;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;

/** Personal previews are capabilities for one exact template, viewer and connection binding. */
@Service
public class CommunityIndicatorService {
  private final CommunityCatalogService catalog;
  private final CommunityIndicatorExecution execution;
  private final CommunityPreviewStore receipts;
  private final IndicatorRepository indicators;
  private final TokenService tokens;
  private final MongoTemplate mongo;
  private final com.openlap.analytics_module.services.ComplexIndicatorReferences references;

  public CommunityIndicatorService(CommunityCatalogService catalog, CommunityIndicatorExecution execution,
      CommunityPreviewStore receipts, IndicatorRepository indicators, TokenService tokens,
      @Qualifier("primaryMongoTemplate") MongoTemplate mongo, com.openlap.analytics_module.services.ComplexIndicatorReferences references) {
    this.catalog = catalog; this.execution = execution; this.receipts = receipts;
    this.indicators = indicators; this.tokens = tokens; this.mongo = mongo; this.references = references;
  }

  public record Preview(String status, String message, String previewCode, String receiptId, String version, String visualizationTypeId, List<CommunityIndicatorExecution.ConnectionChoice> choices) {}
  public record Copy(String id, boolean alreadySaved) {}

  public Preview preview(HttpServletRequest request, String poolId, Map<String, String> connections) {
    User viewer = tokens.getUserFromToken(request);
    Indicator source = null;
    try {
      source = catalog.resolveIndicator(poolId);
      var graph = execution.execute(source, viewer, connections, Map.of());
      String receiptId = UUID.randomUUID().toString();
      Document targets = new Document();
      graph.targets().forEach(targets::put);
      receipts.create(new Document("_id", receiptId).append("owner", viewer.getId()).append("poolId", poolId)
          .append("version", graph.version()).append("bindingsHash", graph.bindingsHash())
          .append("connections", new Document(graph.connections())).append("targets", targets)
          .append("targetId", graph.root().getId()).append("createdAt", new Date())
          .append("expiresAt", Date.from(Instant.now().plusSeconds(15 * 60))));
      return new Preview("READY", "Preview generated using only your data. You can save your own copy.",
          graph.previewCode(), receiptId, graph.version(), graph.root().getVisualizationTechniqueReference().getVisType().getId(), List.of());
    } catch (OpenLapException error) {
      if (Set.of("NO_CONNECTION", "MISSING_LRS", "NO_DATA", "PLUGIN_UNAVAILABLE", "INCOMPATIBLE", "CHOOSE_CONNECTION").contains(error.getCode()))
        return new Preview(error.getCode(), error.getMessage(), null, null, null, null,
            "CHOOSE_CONNECTION".equals(error.getCode()) ? execution.connectionChoices(source, viewer) : List.of());
      return new Preview("INCOMPATIBLE", "This indicator cannot currently be generated with your data and the available plugins.", null, null, null, null, List.of());
    } catch (RuntimeException error) {
      return new Preview("ERROR", "The preview could not be completed. Please try again.", null, null, null, null, List.of());
    }
  }

  public Copy copy(HttpServletRequest request, String poolId, String receiptId) {
    User viewer = tokens.getUserFromToken(request);
    Document receipt = receipts.require(receiptId, viewer.getId(), poolId);
    Document prior = receipts.existing(viewer.getId(), poolId);
    if (saved(prior, viewer)) return new Copy(prior.getString("targetId"), true);
    if (prior != null && (!receiptId.equals(prior.getString("receiptId")) || "SAVED".equals(prior.getString("state")))) cleanup(prior);
    Indicator source = catalog.resolveIndicator(poolId);
    if (!execution.fingerprint(source).equals(receipt.getString("version"))) throw changed();
    @SuppressWarnings("unchecked") Map<String, String> connections = (Map<String, String>) (Map<?, ?>) receipt.get("connections", Document.class);
    @SuppressWarnings("unchecked") Map<String, String> targets = (Map<String, String>) (Map<?, ?>) receipt.get("targets", Document.class);
    // Run the exact personal pipeline again before committing. A receipt never authorizes fallback
    // to an old data set, removed plugin, changed connection or another learner's query.
    var graph = execution.execute(source, viewer, connections, targets);
    if (!graph.version().equals(receipt.getString("version")) || !graph.bindingsHash().equals(receipt.getString("bindingsHash"))) throw changed();
    Document claim = receipts.claim(receipt);
    if (saved(claim, viewer)) return new Copy(claim.getString("targetId"), true);
    if (!receiptId.equals(claim.getString("receiptId")))
      throw new ConflictException("COPY_IN_PROGRESS", "A copy of this indicator is already being saved. Open your dashboard or try again shortly.");
    String lease = receipts.acquire(receipt);
    try {
      List<Indicator> graphRows = new ArrayList<>(graph.leaves()); graphRows.add(graph.root());
      for (Indicator value : graphRows) {
        value.setCommunitySourceId(poolId); value.setCommunitySourceVersion(graph.version());
        value.setCommunityDependency(value != graph.root()); value.setCommunityCopyPending(receiptId);
        receipts.requireLease(receipt, lease);
        Indicator existing = indicators.findById(value.getId()).orElse(null);
        if (existing == null) indicators.save(value); // existing listeners reserve plugin/source refs
        else if (!ownedCopy(existing, viewer, poolId, graph.version())) throw changed();
      }
      // A second source read catches edits that raced the preview/prepare before visibility changes.
      Indicator latestSource = catalog.resolveIndicator(poolId);
      User latestViewer = tokens.getUserFromToken(request);
      if (!execution.fingerprint(latestSource).equals(graph.version())
          || !execution.currentBindingsHash(latestSource, latestViewer, connections).equals(graph.bindingsHash())) throw changed();
      receipts.requireLease(receipt, lease);
      for (Indicator leaf : graph.leaves()) { receipts.requireLease(receipt, lease); releasePending(leaf.getId(), viewer, receiptId); }
      // Dependencies are hidden from dashboards. Expose the parent only once every leaf is ready.
      for (Indicator leaf : graph.leaves()) {
        Indicator ready = indicators.findById(leaf.getId()).orElseThrow(CommunityIndicatorExecution::unavailable);
        if (!ownedCopy(ready, viewer, poolId, graph.version()) || ready.getCommunityCopyPending() != null) throw changed();
      }
      receipts.requireLease(receipt, lease);
      releasePending(graph.root().getId(), viewer, receiptId);
      Indicator readyRoot = indicators.findById(graph.root().getId()).orElseThrow(CommunityIndicatorExecution::unavailable);
      if (!ownedCopy(readyRoot, viewer, poolId, graph.version()) || readyRoot.getCommunityCopyPending() != null) throw changed();
      receipts.requireLease(receipt, lease);
      receipts.complete(receipt, lease);
      return new Copy(graph.root().getId(), false);
    } finally {
      receipts.releaseLease(receipt, lease);
    }
  }

  private void releasePending(String id, User viewer, String receiptId) {
    var identity = new Document("_id", ObjectId.isValid(id) ? new Document("$in", List.of(id, new ObjectId(id))) : id)
        .append("createdBy.$id", new ObjectId(viewer.getId())).append("communityCopyPending", receiptId);
    var result = mongo.getCollection("analytics-indicator").updateOne(identity,
        new Document("$unset", new Document("communityCopyPending", "")));
    if (result.getMatchedCount() == 0) {
      Indicator current = indicators.findById(id).orElseThrow(CommunityIndicatorExecution::unavailable);
      if (current.getCreatedBy() == null || !viewer.getId().equals(current.getCreatedBy().getId())
          || current.getCommunityCopyPending() != null) throw changed();
    }
  }

  private boolean saved(Document claim, User viewer) {
    if (claim == null) return false;
    Indicator value = indicators.findById(claim.getString("targetId")).orElse(null);
    if (value == null || value.getCommunityCopyPending() != null || !ownedCopy(value, viewer,
        claim.getString("poolId"), claim.getString("version"))) return false;
    if (value.getIndicators() != null) for (var reference : value.getIndicators()) {
      if (reference == null || reference.getIndicator() == null) return false;
      Indicator leaf = indicators.findById(reference.getIndicator().getId()).orElse(null);
      if (leaf == null || leaf.getCommunityCopyPending() != null || !ownedCopy(leaf, viewer,
          claim.getString("poolId"), claim.getString("version"))) return false;
    }
    return true;
  }

  /** A stale, hidden graph is either recovered as complete or removed under the source deletion gates. */
  public void cleanup(Document claim) {
    String lease = receipts.acquireCleanup(claim);
    User viewer = new User(); viewer.setId(claim.getString("owner"));
    if (saved(claim, viewer)) { receipts.recoverComplete(claim, lease); return; }
    String rootId = claim.getString("targetId");
    List<String> ids = new ArrayList<>(); ids.add(rootId);
    for (Object target : claim.getList("targetIds", Object.class, List.of()))
      if (!rootId.equals(target.toString())) ids.add(target.toString());
    try {
      for (String id : ids) {
        Indicator value = indicators.findById(id).orElse(null);
        if (value == null) continue;
        if (!ownedCopy(value, viewer, claim.getString("poolId"), claim.getString("version"))) throw changed();
        // A visible parent is user work. Recovery never removes it automatically.
        if (id.equals(rootId) && value.getCommunityCopyPending() == null) throw changed();
        String gate = references.beginDelete(id);
        try {
          List<Object> identities = ObjectId.isValid(id) ? List.of(id, new ObjectId(id)) : List.of(id);
          var external = new Document("indicators.indicator.$id", new Document("$in", identities))
              .append("_id", new Document("$nin", ids.stream().flatMap(key -> ObjectId.isValid(key)
                  ? java.util.stream.Stream.of((Object) key, new ObjectId(key)) : java.util.stream.Stream.of((Object) key)).toList()));
          // A released supporting source might already have been reused by its owner; retain it.
          if (mongo.getCollection("analytics-indicator").find(external).first() == null) {
            var filter = new Document("_id", new Document("$in", identities))
                .append("createdBy.$id", new ObjectId(viewer.getId())).append("communitySourceId", claim.getString("poolId"))
                .append("communitySourceVersion", claim.getString("version"))
                .append("$or", List.of(new Document("communityCopyPending", claim.getString("receiptId")), new Document("communityDependency", true)));
            if (mongo.getCollection("analytics-indicator").deleteOne(filter).getDeletedCount() == 0
                && indicators.findById(id).isPresent()) throw changed();
          }
        } finally { references.cancelDelete(id, gate); }
      }
      receipts.abandon(claim, lease);
    } catch (RuntimeException error) {
      Document receipt = new Document("owner", claim.getString("owner")).append("poolId", claim.getString("poolId"));
      receipts.releaseLease(receipt, lease);
      throw error;
    }
  }

  /** Handles a worker that resumed between its last lease check and a delayed database insert. */
  public void cleanupOrphan(Document row) {
    if (!(row.get("createdBy") instanceof com.mongodb.DBRef owner)
        || row.get("_id") == null || row.getString("communitySourceId") == null
        || row.getString("communitySourceVersion") == null || row.getString("communityCopyPending") == null) return;
    String viewer = owner.getId().toString(), poolId = row.getString("communitySourceId"),
        receiptId = row.getString("communityCopyPending"), id = row.get("_id").toString();
    // These staged rows have a durable draft completion claim, not an exact-copy receipt.
    if (receiptId.startsWith("adaptation:")) return;
    if (receipts.hasClaim(viewer, poolId, receiptId)) return;
    String gate = references.beginDelete(id);
    try {
      List<Object> identities = ObjectId.isValid(id) ? List.of(id, new ObjectId(id)) : List.of(id);
      if (receipts.hasClaim(viewer, poolId, receiptId)) return;
      var collection = mongo.getCollection("analytics-indicator");
      if (collection.find(new Document("indicators.indicator.$id", new Document("$in", identities))).first() != null) return;
      // Recheck immediately before the conditional delete; an active/recovered copy always wins.
      if (receipts.hasClaim(viewer, poolId, receiptId)) return;
      collection.deleteOne(new Document("_id", row.get("_id")).append("createdBy", owner)
          .append("communitySourceId", poolId).append("communitySourceVersion", row.getString("communitySourceVersion"))
          .append("communityCopyPending", receiptId));
    } finally { references.cancelDelete(id, gate); }
  }

  private boolean ownedCopy(Indicator value, User viewer, String poolId, String version) {
    return value.getCreatedBy() != null && viewer.getId().equals(value.getCreatedBy().getId())
        && poolId.equals(value.getCommunitySourceId()) && version.equals(value.getCommunitySourceVersion());
  }

  private static ConflictException changed() {
    return new ConflictException("PREVIEW_CHANGED", "The indicator or your connections changed. Preview it with your data again before saving.");
  }
}
