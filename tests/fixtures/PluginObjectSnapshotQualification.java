package com.openlap.plugins.storage;

import com.openlap.plugins.artifacts.PluginArtifact;
import com.openlap.plugins.artifacts.PluginKind;
import com.openlap.plugins.artifacts.S3ArtifactObjectStore;
import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/** Generated application-data fixtures, with no database or executable plugins. */
public final class PluginObjectSnapshotQualification {
  static final String CHECKPOINT = "a".repeat(64);
  static final String SCOPE = "Verified restored database projection only; known code-owned plugin associations, no universal freeform-ID analysis, S3 object bytes, writer freeze, or application recovery verified";
  static void require(boolean okay) { if (!okay) throw new IllegalStateException("Snapshot fixture mismatch."); }
  static byte[] body(String label) throws Exception {
    ByteArrayOutputStream output = new ByteArrayOutputStream();
    try (ZipOutputStream zip = new ZipOutputStream(output)) {
      ZipEntry entry = new ZipEntry("META-INF/synthetic-snapshot"); entry.setTime(0); zip.putNextEntry(entry);
      zip.write(("class-free generated fixture: " + label).getBytes(java.nio.charset.StandardCharsets.US_ASCII)); zip.closeEntry();
    }
    return output.toByteArray();
  }
  static PluginArtifact artifact(String label, PluginKind kind) throws Exception {
    byte[] body = body(label); return PluginArtifact.staged(kind, VersityStorageApplication.hash(body), body.length, "generated-snapshot-fixture");
  }
  static Map<String, Object> registry(String label, PluginKind kind, String state) throws Exception {
    PluginArtifact artifact = artifact(label, kind); Map<String, Object> row = new LinkedHashMap<>();
    row.put("artifactId", artifact.getId()); row.put("kind", kind.name()); row.put("sha256", artifact.getSha256()); row.put("sizeBytes", artifact.getSizeBytes());
    row.put("objectKey", artifact.getObjectKey()); row.put("state", state);
    row.put("presenceRequirement", state.equals("READY") ? "REQUIRED" : state.equals("STAGED") ? "OPTIONAL_STAGED" : "MUST_BE_ABSENT"); return row;
  }
  static void put(S3ArtifactObjectStore store, String label, PluginKind kind) throws Exception {
    Path temporary = Files.createTempFile("snapshot-fixture-", ".jar");
    try { Files.write(temporary, body(label)); store.putIfAbsent(artifact(label, kind), temporary); } finally { Files.delete(temporary); }
  }
  static void prepare(boolean empty) throws Exception {
    VersityStorageApplication.Settings settings = new VersityStorageApplication.Settings(false);
    Map<String, Object> binding = new LinkedHashMap<>(); binding.put("originalCheckpointReportSha256", CHECKPOINT); binding.put("archiveSha256", "b".repeat(64));
    binding.put("checkpointId", "generated-fixture"); binding.put("database", "snapshot_fixture"); binding.put("sourceIdentityMd5", "c".repeat(32));
    binding.put("sourceServerVersion", "4.4.30"); binding.put("restoreServerVersion", "4.4.30"); binding.put("fcv", "4.4"); binding.put("databaseToolsVersion", "100.10.0");
    Map<String, Map<String, Object>> sorted = new TreeMap<>();
    if (!empty) {
      for (Object[] item : new Object[][]{{"older-disabled-ready", PluginKind.ANALYTICS, "READY"}, {"removed-ready", PluginKind.VISUALIZATION, "READY"},
          {"staged-present", PluginKind.ANALYTICS, "STAGED"}, {"staged-absent", PluginKind.VISUALIZATION, "STAGED"}, {"purged-history", PluginKind.ANALYTICS, "PURGED"}}) {
        Map<String, Object> row = registry((String) item[0], (PluginKind) item[1], (String) item[2]); sorted.put((String) row.get("artifactId"), row);
      }
    }
    Map<String, Object> index = new LinkedHashMap<>(); index.put("schemaVersion", 1); index.put("projectionPolicy", "OPENLAP_PLUGIN_ARTIFACT_INDEX_V1");
    index.put("status", "CHECKPOINT_PLUGIN_ARTIFACT_INDEX_VERIFIED"); index.put("binding", binding); index.put("artifacts", new ArrayList<>(sorted.values()));
    // The consumer intentionally preserves this bounded authority projection opaquely.
    index.put("collections", Collections.emptyList()); index.put("associations", Collections.emptyList()); index.put("legacyCatalogEntries", Collections.emptyList());
    index.put("associationIssues", Collections.emptyList()); index.put("summary", Collections.emptyMap()); index.put("associationsResolved", true);
    index.put("readyForS3Export", true); index.put("emptyRegisteredPluginSnapshot", empty); index.put("objectBytesVerified", false); index.put("s3RestoreVerified", false); index.put("scope", SCOPE);
    byte[] bytes = PluginObjectSnapshotApplication.encoded(index);
    Path original = Path.of("/backup/trusted-index.json"), regenerated = Path.of("/backup/regenerated-index.json");
    for (Path path : List.of(original, regenerated)) { Files.createFile(path, PosixFilePermissions.asFileAttribute(PosixFilePermissions.fromString("rw-------"))); Files.write(path, bytes); }
    if (!empty) try (S3ArtifactObjectStore store = S3ArtifactObjectStore.connect(PluginObjectSnapshotApplication.properties(settings, java.net.URI.create(System.getenv("PLUGIN_STORAGE_S3_ENDPOINT"))))) {
      put(store, "older-disabled-ready", PluginKind.ANALYTICS); put(store, "removed-ready", PluginKind.VISUALIZATION);
      put(store, "staged-present", PluginKind.ANALYTICS); put(store, "orphan-not-in-registry", PluginKind.VISUALIZATION);
    }
    Map<String, Object> result = new LinkedHashMap<>(); result.put("artifactIndexSha256", VersityStorageApplication.hash(bytes)); result.put("originalCheckpointReportSha256", CHECKPOINT);
    result.put("expectedObjectCount", empty ? 0 : 4); VersityStorageApplication.result("GENERATED_SNAPSHOT_FIXTURE_PREPARED", result);
  }
  static void validate() throws Exception {
    Path root = Path.of("/backup/export"), original = Path.of("/backup/trusted-index.json"), regenerated = Path.of("/backup/regenerated-index.json");
    String indexHash = VersityStorageApplication.hash(Files.readAllBytes(original));
    byte[] manifestBytes = Files.readAllBytes(root.resolve("snapshot.json")); String manifestHash = VersityStorageApplication.hash(manifestBytes);
    PluginObjectSnapshotApplication.Snapshot snapshot = new PluginObjectSnapshotApplication.Snapshot(root, manifestHash, indexHash, CHECKPOINT, regenerated);
    for (Map.Entry<String, com.fasterxml.jackson.databind.JsonNode> entry : snapshot.index.artifacts.entrySet()) {
      Map<String, Long> changed = new TreeMap<>(snapshot.inventory);
      String state = entry.getValue().path("state").textValue();
      if (state.equals("READY")) changed.remove(entry.getKey());
      else if (state.equals("PURGED")) changed.put(entry.getKey(), entry.getValue().path("sizeBytes").longValue());
      else continue;
      boolean rejected = false;
      try { snapshot.index.inventory(changed); } catch (Exception mismatch) { rejected = true; }
      require(rejected);
    }
    if (!snapshot.rows.isEmpty()) {
      require(snapshot.rows.size() == 4);
      long orphans = snapshot.rows.stream().filter(row -> row.path("classification").textValue().equals("SOURCE_ORPHAN")).count(); require(orphans == 1);
    }
    byte[] before = Files.readAllBytes(regenerated);
    try {
      Files.writeString(regenerated, "{}\n"); boolean rejected = false;
      try { new PluginObjectSnapshotApplication.Snapshot(root, manifestHash, indexHash, CHECKPOINT, regenerated); } catch (Exception mismatch) { rejected = true; }
      require(rejected);
    } finally { Files.write(regenerated, before); }
    if (!snapshot.rows.isEmpty()) {
      Path body = root.resolve(snapshot.rows.get(0).path("bodyPath").textValue()); byte[] bytes = Files.readAllBytes(body);
      try {
        byte[] changed = bytes.clone(); changed[0] ^= 1; Files.write(body, changed); boolean rejected = false;
        try { new PluginObjectSnapshotApplication.Snapshot(root, manifestHash, indexHash, CHECKPOINT, regenerated); } catch (Exception mismatch) { rejected = true; }
        require(rejected);
      } finally { Files.write(body, bytes); }
    }
    VersityStorageApplication.result("GENERATED_SNAPSHOT_VALIDATION_PASSED", Collections.emptyMap());
  }
  static void beforeWrite() throws Exception {
    Path original = Path.of("/backup/trusted-index.json"), regenerated = Path.of("/backup/regenerated-index.json");
    String indexHash = VersityStorageApplication.hash(Files.readAllBytes(original));
    String manifestHash = VersityStorageApplication.hash(Files.readAllBytes(Path.of("/backup/export/snapshot.json")));
    require(VersityStorageApplication.entries(VersityStorageApplication.ROOT).isEmpty());
    boolean rejected = false;
    try { PluginObjectSnapshotApplication.restoreFresh(Path.of("/backup/export"), "0".repeat(64), indexHash, CHECKPOINT, regenerated); }
    catch (Exception mismatch) { rejected = true; }
    require(rejected && VersityStorageApplication.entries(VersityStorageApplication.ROOT).isEmpty());
    rejected = false;
    try { PluginObjectSnapshotApplication.restoreFresh(Path.of("/backup/export"), manifestHash, indexHash, "0".repeat(64), regenerated); }
    catch (Exception mismatch) { rejected = true; }
    require(rejected && VersityStorageApplication.entries(VersityStorageApplication.ROOT).isEmpty());
    VersityStorageApplication.result("GENERATED_PREWRITE_VALIDATION_PASSED", Collections.emptyMap());
  }
  public static void main(String[] args) throws Exception {
    require(args.length == 1);
    if (args[0].equals("--prepare-source")) prepare(false);
    else if (args[0].equals("--prepare-empty")) prepare(true);
    else if (args[0].equals("--validate-snapshot")) validate();
    else if (args[0].equals("--validate-before-write")) beforeWrite();
    else require(false);
  }
}
