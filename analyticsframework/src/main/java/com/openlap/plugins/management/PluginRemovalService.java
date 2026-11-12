package com.openlap.plugins.management;

import com.mongodb.DBRef;
import com.openlap.infrastructure.exception.ConflictException;
import com.openlap.infrastructure.exception.ValidationException;
import com.openlap.plugins.artifacts.PluginStorageProperties;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;

/** Reversible catalog removal. Reference reservations and frozen rows replace a cross-store transaction. */
public class PluginRemovalService {
  private final MongoTemplate mongo;
  private final PluginStorageProperties properties;
  private final PluginCatalogEditor editor;
  private final PluginReferences references = new PluginReferences();
  private final PluginCatalogVisibility visibility;
  private final com.openlap.plugins.artifacts.PluginArtifactRegistry registry;
  private final com.openlap.plugins.artifacts.PluginArtifactCache cache;

  public PluginRemovalService(MongoTemplate mongo, PluginStorageProperties properties,
      com.openlap.plugins.artifacts.PluginArtifactRegistry registry, com.openlap.plugins.artifacts.PluginArtifactCache cache) {
    this.mongo = mongo; this.properties = properties; this.registry = registry; this.cache = cache;
    editor = new PluginCatalogEditor(mongo); visibility = new PluginCatalogVisibility(mongo);
  }

  public boolean available() { return properties.getMode() == PluginStorageProperties.Mode.S3 && properties.isLogicalRemovalEnabled(); }

  public Map<String, Object> preview(PluginCatalogKind kind, String id) {
    Document selected = editor.readIncludingRemoved(kind, id);
    List<Document> scope = scope(kind, selected);
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("available", available()); result.put("kind", kind.name()); result.put("id", id);
    result.put("name", selected.get("name")); result.put("removed", "REMOVED".equals(selected.getString("removalState")));
    result.put("removalOperation", selected.get("removalOperation"));
    if (selected.get("removalOperation") != null) result.put("operation", operation(selected.getString("removalOperation")));
    result.put("affected", summaries(scope)); result.put("dependencies", dependencies(scope));
    long pins = scope.stream().mapToLong(row -> pins(row).size()).sum();
    result.put("inFlightWrites", pins); result.put("retentionDays", retentionDays());
    @SuppressWarnings("unchecked") Map<String, Long> dependencies = (Map<String, Long>) result.get("dependencies");
    result.put("canRemove", available() && pins == 0 && dependencies.values().stream().allMatch(count -> count == 0)
        && visibility.isRecordAvailable(selected));
    result.put("sharedArtifactEntries", sharedArtifactEntries(kind, selected, scope));
    return result;
  }

