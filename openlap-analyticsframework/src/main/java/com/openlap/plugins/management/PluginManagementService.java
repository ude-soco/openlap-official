package com.openlap.plugins.management;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mongodb.DBRef;
import com.openlap.configurations.Utils;
import com.openlap.infrastructure.exception.ConflictException;
import com.openlap.infrastructure.exception.NotFoundException;
import com.openlap.infrastructure.exception.ValidationException;
import com.openlap.plugins.PluginJarFiles;
import com.openlap.plugins.artifacts.ArtifactIntegrity;
import com.openlap.plugins.artifacts.PluginArtifact;
import com.openlap.plugins.artifacts.PluginArtifactCache;
import com.openlap.plugins.artifacts.PluginArtifactRegistry;
import com.openlap.plugins.artifacts.PluginKind;
import com.openlap.plugins.artifacts.PluginStorageProperties;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.bson.Document;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.web.multipart.MultipartFile;

/** Persisted upload/review/activation workflow. No transactions or local mutable JAR paths required. */
public class PluginManagementService {
  private static final String OPERATIONS = "plugin-installation";
  private static final String LOCKS = "plugin-management-lock";
  private static final String LOCK_ID = "catalog-activation";
  private final MongoTemplate mongo;
  private final PluginStorageProperties properties;
  private final PluginArtifactRegistry registry;
  private final PluginArtifactCache cache;
  private final PluginInspector inspector = new PluginInspector();
  private final ObjectMapper mapper = new ObjectMapper();

  public PluginManagementService(MongoTemplate mongo, PluginStorageProperties properties,
      PluginArtifactRegistry registry, PluginArtifactCache cache) {
    this.mongo = mongo;
    this.properties = properties;
    this.registry = registry;
    this.cache = cache;
  }

  public boolean available() { return properties.getMode() == PluginStorageProperties.Mode.S3 && registry != null && cache != null; }

  public List<Map<String, Object>> recent(PluginKind kind) {
    Query query = Query.query(Criteria.where("kind").is(kind.name()))
        .with(Sort.by(Sort.Direction.DESC, "createdAt")).limit(50);
    for (String field : Arrays.asList("filename", "kind", "state", "version", "createdAt")) query.fields().include(field);
    return mongo.find(query, Document.class, OPERATIONS).stream().map(this::summary).collect(Collectors.toList());
  }

  public Map<String, Object> get(String id) { return response(operation(id)); }

  public Map<String, Object> upload(PluginKind kind, MultipartFile upload, String actor) throws IOException {
    requireAvailable();
    if (upload == null) throw new ValidationException("Choose a JAR file.");
    String filename = Utils.requireSafeJarFileName(upload.getOriginalFilename());
    if (filename.length() > 255) throw new ValidationException("Use a JAR filename of at most 255 characters.");
    Path staging = Files.createTempDirectory("openlap-plugin-review-");
    Path source = staging.resolve("upload.jar");
    try {
      PluginJarFiles.saveNew(upload, source);
      PluginInspection discovery = inspector.discover(kind, source);
      PluginArtifact artifact = registry.ensureStored(kind, source, ArtifactIntegrity.sha256(source), Files.size(source), actor);
      Document operation = new Document("_id", artifact.getId()).append("artifactId", artifact.getId())
          .append("kind", kind.name()).append("filename", filename).append("sha256", artifact.getSha256())
          .append("sizeBytes", artifact.getSizeBytes()).append("state", "UPLOADED").append("version", 0L)
          .append("classes", discovery.getClasses()).append("libraryClass", discovery.getLibraryClass())
          .append("createdAt", new Date()).append("createdBy", actor);
      try { mongo.insert(operation, OPERATIONS); }
      catch (DuplicateKeyException e) { return get(artifact.getId()); }
      return response(operation);
    } finally {
      Files.deleteIfExists(source);
      Files.deleteIfExists(staging);
    }
  }

