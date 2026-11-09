package com.openlap.plugins.management;

import com.mongodb.DBRef;
import com.openlap.infrastructure.exception.ConflictException;
import com.openlap.plugins.artifacts.ArtifactObjectStore;
import com.openlap.plugins.artifacts.PluginArtifact;
import com.openlap.plugins.artifacts.PluginStorageProperties;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;

/** Explicit bounded cleanup; keys are permanently retired before any remote delete is attempted. */
public class PluginArtifactCleanup {
  private final MongoTemplate mongo;
  private final PluginStorageProperties properties;
  private final ArtifactObjectStore store;
  private final PluginRemovalService removal;

  public PluginArtifactCleanup(MongoTemplate mongo, PluginStorageProperties properties, ArtifactObjectStore store, PluginRemovalService removal) {
    this.mongo = mongo; this.properties = properties; this.store = store; this.removal = removal;
  }

  public Map<String, Object> preview() {
    List<Map<String, Object>> candidates = new ArrayList<>();
    Date cutoff = cutoff();
    for (Document row : mongo.getCollection("plugin-artifact").find(new Document("$or", Arrays.asList(
        new Document("createdAt", new Document("$lte", cutoff)), new Document("state", "PURGING"))).append("state", new Document("$ne", "PURGED")))
        .sort(new Document("createdAt", 1)).limit(100)) {
      if ("PURGED".equals(row.getString("state"))) continue;
      Map<String, Object> item = new LinkedHashMap<>();
      item.put("id", row.getString("_id")); item.put("sizeBytes", row.get("sizeBytes")); item.put("state", row.get("state"));
      String blocked = blocked(row, cutoff); item.put("eligible", blocked == null); item.put("reason", blocked);
      candidates.add(item);
    }
    Map<String, Object> result = new LinkedHashMap<>(); result.put("available", removal.available()); result.put("retentionDays", properties.getRetentionDays()); result.put("artifacts", candidates);
    return result;
  }

  public Map<String, Object> run(boolean confirmed) {
    if (!confirmed || !removal.available() || store == null) throw new ConflictException("PLUGIN_CLEANUP_UNAVAILABLE", "Confirm cleanup after the reference guards and retention settings are enabled.");
    removal.finishCompletedRecoveries();
    int purged = 0; List<String> failed = new ArrayList<>();
    @SuppressWarnings("unchecked") List<Map<String, Object>> candidates = (List<Map<String, Object>>) preview().get("artifacts");
    for (Map<String, Object> candidate : candidates) {
      if (!Boolean.TRUE.equals(candidate.get("eligible"))) continue;
      String id = (String) candidate.get("id");
      try {
        Document row = mongo.getCollection("plugin-artifact").find(new Document("_id", id)).first();
        if (blocked(row, cutoff()) != null) continue;
        if (!"PURGING".equals(row.getString("state"))) {
          if (mongo.getCollection("plugin-artifact").updateOne(new Document("_id", id)
                  .append("state", new Document("$in", Arrays.asList("STAGED", "READY")))
                  .append("referencePins", new Document("$in", Arrays.asList(null, new Document()))),
              new Document("$set", new Document("state", "PURGING").append("purgeStartedAt", new Date()))).getMatchedCount() != 1) continue;
        }
        row = mongo.getCollection("plugin-artifact").find(new Document("_id", id)).first();
        if (blocked(row, cutoff()) != null) continue; // Never delete if an unexpected external reference appeared.
        PluginArtifact artifact = mongo.getConverter().read(PluginArtifact.class, row);
        store.deleteVerified(artifact);
        mongo.getCollection("plugin-artifact").updateOne(new Document("_id", id).append("state", "PURGING"),
            new Document("$set", new Document("state", "PURGED").append("purgedAt", new Date())).append("$unset", new Document("purgeError", 1)));
        purged++;
      } catch (RuntimeException error) {
        failed.add(id);
        mongo.getCollection("plugin-artifact").updateOne(new Document("_id", id).append("state", "PURGING"),
            new Document("$set", new Document("purgeError", "Storage verification or deletion failed. Retry cleanup after recovery.")));
      }
      if (purged + failed.size() >= 20) break;
    }
    Map<String, Object> result = new LinkedHashMap<>(); result.put("purged", purged); result.put("failedArtifactIds", failed); return result;
  }

  private String blocked(Document artifact, Date cutoff) {
    if (artifact == null) return "Artifact metadata is missing.";
    if (artifact.get("referencePins") instanceof Map<?, ?> && !((Map<?, ?>) artifact.get("referencePins")).isEmpty()) return "An installation or recovery write is unfinished.";
    if (artifact.getDate("createdAt") == null || artifact.getDate("createdAt").after(cutoff)) return "The artifact retention period has not ended.";
    String id = artifact.getString("_id"); List<Document> rows = new ArrayList<>();
    for (String collection : Arrays.asList("analytics-technique", "visualization-library")) {
      for (Document row : mongo.getCollection(collection).find(new Document("artifactId", id))) {
        if (!"REMOVED".equals(row.getString("removalState")) || row.getDate("removedAt") == null || row.getDate("removedAt").after(cutoff)) return "A catalog entry still needs this artifact or is within its recovery period.";
        Document operation = mongo.getCollection("plugin-removal").find(new Document("_id", row.getString("removalOperation"))).first();
        if (operation == null || !"REMOVED".equals(operation.getString("state"))) return "Catalog removal or recovery has not finished.";
        row.put("_collection", collection); rows.add(row);
        if ("visualization-library".equals(collection)) for (Document type : mongo.getCollection("visualization-type").find(new Document("visualizationLib", new DBRef(collection, row.get("_id"))))) {
          if (!"REMOVED".equals(type.getString("removalState")) || type.getDate("removedAt") == null || type.getDate("removedAt").after(cutoff)) return "A chart type still needs this shared artifact.";
          type.put("_collection", "visualization-type"); rows.add(type);
        }
      }
    }
    for (Document operation : mongo.getCollection("plugin-installation").find(new Document("artifactId", id))) {
      String state = operation.getString("state");
      if (!Arrays.asList("ACTIVE", "DISCARDED").contains(state)) return "A pending installation still needs this artifact.";
      if ("DISCARDED".equals(state) && (operation.getDate("discardedAt") == null || operation.getDate("discardedAt").after(cutoff))) return "A discarded upload is within its retention period.";
    }
    if (!rows.isEmpty() && removal.dependencies(rows).values().stream().anyMatch(count -> count != 0)) return "Stored work or a pending operation still references the retained catalog records.";
    return null;
  }

  private Date cutoff() {
    if (properties.getRetentionDays() < 1) throw new ConflictException("PLUGIN_RETENTION_INVALID", "Configure a positive retention period.");
    return Date.from(Instant.now().minusSeconds(properties.getRetentionDays() * 86400L));
  }
}