  public Map<String, Object> remove(PluginCatalogKind kind, String id, Map<String, Object> expected) {
    requireAvailable();
    Document selected = editor.readIncludingRemoved(kind, id);
    Document operation;
    if (!visibility.isRecordAvailable(selected)) {
      operation = rawOperation(selected.getString("removalOperation"));
      if ("REMOVED".equals(operation.getString("state"))) return operation(operation.getString("_id"));
      if (!("PREPARING".equals(operation.getString("state")) || "COMMITTING".equals(operation.getString("state")))) throw conflict("Finish catalog recovery before starting another removal.");
    }
    else {
      List<Document> rows = scope(kind, selected);
      if (expected == null || !expected.keySet().equals(rows.stream().map(row -> key(row)).collect(java.util.stream.Collectors.toSet()))) throw conflict("Review every affected entry before removal.");
      for (Document row : rows) if (PluginCatalogEditor.requireVersion(expected.get(key(row))) != PluginCatalogEditor.revision(row)) throw conflict("A plugin changed. Refresh the removal review.");
      if (dependencies(rows).values().stream().anyMatch(count -> count != 0)) throw conflict("This plugin is referenced by saved work, drafts or a pending installation. Use Disable instead.");
      operation = new Document("_id", UUID.randomUUID().toString()).append("kind", kind.name()).append("catalogId", id)
          .append("name", selected.get("name")).append("createdAt", new Date()).append("state", "PREPARING").append("rows", rows);
      mongo.insert(operation, "plugin-removal");
    }
    String token = operation.getString("_id");
    List<Document> rows = rows(operation);
    boolean committing = "COMMITTING".equals(operation.getString("state"));
    try {
      if (!committing) {
        for (Document row : rows) {
          String collection = row.getString("_collection");
          Document current = mongo.getCollection(collection).find(new Document("_id", row.get("_id"))).first();
          if (current != null && token.equals(current.getString("removalOperation")) && "REMOVING".equals(current.getString("removalState"))) continue;
          Document query = PluginCatalogEditor.versionPredicate(row, PluginCatalogEditor.revision(row));
          query.append("removalState", row.get("removalState")).append("removalOperation", row.get("removalOperation"))
              .append("referencePins", new Document("$in", Arrays.asList(null, new Document())));
          if (mongo.getCollection(collection).updateOne(query, new Document("$set", new Document("removalState", "REMOVING")
              .append("removalOperation", token).append("managementVersion", PluginCatalogEditor.revision(row) + 1))).getMatchedCount() != 1) {
            throw conflict("A plugin changed or a save is in progress. Nothing was removed; refresh and retry.");
          }
        }
        Map<String, Long> dependencies = dependencies(rows);
        if (dependencies.values().stream().anyMatch(count -> count != 0)) throw conflict("This plugin is still referenced by saved work, drafts or a pending installation. Use Disable to retire it safely.");
        if (mongo.getCollection("plugin-removal").updateOne(new Document("_id", token).append("state", "PREPARING"),
            new Document("$set", new Document("state", "COMMITTING").append("removedAt", new Date()))).getMatchedCount() != 1) {
          Document latest = rawOperation(token);
          if ("REMOVED".equals(latest.getString("state"))) return operation(token);
          if (!"COMMITTING".equals(latest.getString("state"))) throw conflict("Removal was cancelled. Refresh before another attempt.");
        }
        committing = true;
      }
      Date removed = recoveryStart(rawOperation(token));
      for (Document row : rows) {
        if (mongo.getCollection(row.getString("_collection")).updateOne(new Document("_id", row.get("_id")).append("removalOperation", token).append("removalState", "REMOVING"),
            new Document("$set", new Document("removalState", "REMOVED").append("removedAt", removed).append("enabled", false))).getMatchedCount() != 1) {
          String state = rawOperation(token).getString("state");
          if (Arrays.asList("REMOVED", "RESTORING", "RESTORED").contains(state)) return operation(token);
          Document current = mongo.getCollection(row.getString("_collection")).find(new Document("_id", row.get("_id"))).first();
          if (current == null || !token.equals(current.getString("removalOperation")) || !"REMOVED".equals(current.getString("removalState")))
            throw conflict("A removal entry changed unexpectedly. Keep it reserved and resume after repairing its catalog record.");
        }
      }
      mongo.getCollection("plugin-removal").updateOne(new Document("_id", token).append("state", "COMMITTING"), new Document("$set", new Document("state", "REMOVED")));
      return operation(token);
    } catch (RuntimeException error) {
      if (!committing) {
        // A failed acknowledgement of the COMMITTING transition is indeterminate: retain frozen rows.
        Document latest = rawOperation(token);
        if ("PREPARING".equals(latest.getString("state")) && mongo.getCollection("plugin-removal")
            .updateOne(new Document("_id", token).append("state", "PREPARING"), new Document("$set", new Document("state", "CANCELLED"))).getMatchedCount() == 1) {
          for (Document row : rows) {
            Document rollback = new Document("$inc", new Document("managementVersion", 1L))
                .append("$unset", new Document("removalState", 1).append("removalOperation", 1));
            Document untouched = new Document("$and", Arrays.asList(PluginCatalogEditor.versionPredicate(row, PluginCatalogEditor.revision(row)),
                new Document("removalState", row.get("removalState")).append("removalOperation", row.get("removalOperation"))));
            mongo.getCollection(row.getString("_collection")).updateOne(
              new Document("_id", row.get("_id")).append("$or", Arrays.asList(new Document("removalOperation", token).append("removalState", "REMOVING"), untouched)),
              rollback);
          }
        }
      }
      throw error;
    }
  }