  public Map<String, Object> inspect(String id, Long version, boolean trusted) throws IOException {
    requireAvailable();
    if (!trusted) throw new ValidationException("Confirm that you trust the plugin code before contract inspection.");
    Document before = operation(id);
    String state = before.getString("state");
    if (!("UPLOADED".equals(state) || "INSPECTION_FAILED".equals(state) || ("INSPECTING".equals(state)
        && before.getDate("inspectionStartedAt").toInstant().isBefore(Instant.now().minusSeconds(600))))) {
      throw conflict("Inspection is already running or finished. Refresh the review to see its current state.");
    }
    String claim = UUID.randomUUID().toString();
    Document started = mongo.findAndModify(versionQuery(id, version).addCriteria(Criteria.where("state").is(state)),
        new Update().set("state", "INSPECTING").set("inspectionClaim", claim).set("inspectionStartedAt", new Date())
            .unset("lastError").inc("version", 1), FindAndModifyOptions.options().returnNew(true), Document.class, OPERATIONS);
    if (started == null) throw conflict("The review changed. Refresh before continuing.");
    Query owned = Query.query(Criteria.where("_id").is(id).and("state").is("INSPECTING").and("inspectionClaim").is(claim));
    try {
      PluginKind kind = PluginKind.valueOf(started.getString("kind"));
      Path jar = cache.resolve(registry.ready(id, kind));
      PluginInspection inspection = inspector.inspect(kind, jar);
      Document review = Document.parse(mapper.writeValueAsString(inspection));
      if (mongo.updateFirst(owned, new Update().set("inspection", review).set("state", "INSPECTED")
          .set("inspectedAt", new Date()).unset("inspectionClaim").inc("version", 1), OPERATIONS).getMatchedCount() != 1) {
        throw conflict("A newer inspection owns this review. Refresh before continuing.");
      }
    } catch (RuntimeException | IOException | LinkageError | AssertionError error) {
      String message = error instanceof com.openlap.infrastructure.exception.OpenLapException
          ? error.getMessage() : "Contract inspection failed; no entries were activated.";
      mongo.updateFirst(owned, new Update().set("state", "INSPECTION_FAILED").set("lastError", message)
          .unset("inspectionClaim").inc("version", 1), OPERATIONS);
      if (error instanceof LinkageError || error instanceof AssertionError) throw new ValidationException("INVALID_PLUGIN_CONTRACT", message);
      throw error;
    }
    return get(id);
  }

  public Map<String, Object> activate(String id, Long version) {
    requireAvailable();
    Document before = operation(id);
    if ("ACTIVE".equals(before.getString("state"))) return response(before);
    String state = before.getString("state");
    if (!("INSPECTED".equals(state) || "ACTIVATING".equals(state))) throw conflict("Inspect the complete plugin contract before activation.");
    if (mongo.updateFirst(versionQuery(id, version).addCriteria(Criteria.where("state").is(state)),
        new Update().set("state", "ACTIVATING").inc("version", 1).unset("lastError"), OPERATIONS).getMatchedCount() != 1) {
      throw conflict("The review changed. Refresh before activation.");
    }
    boolean ownsLock = false;
    boolean writing = false;
    String activationClaim = UUID.randomUUID().toString();
    try {
      acquireLock(id, activationClaim);
      ownsLock = true;
      Document operation = operation(id);
      if ("ACTIVE".equals(operation.getString("state"))) return response(operation);
      List<String> conflicts = conflicts(operation);
      if (!conflicts.isEmpty()) throw conflict(String.join(" ", conflicts));
      PluginKind kind = PluginKind.valueOf(operation.getString("kind"));
      // Warm and verify this backend too before publishing; no constructors are run here.
      Path jar = cache.resolve(registry.ready(id, kind));
      PluginInspection discovered = inspector.discover(kind, jar);
      if (!discovered.getClasses().equals(list(operation, "classes", String.class))) throw conflict("Artifact discovery changed. Inspect again.");
      List<CatalogRow> rows = catalogRows(operation);
      writing = true;
      for (CatalogRow row : rows) {
        Update insert = new Update();
        row.document.forEach((field, value) -> { if (!"_id".equals(field)) insert.setOnInsert(field, value); });
        mongo.upsert(Query.query(Criteria.where("_id").is(row.document.get("_id")).and("installationId").is(id)),
            insert, row.collection);
      }
      for (CatalogRow row : rows) {
        Document actual = mongo.findById(row.document.get("_id"), Document.class, row.collection);
        if (actual == null || row.document.entrySet().stream().anyMatch(field -> !java.util.Objects.equals(actual.get(field.getKey()), field.getValue()))) {
          throw conflict("An installation entry changed. Keep it inactive and retry activation.");
        }
      }
      mongo.updateFirst(Query.query(Criteria.where("_id").is(id).and("state").is("ACTIVATING")),
          new Update().set("state", "ACTIVE").set("activatedAt", new Date()).inc("version", 1).unset("lastError"), OPERATIONS);
      return get(id);
    } finally {
      if (ownsLock) {
        Query owned = Query.query(Criteria.where("_id").is(LOCK_ID).and("owner").is(id).and("claim").is(activationClaim));
        // After a partial write, retain ownership for this installation but release the
        // attempt so an explicit retry can resume. Crashed attempts expire after 10 minutes.
        if (!writing || "ACTIVE".equals(operation(id).getString("state"))) mongo.remove(owned, LOCKS);
        else mongo.updateFirst(owned, Update.update("running", false), LOCKS);
      }
    }
  }

