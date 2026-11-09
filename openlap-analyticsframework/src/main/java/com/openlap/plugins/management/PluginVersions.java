package com.openlap.plugins.management;

import com.mongodb.DBRef;
import com.openlap.infrastructure.exception.ConflictException;
import com.openlap.infrastructure.exception.ValidationException;
import com.openlap.plugins.artifacts.PluginKind;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;

/** Immutable replacement snapshots and version families; original catalog IDs are never rebound. */
public class PluginVersions {
  private final MongoTemplate mongo;
  private final PluginCatalogEditor editor;
  private final PluginCatalogVisibility visibility;

  public PluginVersions(MongoTemplate mongo) {
    this.mongo = mongo; editor = new PluginCatalogEditor(mongo); visibility = new PluginCatalogVisibility(mongo);
  }

  public Document target(PluginCatalogKind kind, String id) {
    if (kind == PluginCatalogKind.VISUALIZATION_TYPE) throw new ValidationException("Upload a chart's new version through its visualization library.");
    Document selected = editor.read(kind, id);
    String artifact = selected.getString("artifactId");
    if (artifact == null) throw conflict("Migrate this plugin's existing artifact before uploading a replacement.");
    String family = PluginCatalogEditor.family(kind, selected);
    List<Document> rows = new ArrayList<>();
    if (kind == PluginCatalogKind.ANALYTICS_METHOD) {
      for (Document row : mongo.getCollection(kind.collection).find(new Document("artifactId", artifact))) if (installed(row)) rows.add(snapshot(row));
    } else {
      for (Document row : mongo.getCollection("visualization-type").find(new Document("visualizationLib", new DBRef(kind.collection, selected.get("_id"))))) {
        if (installed(row)) rows.add(snapshot(row));
      }
    }
    rows.sort(Comparator.comparing(row -> row.getString("id")));
    if (rows.isEmpty() || rows.size() > 64) throw conflict("The existing plugin needs a complete catalog of 1–64 entries before replacement.");
    return new Document("kind", kind.name()).append("targetId", id).append("familyId", family)
        .append("previousArtifactId", artifact).append("entries", rows)
        .append("library", kind == PluginCatalogKind.VISUALIZATION_LIBRARY ? snapshot(selected) : null)
        .append("latest", !hasSuccessor(family, artifact));
  }

  public Document plan(Document operation, Map<String, Object> request) {
    Document selected = operation.get("replacementTarget", Document.class);
    if (selected == null) throw conflict("Start Upload new version from an installed plugin.");
    Document current = target(PluginCatalogKind.valueOf(selected.getString("kind")), selected.getString("targetId"));
    requireLatest(current);
    if (!Objects.equals(current.get("familyId"), selected.get("familyId"))
        || !Objects.equals(current.get("previousArtifactId"), selected.get("previousArtifactId"))) throw conflict("The replacement source changed. Start a new review.");
    Map<?, ?> expected = map(request.get("expectedVersions"), "Supply the reviewed versions for every existing entry.");
    List<Document> all = sourceRows(current);
    if (!expected.keySet().equals(all.stream().map(row -> row.getString("id")).collect(Collectors.toSet()))) throw conflict("Review every existing entry before saving the replacement mapping.");
    for (Document row : all) if (PluginCatalogEditor.requireVersion(expected.get(row.getString("id"))) != ((Number) row.get("version")).longValue()) {
      throw conflict("An existing entry changed. Refresh its details before reviewing the mapping again.");
    }
    Map<?, ?> mappings = map(request.get("mappings"), "Map each old entry to a new class or explicitly choose no replacement.");
    List<Document> old = documents(current, "entries");
    if (!mappings.keySet().equals(old.stream().map(row -> row.getString("id")).collect(Collectors.toSet()))) throw new ValidationException("Map every old entry exactly once.");
    Set<String> available = new HashSet<>(strings(operation, "classes"));
    Set<String> used = new HashSet<>();
    Document canonical = new Document();
    for (Document row : old) {
      Object value = mappings.get(row.getString("id"));
      if (value != null && (!(value instanceof String) || !available.contains(value) || !used.add((String) value))) {
        throw new ValidationException("Each mapped class must exist in the new JAR and can replace only one old entry.");
      }
      canonical.put(row.getString("id"), value);
    }
    current.remove("latest"); current.put("mappings", canonical);
    return current;
  }