  public List<Map<String, Object>> removed(PluginCatalogKind kind) {
    List<Map<String, Object>> result = new ArrayList<>();
    for (Document row : mongo.getCollection("plugin-removal").find(new Document("kind", kind == PluginCatalogKind.VISUALIZATION_TYPE
        ? new Document("$in", Arrays.asList(kind.name(), PluginCatalogKind.VISUALIZATION_LIBRARY.name())) : kind.name())
        .append("state", new Document("$in", Arrays.asList("PREPARING", "REMOVED", "COMMITTING", "RESTORING")))).sort(new Document("createdAt", -1)).limit(100)) {
      if ("PREPARING".equals(row.getString("state"))) {
        Document root = rows(row).get(0);
        if (mongo.getCollection(root.getString("_collection")).countDocuments(new Document("_id", root.get("_id")).append("removalOperation", row.get("_id"))) == 0) continue;
      }
      result.add(operation(row.getString("_id")));
    }
    return result;
  }

  public Map<String, Object> resume(String token) {
    requireAvailable();
    Document operation = rawOperation(token);
    if (Arrays.asList("REMOVED", "RESTORING", "RESTORED").contains(operation.getString("state"))) return operation(token);
    if (!Arrays.asList("PREPARING", "COMMITTING").contains(operation.getString("state"))) throw conflict("This removal was cancelled. Start with a fresh catalog review.");
    PluginCatalogKind kind = PluginCatalogKind.valueOf(operation.getString("kind"));
    Document current = editor.readIncludingRemoved(kind, operation.getString("catalogId"));
    if (!token.equals(current.getString("removalOperation"))) throw conflict("This removal no longer owns the catalog entry. Refresh its current state.");
    return remove(kind, operation.getString("catalogId"), Collections.emptyMap());
  }

  public Map<String, Object> restore(String token) {
    requireAvailable();
    Document operation = rawOperation(token);
    if ("RESTORED".equals(operation.getString("state"))) { finishRestore(operation); return operation(token); }
    if (!("REMOVED".equals(operation.getString("state")) || "RESTORING".equals(operation.getString("state")))) throw conflict("Finish removal before restoring its entries.");
    if (!"RESTORING".equals(operation.getString("state")) && recoveryStart(operation).toInstant().plusSeconds(retentionDays() * 86400L).isBefore(Instant.now())) throw conflict("The recovery period has ended. Restore from the preserved release backup if needed.");
    if (mongo.getCollection("plugin-removal").updateOne(new Document("_id", token).append("state", new Document("$in", Arrays.asList("REMOVED", "RESTORING"))),
        new Document("$set", new Document("state", "RESTORING"))).getMatchedCount() != 1) {
      if ("RESTORED".equals(rawOperation(token).getString("state"))) { finishRestore(operation); return operation(token); }
      throw conflict("Recovery changed. Refresh before continuing.");
    }
    List<Document> rows = rows(operation);
    // Restoring a chart on its own requires an available parent library.
    if (PluginCatalogKind.VISUALIZATION_TYPE.name().equals(operation.getString("kind"))) {
      Document type = rows.get(0); Object parent = type.get("visualizationLib");
      if (parent instanceof DBRef) {
        Document library = editor.read(PluginCatalogKind.VISUALIZATION_LIBRARY, ((DBRef) parent).getId().toString());
        if (mongo.getCollection("visualization-library").updateOne(new Document("_id", library.get("_id"))
            .append("removalState", library.get("removalState")).append("removalOperation", library.get("removalOperation")), new Document("$set", new Document("referencePins." + token, new Document("sourceCollection", "plugin-removal").append("createdAt", new Date())))).getMatchedCount() != 1) throw conflict("The parent library changed. Refresh before restoring.");
      }
    }
    for (Document row : rows) {
      String artifact = artifact(row);
      if (artifact != null) {
        if (mongo.getCollection("plugin-artifact").updateOne(new Document("_id", artifact).append("state", "READY"),
            new Document("$set", new Document("referencePins." + token, new Document("sourceCollection", "plugin-removal").append("createdAt", new Date())))).getMatchedCount() != 1) throw conflict("A required artifact is unavailable. Restore its verified binary before catalog recovery.");
        com.openlap.plugins.artifacts.PluginKind kind = row.getString("_collection").equals("analytics-technique") ? com.openlap.plugins.artifacts.PluginKind.ANALYTICS : com.openlap.plugins.artifacts.PluginKind.VISUALIZATION;
        if (registry == null || cache == null) throw conflict("Verified artifact storage is required for restore.");
        cache.resolve(registry.ready(artifact, kind));
      }
    }
    // The retained parent documents keep DBRefs intact. Restore all entries disabled; enabling is explicit.
    for (Document row : rows) {
      long matched = mongo.getCollection(row.getString("_collection")).updateOne(new Document("_id", row.get("_id")).append("removalOperation", token).append("removalState", "REMOVED"),
        new Document("$set", new Document("removalState", "RESTORED").append("enabled", false))
            .append("$unset", new Document("removedAt", 1)).append("$inc", new Document("managementVersion", 1L))).getMatchedCount();
      if (matched == 0) {
        if ("RESTORED".equals(rawOperation(token).getString("state"))) { finishRestore(operation); return operation(token); }
        Document current = mongo.getCollection(row.getString("_collection")).find(new Document("_id", row.get("_id"))).first();
        if (current == null || !token.equals(current.getString("removalOperation")) || !"RESTORED".equals(current.getString("removalState"))) throw conflict("A recovery entry changed. Keep it reserved and resume after repairing its catalog record.");
      }
    }
    mongo.getCollection("plugin-removal").updateOne(new Document("_id", token).append("state", "RESTORING"), new Document("$set", new Document("state", "RESTORED")));
    finishRestore(operation);
    return operation(token);
  }

