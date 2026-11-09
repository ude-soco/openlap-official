package com.openlap.plugins.management;

import com.mongodb.DBRef;
import com.openlap.infrastructure.exception.ConflictException;
import com.openlap.infrastructure.exception.NotFoundException;
import com.openlap.infrastructure.exception.ValidationException;
import java.util.Arrays;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.Map;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

/** Atomic field updates preserve legacy IDs, unknown fields, artifact identities and indicator links. */
@Component
public class PluginCatalogEditor {
  private final MongoTemplate mongo;
  private final PluginCatalogVisibility visibility;

  public PluginCatalogEditor(MongoTemplate mongo) {
    this.mongo = mongo;
    this.visibility = new PluginCatalogVisibility(mongo);
  }

  public Document read(PluginCatalogKind kind, String id) {
    if (id == null || id.trim().isEmpty() || id.length() > 160) throw new ValidationException("Invalid catalog identifier.");
    Document row = mongo.getCollection(kind.collection).find(new Document("_id", id)).first();
    if (row == null && ObjectId.isValid(id)) row = mongo.getCollection(kind.collection).find(new Document("_id", new ObjectId(id))).first();
    if (row == null) throw new NotFoundException("Plugin catalog entry not found.");
    visibility.requireInstalled(row.getString("installationId"));
    return row;
  }

  public Map<String, Object> details(PluginCatalogKind kind, String id) {
    Document row = read(kind, id);
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("id", row.get("_id").toString());
    result.put("kind", kind.name());
    for (String field : Arrays.asList("name", "description", "creator", "implementingClass", "type", "artifactId", "installationId", "pluginFamilyId", "previousId")) {
      result.put(field, row.get(field));
    }
    result.put("version", revision(row));
    result.put("enabled", enabled(row));
    result.put("editableFields", kind.editableFields);
    if (kind == PluginCatalogKind.VISUALIZATION_TYPE) {
      Object parent = row.get("visualizationLib");
      if (parent instanceof DBRef) {
        Document library = read(PluginCatalogKind.VISUALIZATION_LIBRARY, ((DBRef) parent).getId().toString());
        result.put("libraryId", library.get("_id").toString());
        result.put("library", library.getString("name"));
        result.put("creator", library.get("creator"));
        result.put("artifactId", library.get("artifactId"));
      }
    }
    return result;
  }

  public Map<String, Object> edit(PluginCatalogKind kind, String id, Map<String, Object> request) {
    if (request == null) throw new ValidationException("Supply plugin details and the current version.");
    for (String field : request.keySet()) {
      if (!"version".equals(field) && !kind.editableFields.contains(field)) throw new ValidationException("This field cannot be edited: " + field);
    }
    long version = requireVersion(request.get("version"));
    Document current = read(kind, id);
    Document fields = new Document();
    for (String field : kind.editableFields) {
      if (!request.containsKey(field)) continue;
      Object value = request.get(field);
      if (!(value instanceof String)) throw new ValidationException("Enter text for " + field + ".");
      String text = ((String) value).trim();
      int max = "description".equals(field) ? 10000 : 300;
      if (("name".equals(field) && text.isEmpty()) || text.length() > max || text.indexOf('\0') >= 0) {
        throw new ValidationException("Use a nonempty name up to 300 characters, creator up to 300 and description up to 10000.");
      }
      fields.put(field, text);
    }
    if (fields.isEmpty()) throw new ValidationException("Supply at least one editable field.");
    // Library names identify a version family in the UI; a rename cannot collide with another family.
    if (kind == PluginCatalogKind.VISUALIZATION_LIBRARY && fields.containsKey("name")) {
      for (Document other : mongo.getCollection(kind.collection).find(new Document("name", fields.get("name")))) {
        if (!family(kind, current).equals(family(kind, other))) throw conflict("Another visualization library already uses this name.");
      }
    }
    fields.put("detailsUpdatedAt", new Date());
    fields.put("managementVersion", version + 1);
    if (mongo.getCollection(kind.collection).updateOne(versionPredicate(current, version),
        new Document("$set", fields)).getMatchedCount() != 1) {
      throw conflict("These plugin details changed. Reload the latest version before saving your edits.");
    }
    return details(kind, id);
  }

  /** Status mutations increment the same revision so they cannot be overwritten by a stale editor. */
  public void setEnabled(PluginCatalogKind kind, String id, boolean enabled) {
    for (int attempt = 0; attempt < 3; attempt++) {
      Document row = read(kind, id);
      long version = revision(row);
      if (mongo.getCollection(kind.collection).updateOne(versionPredicate(row, version),
          new Document("$set", new Document("enabled", enabled).append("managementVersion", version + 1))).getMatchedCount() == 1) return;
    }
    throw conflict("This plugin changed repeatedly. Refresh before changing its status.");
  }

  public static long revision(Document row) {
    Object version = row.get("managementVersion");
    return version instanceof Number ? ((Number) version).longValue() : 0L;
  }

  public static boolean enabled(Document row) { return !Boolean.FALSE.equals(row.get("enabled")); }

  public static Document versionPredicate(Document row, long expected) {
    Document query = new Document("_id", row.get("_id"));
    if (expected == 0) query.append("$or", Arrays.asList(new Document("managementVersion", 0L), new Document("managementVersion", null)));
    else query.append("managementVersion", expected);
    return query;
  }

  public static long requireVersion(Object value) {
    if (!(value instanceof Number) || ((Number) value).longValue() < 0
        || ((Number) value).doubleValue() != ((Number) value).longValue()) throw new ValidationException("Supply the current integer version.");
    return ((Number) value).longValue();
  }

  public static String family(PluginCatalogKind kind, Document row) {
    if (row.getString("pluginFamilyId") != null) return row.getString("pluginFamilyId");
    return kind == PluginCatalogKind.ANALYTICS_METHOD && row.getString("artifactId") != null
        ? row.getString("artifactId") : row.get("_id").toString();
  }

  private static ConflictException conflict(String message) { return new ConflictException("PLUGIN_DETAILS_CONFLICT", message); }
}