  public void validateBeforeActivation(Document operation, boolean checkMetadata) {
    if (operation.get("replacementTarget") == null) return;
    Document plan = operation.get("replacement", Document.class);
    if (plan == null) throw conflict("Review and save the old-to-new entry mapping before activation.");
    requireLatest(plan);
    if (checkMetadata) {
      Document current = target(PluginCatalogKind.valueOf(plan.getString("kind")), plan.getString("targetId"));
      if (!documents(plan, "entries").equals(documents(current, "entries")) || !Objects.equals(plan.get("library"), current.get("library"))) {
        throw conflict("Existing details or status changed. Refresh and save the replacement mapping again.");
      }
    }
  }

  public void requireNewBinary(Document target, String artifact) {
    requireLatest(target);
    if (artifact.equals(target.getString("previousArtifactId"))) throw conflict("Choose different JAR bytes for a new version.");
    for (Document row : versionRows(PluginCatalogKind.valueOf(target.getString("kind")), target)) {
      if (artifact.equals(row.getString("artifactId"))) throw conflict("These bytes already exist in this plugin's history. Use that installed version instead.");
    }
  }

  public List<String> conflicts(Document operation) {
    PluginKind kind = PluginKind.valueOf(operation.getString("kind"));
    Document context = operation.get("replacementTarget", Document.class);
    String family = context == null ? null : context.getString("familyId");
    String collection = kind == PluginKind.ANALYTICS ? "analytics-technique" : "visualization-type";
    List<String> conflicts = new ArrayList<>();
    for (String name : strings(operation, "classes")) {
      for (Document row : mongo.getCollection(collection).find(new Document("implementingClass", name))) {
        if (operation.getString("_id").equals(row.getString("installationId"))) continue;
        if (family != null && family.equals(rowFamily(kind == PluginKind.ANALYTICS ? PluginCatalogKind.ANALYTICS_METHOD : PluginCatalogKind.VISUALIZATION_TYPE, row))) continue;
        conflicts.add("Already installed: " + name + ". Use Upload new version for that plugin family."); break;
      }
    }
    Document inspection = operation.get("inspection", Document.class);
    if (kind == PluginKind.VISUALIZATION && inspection != null) {
      Document plan = operation.get("replacement", Document.class);
      String name = plan == null ? inspection.get("library", Document.class).getString("name") : plan.get("library", Document.class).getString("name");
      for (Document row : mongo.getCollection("visualization-library").find(new Document("name", name))) {
        if (operation.getString("_id").equals(row.getString("installationId"))) continue;
        if (family != null && family.equals(PluginCatalogEditor.family(PluginCatalogKind.VISUALIZATION_LIBRARY, row))) continue;
        conflicts.add("A visualization library named " + name + " belongs to another plugin family."); break;
      }
    }
    return conflicts;
  }