  private void finishRestore(Document operation) {
    String token = operation.getString("_id"); List<Document> rows = rows(operation);
    for (Document row : rows) {
      mongo.getCollection(row.getString("_collection")).updateOne(new Document("_id", row.get("_id")).append("removalOperation", token).append("removalState", "RESTORED"),
          new Document("$unset", new Document("removalState", 1).append("removalOperation", 1)));
      String artifact = artifact(row);
      if (artifact != null) mongo.getCollection("plugin-artifact").updateOne(new Document("_id", artifact), new Document("$unset", new Document("referencePins." + token, 1)));
    }
    Object parent = rows.get(0).get("visualizationLib");
    if (parent instanceof DBRef) mongo.getCollection("visualization-library").updateOne(new Document("_id", ((DBRef) parent).getId()), new Document("$unset", new Document("referencePins." + token, 1)));
  }

  public void finishCompletedRecoveries() {
    for (Document operation : mongo.getCollection("plugin-removal").find(new Document("state", "RESTORED")).limit(100)) finishRestore(operation);
  }

  private List<Document> scope(PluginCatalogKind kind, Document selected) {
    List<Document> result = new ArrayList<>(); result.add(tag(selected, kind.collection));
    if (kind == PluginCatalogKind.VISUALIZATION_LIBRARY) for (Document row : mongo.getCollection("visualization-type").find(
        new Document("visualizationLib", new DBRef(kind.collection, selected.get("_id"))))) {
      if (visibility.isRecordAvailable(row)) result.add(tag(row, "visualization-type"));
    }
    if (result.size() > 200) throw conflict("This library needs a reviewed maintenance removal because it contains more than 199 chart types.");
    return result;
  }

  Map<String, Long> dependencies(List<Document> rows) {
    Set<String> ids = new LinkedHashSet<>(); for (Document row : rows) ids.add(row.get("_id").toString());
    Map<String, Long> result = new LinkedHashMap<>();
    for (String key : Arrays.asList("savedIndicators", "indicatorDrafts", "savedCards", "cardDrafts", "pendingInstallations", "unreadableConfigurations")) result.put(key, 0L);
    for (String collection : PluginReferences.COLLECTIONS) {
      for (Document document : mongo.getCollection(collection).find()) {
        if ("plugin-installation".equals(collection) && Arrays.asList("ACTIVE", "DISCARDED").contains(document.getString("state"))) continue;
        try {
          Set<String> referenced = references.collect(document, ids);
          if (Collections.disjoint(ids, referenced)) continue;
          String key = "analytics-indicator".equals(collection) ? "savedIndicators" : "analytics-indicator-drafts".equals(collection) ? "indicatorDrafts"
              : "plugin-installation".equals(collection) ? "pendingInstallations" : "DRAFT".equals(document.getString("status")) ? "cardDrafts" : "savedCards";
          result.put(key, result.get(key) + 1);
        } catch (ValidationException error) { result.put("unreadableConfigurations", result.get("unreadableConfigurations") + 1); }
      }
    }
    return result;
  }

