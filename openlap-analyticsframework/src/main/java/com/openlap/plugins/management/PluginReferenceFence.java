package com.openlap.plugins.management;

import com.mongodb.DBRef;
import com.openlap.infrastructure.exception.ConflictException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;

/** Durable per-write reservations: failed/uncertain writes block removal rather than losing references. */
public class PluginReferenceFence {
  private final MongoTemplate mongo;
  private final PluginReferences references = new PluginReferences();
  private final PluginCatalogVisibility visibility;

  public PluginReferenceFence(MongoTemplate mongo) { this.mongo = mongo; visibility = new PluginCatalogVisibility(mongo); }

  public void beforeSave(Document document, String collection) {
    if (!PluginReferences.COLLECTIONS.contains(collection)) return;
    Document checked = document;
    Document target = document.get("replacementTarget", Document.class);
    if ("plugin-installation".equals(collection) && target != null && Boolean.TRUE.equals(target.getBoolean("removed"))) {
      // A new binary may use an archived predecessor's metadata without resurrecting its runtime IDs.
      checked = new Document(document); checked.remove("replacementTarget"); checked.remove("replacement");
    }
    Set<String> ids = references.collect(checked);
    Map<String, List<Document>> catalog = new HashMap<>();
    for (PluginCatalogKind kind : PluginCatalogKind.values()) {
      for (Document row : mongo.getCollection(kind.collection).find().projection(new Document("_id", 1)
          .append("installationId", 1).append("visualizationLib", 1).append("removalState", 1).append("removalOperation", 1))) {
        Document ref = new Document("kind", kind.name()).append("rawId", row.get("_id"))
            .append("installationId", row.get("installationId")).append("parent", row.get("visualizationLib"))
            .append("removalState", row.get("removalState")).append("removalOperation", row.get("removalOperation"));
        catalog.computeIfAbsent(row.get("_id").toString(), ignored -> new ArrayList<>()).add(ref);
      }
    }
    Map<String, Document> selected = new LinkedHashMap<>();
    for (String id : ids) for (Document ref : catalog.getOrDefault(id, Collections.emptyList())) {
      selected.put(ref.getString("kind") + ":" + id, ref);
      if (ref.get("parent") instanceof DBRef) {
        String parent = ((DBRef) ref.get("parent")).getId().toString();
        for (Document library : catalog.getOrDefault(parent, Collections.emptyList())) if (PluginCatalogKind.VISUALIZATION_LIBRARY.name().equals(library.getString("kind"))) selected.put(library.getString("kind") + ":" + parent, library);
      }
    }
    String token = UUID.randomUUID().toString();
    List<Document> pins = new ArrayList<>();
    Document marker = new Document("token", token).append("pins", pins).append("collection", collection).append("sourceId", document.get("_id"));
    try {
      for (Document ref : selected.values()) {
        visibility.requireInstalled(ref.getString("installationId"));
        visibility.requireRecordAvailable(ref);
        PluginCatalogKind kind = PluginCatalogKind.valueOf(ref.getString("kind"));
        pins.add(new Document("collection", kind.collection).append("rawId", ref.get("rawId")));
        Document pin = new Document("createdAt", new Date()).append("sourceCollection", collection).append("sourceId", document.get("_id"));
        if (mongo.getCollection(kind.collection).updateOne(new Document("_id", ref.get("rawId")).append("removalState", ref.get("removalState"))
                .append("removalOperation", ref.get("removalOperation")),
            new Document("$set", new Document("referencePins." + token, pin))).getMatchedCount() != 1) {
          throw new ConflictException("PLUGIN_REMOVED", "A selected plugin was removed or is being removed. Refresh the catalog and choose an available version before saving.");
        }
      }
      if ("plugin-installation".equals(collection) && document.getString("artifactId") != null) {
        Document artifact = new Document("collection", "plugin-artifact").append("rawId", document.getString("artifactId"));
        pins.add(artifact);
        if (mongo.getCollection("plugin-artifact").updateOne(new Document("_id", artifact.get("rawId")).append("state", "READY"),
            new Document("$set", new Document("referencePins." + token, new Document("createdAt", new Date()).append("sourceCollection", collection)))).getMatchedCount() != 1) {
          throw new ConflictException("PLUGIN_ARTIFACT_NOT_READY", "This artifact is not available for installation. Retry after storage recovery.");
        }
      }
      if (!pins.isEmpty()) document.put("_pluginReferenceWrite", marker);
    } catch (RuntimeException error) {
      // The source write has not started while BeforeSave is running, so these reservations can be released.
      release(marker);
      throw error;
    }
  }

  public void afterSave(Document document) {
    Document marker = document.get("_pluginReferenceWrite", Document.class);
    if (marker != null) release(marker);
  }

  private void release(Document marker) {
    @SuppressWarnings("unchecked") List<Document> pins = (List<Document>) marker.get("pins");
    for (Document ref : pins) {
      try { mongo.getCollection(ref.getString("collection")).updateOne(new Document("_id", ref.get("rawId")),
          new Document("$unset", new Document("referencePins." + marker.getString("token"), 1))); }
      catch (RuntimeException error) { org.slf4j.LoggerFactory.getLogger(getClass()).warn("Could not release a plugin reference reservation; removal remains blocked."); }
    }
  }
}