  public void decorate(Document operation, PluginCatalogKind kind, Document row) {
    String artifact = operation.getString("artifactId");
    Document plan = operation.get("replacement", Document.class);
    boolean modern = plan != null || Integer.valueOf(2).equals(operation.get("catalogSchema"));
    if (!modern) return; // Retain the exact immutable payload of phase 4 interrupted installations.
    String family = kind == PluginCatalogKind.ANALYTICS_METHOD ? artifact : row.get("_id").toString();
    if (kind == PluginCatalogKind.VISUALIZATION_TYPE) family = libraryCatalogId(operation);
    row.put("pluginFamilyId", plan == null ? family : plan.getString("familyId"));
    row.put("managementVersion", 0L);
    if (plan == null) return;
    Document previous = kind == PluginCatalogKind.VISUALIZATION_LIBRARY ? plan.get("library", Document.class) : null;
    if (kind != PluginCatalogKind.VISUALIZATION_LIBRARY) {
      Document mappings = plan.get("mappings", Document.class);
      for (Document old : documents(plan, "entries")) if (Objects.equals(row.get("implementingClass"), mappings.get(old.getString("id")))) previous = old;
    }
    if (previous == null) return;
    row.put("previousId", previous.getString("id"));
    row.put("enabled", previous.getBoolean("enabled"));
    for (String field : kind.editableFields) row.put(field, previous.get(field) == null ? "" : previous.get(field));
  }

  public Map<String, Object> history(PluginCatalogKind kind, String id) {
    if (kind == PluginCatalogKind.VISUALIZATION_TYPE) {
      Document row = editor.read(kind, id);
      DBRef library = (DBRef) row.get("visualizationLib");
      kind = PluginCatalogKind.VISUALIZATION_LIBRARY; id = library.getId().toString();
    }
    Document selected = editor.read(kind, id);
    Document context = new Document("familyId", PluginCatalogEditor.family(kind, selected))
        .append("previousArtifactId", selected.getString("artifactId")).append("kind", kind.name());
    List<Document> rows = versionRows(kind, context);
    Map<String, Document> versions = new LinkedHashMap<>();
    for (Document row : rows) {
      String artifact = row.getString("artifactId");
      String key = artifact == null ? "legacy-" + row.get("_id") : artifact;
      Document version = versions.computeIfAbsent(key, ignored -> new Document("artifactId", artifact).append("entries", new ArrayList<>())
          .append("selected", Objects.equals(artifact, selected.getString("artifactId"))));
      @SuppressWarnings("unchecked") List<Document> entries = (List<Document>) version.get("entries");
      entries.add(snapshot(row));
      if (row.getString("installationId") != null) {
        Document installation = mongo.getCollection("plugin-installation").find(new Document("_id", row.getString("installationId"))).first();
        if (installation != null) { version.put("activatedAt", installation.get("activatedAt")); version.put("filename", installation.get("filename")); }
      }
    }
    List<Document> ordered = new ArrayList<>(versions.values());
    ordered.sort(Comparator.comparingLong(version -> version.get("activatedAt") instanceof java.util.Date
        ? version.getDate("activatedAt").getTime() : 0L));
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("kind", kind.name()); result.put("familyId", context.getString("familyId")); result.put("versions", ordered);
    result.put("latest", selected.getString("artifactId") == null || !hasSuccessor(context.getString("familyId"), selected.getString("artifactId")));
    return result;
  }

  public List<Document> retirementTargets(Document operation) {
    Document plan = operation.get("replacement", Document.class);
    if (plan == null) return Collections.emptyList();
    PluginCatalogKind kind = PluginCatalogKind.valueOf(plan.getString("kind"));
    List<Document> source = kind == PluginCatalogKind.ANALYTICS_METHOD ? documents(plan, "entries") : Collections.singletonList(plan.get("library", Document.class));
    List<Document> result = new ArrayList<>();
    for (Document old : source) {
      Document current = editor.read(kind, old.getString("id"));
      result.add(snapshot(current));
    }
    return result;
  }