  private void acquireLock(String id, String claim) {
    for (int attempt = 0; attempt < 3; attempt++) {
      try {
        mongo.insert(new Document("_id", LOCK_ID).append("owner", id).append("claim", claim)
            .append("running", true).append("startedAt", new Date()), LOCKS);
        return;
      }
      catch (DuplicateKeyException e) {
        Document lock = mongo.findById(LOCK_ID, Document.class, LOCKS);
        if (lock == null) continue;
        String owner = lock.getString("owner");
        if (id.equals(owner)) {
          if (Boolean.TRUE.equals(lock.getBoolean("running"))
              && !lock.getDate("startedAt").toInstant().isBefore(Instant.now().minusSeconds(600))) {
            throw conflict("Activation is in progress. Refresh its result; a crashed activation can be resumed after 10 minutes.");
          }
          Query previous = Query.query(Criteria.where("_id").is(LOCK_ID).and("owner").is(id).and("claim").is(lock.get("claim")));
          if (mongo.updateFirst(previous, new Update().set("claim", claim).set("running", true).set("startedAt", new Date()), LOCKS).getMatchedCount() == 1) return;
          continue;
        }
        // Recover a crash between the atomic ACTIVE commit and lock cleanup.
        if (mongo.exists(Query.query(Criteria.where("_id").is(owner).and("state").is("ACTIVE")), OPERATIONS)) {
          mongo.remove(Query.query(Criteria.where("_id").is(LOCK_ID).and("owner").is(owner).and("claim").is(lock.get("claim"))), LOCKS);
          continue;
        }
        throw conflict("Another plugin activation must finish first. Resume it from the recent uploads list.");
      }
    }
    throw conflict("Another activation changed the catalog. Refresh and retry.");
  }

  private List<String> conflicts(Document operation) {
    List<String> conflicts = new ArrayList<>();
    PluginKind kind = PluginKind.valueOf(operation.getString("kind"));
    String collection = kind == PluginKind.ANALYTICS ? "analytics-technique" : "visualization-type";
    for (String name : list(operation, "classes", String.class)) {
      if (mongo.exists(Query.query(Criteria.where("implementingClass").is(name)
          .and("installationId").ne(operation.getString("_id"))), collection)) {
        conflicts.add("Already installed: " + name + ". Replacement versions are not available in this workflow yet.");
      }
    }
    Document inspection = operation.get("inspection", Document.class);
    if (kind == PluginKind.VISUALIZATION && inspection != null) {
      String name = inspection.get("library", Document.class).getString("name");
      if (mongo.exists(Query.query(Criteria.where("name").is(name).and("installationId").ne(operation.getString("_id"))), "visualization-library")) {
        conflicts.add("A visualization library named " + name + " is already installed.");
      }
    }
    return conflicts;
  }