  private long sharedArtifactEntries(PluginCatalogKind kind, Document selected, List<Document> scope) {
    String artifact = artifact(tag(selected, kind.collection)); if (artifact == null) return 0;
    Set<String> own = new LinkedHashSet<>(); for (Document row : scope) own.add(key(row));
    long count = 0;
    for (String collection : Arrays.asList("analytics-technique", "visualization-library")) for (Document row : mongo.getCollection(collection).find(new Document("artifactId", artifact).append("removalState", null))) {
      if (!own.contains(collection + ":" + row.get("_id"))) count++;
    }
    return count;
  }

  private String artifact(Document row) {
    if (row.getString("artifactId") != null) return row.getString("artifactId");
    Object parent = row.get("visualizationLib");
    return parent instanceof DBRef ? editor.readIncludingRemoved(PluginCatalogKind.VISUALIZATION_LIBRARY, ((DBRef) parent).getId().toString()).getString("artifactId") : null;
  }

  public Map<String, Object> operation(String token) {
    Document row = rawOperation(token); Map<String, Object> result = new LinkedHashMap<>();
    for (String field : Arrays.asList("kind", "catalogId", "name", "state", "createdAt")) result.put(field, row.get(field));
    result.put("id", token); result.put("affected", summaries(rows(row)));
    result.put("recoverableUntil", Date.from(recoveryStart(row).toInstant().plusSeconds(retentionDays() * 86400L)));
    return result;
  }

  private Document rawOperation(String token) {
    if (token == null || !token.matches("[a-f0-9-]{36}")) throw new ValidationException("Invalid removal identifier.");
    Document row = mongo.getCollection("plugin-removal").find(new Document("_id", token)).first();
    if (row == null) throw conflict("Removal record not found."); return row;
  }

  private static List<Document> summaries(List<Document> rows) {
    List<Document> result = new ArrayList<>(); for (Document row : rows) result.add(new Document("id", row.get("_id").toString())
        .append("key", key(row)).append("name", row.get("name")).append("version", PluginCatalogEditor.revision(row))
        .append("kind", kind(row.getString("_collection")).name())); return result;
  }

  private static Document tag(Document row, String collection) { Document copy = new Document(row); copy.put("_collection", collection); return copy; }
  private static String key(Document row) { return row.getString("_collection") + ":" + row.get("_id"); }
  private static PluginCatalogKind kind(String collection) { for (PluginCatalogKind kind : PluginCatalogKind.values()) if (kind.collection.equals(collection)) return kind; throw new IllegalArgumentException(); }
  @SuppressWarnings("unchecked") private static Map<String, Object> pins(Document row) { return row.get("referencePins") instanceof Map<?, ?> ? (Map<String, Object>) row.get("referencePins") : Collections.emptyMap(); }
  @SuppressWarnings("unchecked") private static List<Document> rows(Document row) { return (List<Document>) row.get("rows"); }
  private int retentionDays() { if (properties.getRetentionDays() < 1) throw conflict("Configure a positive artifact retention period."); return properties.getRetentionDays(); }
  private static Date recoveryStart(Document operation) { return operation.getDate("removedAt") == null ? operation.getDate("createdAt") : operation.getDate("removedAt"); }
  private void requireAvailable() { if (!available()) throw conflict("Removal and recovery are available after all backend replicas use reference guards and PLUGIN_REMOVAL_ENABLED is enabled."); }
  private static ConflictException conflict(String message) { return new ConflictException("PLUGIN_REMOVAL_BLOCKED", message); }
}