  public void retire(Document operation, Map<String, Object> expected) {
    if (!"ACTIVE".equals(operation.getString("state")) || operation.get("replacement") == null) throw conflict("Activate the replacement successfully before disabling the previous version.");
    List<Document> targets = retirementTargets(operation).stream().filter(row -> row.getBoolean("enabled")).collect(Collectors.toList());
    if (!expected.keySet().equals(targets.stream().map(row -> row.getString("id")).collect(Collectors.toSet()))) throw conflict("Previous statuses changed. Refresh before disabling the previous version.");
    PluginCatalogKind kind = PluginCatalogKind.valueOf(operation.get("replacement", Document.class).getString("kind"));
    for (Document row : targets) if (PluginCatalogEditor.requireVersion(expected.get(row.getString("id"))) != ((Number) row.get("version")).longValue()) throw conflict("Previous details or statuses changed. Refresh before disabling them.");
    for (Document row : targets) {
      Document current = editor.read(kind, row.getString("id"));
      long version = PluginCatalogEditor.requireVersion(expected.get(row.getString("id")));
      if (mongo.getCollection(kind.collection).updateOne(PluginCatalogEditor.versionPredicate(current, version),
          new Document("$set", new Document("enabled", false).append("managementVersion", version + 1))).getMatchedCount() != 1) {
        throw conflict("A previous entry changed while disabling entries. The new version remains active; refresh and retry the remaining entries.");
      }
    }
  }

  private boolean hasSuccessor(String family, String artifact) {
    return mongo.getCollection("plugin-installation").find(new Document("state", "ACTIVE")
        .append("replacement.familyId", family).append("replacement.previousArtifactId", artifact)).first() != null;
  }

  private void requireLatest(Document context) {
    if (hasSuccessor(context.getString("familyId"), context.getString("previousArtifactId"))) throw conflict("A newer version already exists. Start Upload new version from the latest version in History.");
  }

  private List<Document> versionRows(PluginCatalogKind kind, Document context) {
    List<Document> result = new ArrayList<>();
    Document query = new Document("$or", Arrays.asList(new Document("pluginFamilyId", context.getString("familyId")),
        new Document("artifactId", context.getString("familyId")), idQuery(context.getString("familyId"))));
    for (Document row : mongo.getCollection(kind.collection).find(query)) if (installed(row)) result.add(row);
    return result;
  }

  private String rowFamily(PluginCatalogKind kind, Document row) {
    if (kind != PluginCatalogKind.VISUALIZATION_TYPE) return PluginCatalogEditor.family(kind, row);
    if (row.getString("pluginFamilyId") != null) return row.getString("pluginFamilyId");
    if (!installed(row)) return null;
    Object parent = row.get("visualizationLib");
    if (!(parent instanceof DBRef)) return null;
    return PluginCatalogEditor.family(PluginCatalogKind.VISUALIZATION_LIBRARY, editor.read(PluginCatalogKind.VISUALIZATION_LIBRARY, ((DBRef) parent).getId().toString()));
  }

  private static Document idQuery(String id) {
    return new Document("_id", org.bson.types.ObjectId.isValid(id)
        ? new Document("$in", Arrays.asList(id, new org.bson.types.ObjectId(id))) : id);
  }

  private boolean installed(Document row) { return visibility.isInstalled(row.getString("installationId")); }

  private static Document snapshot(Document row) {
    Document result = new Document("id", row.get("_id").toString()).append("version", PluginCatalogEditor.revision(row))
        .append("enabled", PluginCatalogEditor.enabled(row));
    for (String field : Arrays.asList("name", "description", "creator", "implementingClass")) result.put(field, row.get(field));
    return result;
  }

  private static List<Document> sourceRows(Document target) {
    List<Document> result = new ArrayList<>(documents(target, "entries"));
    if (target.get("library") != null) result.add(target.get("library", Document.class));
    return result;
  }

  @SuppressWarnings("unchecked") private static List<Document> documents(Document row, String key) { return (List<Document>) row.get(key); }
  @SuppressWarnings("unchecked") private static List<String> strings(Document row, String key) { return (List<String>) row.get(key); }
  private static Map<?, ?> map(Object value, String message) { if (!(value instanceof Map<?, ?>)) throw new ValidationException(message); return (Map<?, ?>) value; }
  private static String libraryCatalogId(Document operation) { return PluginManagementService.catalogId(operation.getString("_id"), "library"); }
  private static ConflictException conflict(String message) { return new ConflictException("PLUGIN_REPLACEMENT_CONFLICT", message); }
}