  private List<CatalogRow> catalogRows(Document operation) {
    String id = operation.getString("_id");
    PluginKind kind = PluginKind.valueOf(operation.getString("kind"));
    Document inspection = operation.get("inspection", Document.class);
    if (inspection == null) throw conflict("The inspected contract is missing. No entries were activated.");
    List<CatalogRow> rows = new ArrayList<>();
    String libraryId = catalogId(id, "library");
    List<Document> entries = list(inspection, "entries", Document.class);
    for (Document entry : entries) {
      String className = entry.getString("implementingClass");
      Document row = new Document("_id", catalogId(id, className)).append("installationId", id)
          .append("enabled", true).append("name", entry.getString("name")).append("implementingClass", className);
      if (kind == PluginKind.ANALYTICS) {
        for (String field : Arrays.asList("creator", "description", "type", "outputs")) row.append(field, entry.get(field));
        row.append("fileName", operation.getString("filename")).append("artifactId", id);
      } else {
        row.append("visualizationLib", new DBRef("visualization-library", libraryId))
            .append("chartConfiguration", entry.get("chartConfiguration"));
      }
      rows.add(new CatalogRow(kind == PluginKind.ANALYTICS ? "analytics-technique" : "visualization-type", row));
    }
    if (kind == PluginKind.VISUALIZATION) {
      Document library = new Document(inspection.get("library", Document.class));
      library.append("_id", libraryId).append("installationId", id).append("enabled", true)
          .append("artifactId", id).append("frameworkLocation", operation.getString("filename"))
          .append("visualizationTypes", rows.stream().map(row -> new DBRef(row.collection, row.document.get("_id"))).collect(Collectors.toList()));
      rows.add(new CatalogRow("visualization-library", library));
    }
    return rows;
  }

  private Map<String, Object> response(Document operation) {
    Map<String, Object> result = summary(operation);
    result.put("conflicts", "ACTIVE".equals(operation.getString("state")) ? Collections.emptyList() : conflicts(operation));
    return result;
  }

  private Map<String, Object> summary(Document operation) {
    Map<String, Object> result = new LinkedHashMap<>(operation);
    result.put("id", result.remove("_id"));
    result.remove("inspectionClaim");
    return result;
  }

  private Document operation(String id) {
    if (id == null || !id.matches("(analytics|visualizations)-[a-f0-9]{64}")) throw new ValidationException("Invalid plugin upload identifier.");
    Document operation = mongo.findById(id, Document.class, OPERATIONS);
    if (operation == null) throw new NotFoundException("Plugin upload not found.");
    return operation;
  }

  private static Query versionQuery(String id, Long version) {
    if (version == null || version < 0) throw new ValidationException("Supply the current review version.");
    return Query.query(Criteria.where("_id").is(id).and("version").is(version));
  }

  private static <T> List<T> list(Document document, String field, Class<T> type) {
    Object value = document.get(field);
    if (!(value instanceof List<?>)) throw conflict("The persisted plugin review is incomplete. Keep it inactive.");
    return ((List<?>) value).stream().map(type::cast).collect(Collectors.toList());
  }

  private void requireAvailable() {
    if (!available()) throw conflict("Plugin uploads require S3 storage and a completed artifact migration. Contact the deployment maintainer.");
  }

  private static String catalogId(String operation, String entry) {
    try {
      byte[] digest = MessageDigest.getInstance("SHA-256").digest((operation + ":" + entry).getBytes(StandardCharsets.UTF_8));
      StringBuilder result = new StringBuilder("plugin-");
      for (byte b : digest) result.append(String.format("%02x", b & 0xff));
      return result.toString();
    } catch (NoSuchAlgorithmException e) { throw new IllegalStateException("SHA-256 is unavailable."); }
  }

  private static ConflictException conflict(String message) { return new ConflictException("PLUGIN_REVIEW_CONFLICT", message); }

  private static final class CatalogRow {
    final String collection;
    final Document document;
    CatalogRow(String collection, Document document) { this.collection = collection; this.document = document; }
  }
}
