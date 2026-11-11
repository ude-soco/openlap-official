package com.openlap.plugins.storage;

import com.fasterxml.jackson.databind.JsonNode;
import com.openlap.plugins.artifacts.ArtifactIntegrity;
import com.openlap.plugins.artifacts.PluginArtifact;
import com.openlap.plugins.artifacts.PluginKind;
import com.openlap.plugins.artifacts.PluginStorageProperties;
import com.openlap.plugins.artifacts.S3ArtifactObjectStore;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URI;
import java.nio.channels.FileChannel;
import java.nio.channels.FileLock;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.nio.file.attribute.PosixFilePermissions;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;

/** Logical object bytes only. Database restore authority remains in the checkpoint tool. */
public final class PluginObjectSnapshotApplication {
  static final int MAX_METADATA = 1024 * 1024;
  static final int MAX_OBJECTS = 1000;
  static final long MAX_OBJECT = 100L * 1024 * 1024;
  static final long MAX_TOTAL = 2L * 1024 * 1024 * 1024;
  static final String FORMAT = "OPENLAP_PLUGIN_OBJECT_SNAPSHOT_V1";
  static final String CONTENT_TYPE = "application/java-archive";
  static final String INDEX_NAME = "artifact-index.json";
  static final String MANIFEST_NAME = "snapshot.json";
  static String phase = "argument validation";
  private PluginObjectSnapshotApplication() {}

  static void require(boolean value) { VersityStorageApplication.require(value); }
  static void fields(JsonNode value, String names) {
    require(value != null && value.isObject()); Set<String> actual = new HashSet<>(); value.fieldNames().forEachRemaining(actual::add);
    require(actual.equals(new HashSet<>(Arrays.asList(names.split(" ")))));
  }
  static String string(JsonNode value) {
    require(value != null && value.isTextual() && value.textValue().length() <= 4096); return value.textValue();
  }
  static String sha(JsonNode value) { String result = string(value); require(result.matches("[a-f0-9]{64}")); return result; }
  static String sha(String value) { require(value != null && value.matches("[a-f0-9]{64}")); return value; }
  static long size(JsonNode value) { require(value != null && value.isIntegralNumber() && value.canConvertToLong()); long result = value.longValue(); require(result > 0 && result <= MAX_OBJECT); return result; }
  static Object canonical(JsonNode node) {
    if (node.isObject()) { Map<String, Object> result = new TreeMap<>(); node.fields().forEachRemaining(e -> result.put(e.getKey(), canonical(e.getValue()))); return result; }
    if (node.isArray()) { List<Object> result = new ArrayList<>(); node.forEach(item -> result.add(canonical(item))); return result; }
    return node;
  }
  static byte[] encoded(Object value) throws Exception {
    byte[] result = (VersityStorageApplication.JSON.writeValueAsString(canonical(VersityStorageApplication.JSON.valueToTree(value))) + "\n")
        .getBytes(java.nio.charset.StandardCharsets.UTF_8); require(result.length <= MAX_METADATA); return result;
  }
  static Path physical(Path path) throws Exception {
    require(path.isAbsolute() && path.normalize().equals(path));
    Path current = path.getRoot();
    for (Path part : path) { current = current.resolve(part); require(!Files.isSymbolicLink(current)); }
    require(path.toRealPath().equals(path)); return path;
  }
  static byte[] metadata(Path path) throws Exception {
    physical(path); return VersityStorageApplication.privateFile(path, MAX_METADATA);
  }
  static void privateBody(Path path, PluginArtifact artifact) throws Exception {
    physical(path);
    require(Files.isRegularFile(path, LinkOption.NOFOLLOW_LINKS)
        && ((Number) Files.getAttribute(path, "unix:uid", LinkOption.NOFOLLOW_LINKS)).intValue() == 1000
        && ((Number) Files.getAttribute(path, "unix:nlink", LinkOption.NOFOLLOW_LINKS)).intValue() == 1
        && Files.getPosixFilePermissions(path).equals(PosixFilePermissions.fromString("rw-------"))
        && Files.size(path) == artifact.getSizeBytes());
    ArtifactIntegrity.verify(path, artifact);
  }
  static PluginArtifact artifact(String key, long bytes) {
    require(key.matches("plugins/(analytics|visualizations)/[a-f0-9]{64}\\.jar"));
    String[] parts = key.split("/"); PluginKind kind = parts[1].equals("analytics") ? PluginKind.ANALYTICS : PluginKind.VISUALIZATION;
    return PluginArtifact.staged(kind, parts[2].substring(0, 64), bytes, "logical-snapshot");
  }
  static final class Index {
    final byte[] bytes; final String hash, checkpoint, archive; final Map<String, JsonNode> artifacts = new TreeMap<>();
    Index(Path path, String expected, String expectedCheckpoint) throws Exception {
      bytes = metadata(path); hash = VersityStorageApplication.hash(bytes); require(hash.equals(sha(expected)));
      JsonNode index = VersityStorageApplication.JSON.readTree(bytes);
      fields(index, "schemaVersion projectionPolicy status binding artifacts collections associations legacyCatalogEntries associationIssues summary associationsResolved readyForS3Export emptyRegisteredPluginSnapshot objectBytesVerified s3RestoreVerified scope");
      require(index.path("schemaVersion").isInt() && index.path("schemaVersion").intValue() == 1
          && string(index.path("projectionPolicy")).equals("OPENLAP_PLUGIN_ARTIFACT_INDEX_V1")
          && string(index.path("status")).equals("CHECKPOINT_PLUGIN_ARTIFACT_INDEX_VERIFIED")
          && index.path("readyForS3Export").isBoolean() && index.path("readyForS3Export").booleanValue()
          && index.path("associationsResolved").isBoolean() && index.path("associationsResolved").booleanValue()
          && index.path("objectBytesVerified").isBoolean() && !index.path("objectBytesVerified").booleanValue()
          && index.path("s3RestoreVerified").isBoolean() && !index.path("s3RestoreVerified").booleanValue());
      JsonNode binding = index.path("binding");
      fields(binding, "originalCheckpointReportSha256 archiveSha256 checkpointId database sourceIdentityMd5 sourceServerVersion restoreServerVersion fcv databaseToolsVersion");
      checkpoint = sha(binding.path("originalCheckpointReportSha256")); archive = sha(binding.path("archiveSha256")); require(checkpoint.equals(sha(expectedCheckpoint)));
      require(string(binding.path("checkpointId")).matches("[A-Za-z0-9][A-Za-z0-9_-]{0,79}")
          && string(binding.path("database")).matches("[A-Za-z][A-Za-z0-9_-]{0,62}")
          && !Arrays.asList("admin", "config", "local").contains(binding.path("database").textValue())
          && string(binding.path("sourceIdentityMd5")).matches("[a-f0-9]{32}")
          && string(binding.path("sourceServerVersion")).matches("4\\.4\\.[0-9]{1,3}")
          && string(binding.path("restoreServerVersion")).equals("4.4.30")
          && string(binding.path("fcv")).equals("4.4") && string(binding.path("databaseToolsVersion")).equals("100.10.0")
          && string(index.path("scope")).equals("Verified restored database projection only; known code-owned plugin associations, no universal freeform-ID analysis, S3 object bytes, writer freeze, or application recovery verified"));
      require(index.path("artifacts").isArray() && index.path("artifacts").size() <= MAX_OBJECTS);
      String previous = "";
      for (JsonNode entry : index.path("artifacts")) {
        fields(entry, "artifactId kind sha256 sizeBytes objectKey state presenceRequirement");
        String key = string(entry.path("objectKey")); PluginArtifact artifact = artifact(key, size(entry.path("sizeBytes")));
        String id = string(entry.path("artifactId")); require(id.compareTo(previous) > 0); previous = id;
        require(id.equals(artifact.getId()) && string(entry.path("kind")).equals(artifact.getKind().name()) && sha(entry.path("sha256")).equals(artifact.getSha256()));
        String state = string(entry.path("state"));
        require(string(entry.path("presenceRequirement")).equals(state.equals("READY") ? "REQUIRED" : state.equals("STAGED") ? "OPTIONAL_STAGED" : state.equals("PURGED") ? "MUST_BE_ABSENT" : "INVALID") && !state.equals("INVALID"));
        require(Arrays.asList("READY", "STAGED", "PURGED").contains(state) && artifacts.put(key, entry) == null);
      }
    }
    void inventory(Map<String, Long> inventory) {
      for (Map.Entry<String, JsonNode> entry : artifacts.entrySet()) {
        String key = entry.getKey(), state = entry.getValue().path("state").textValue();
        require(!state.equals("READY") || inventory.containsKey(key));
        require(!state.equals("PURGED") || !inventory.containsKey(key));
        if (inventory.containsKey(key)) require(inventory.get(key).longValue() == entry.getValue().path("sizeBytes").longValue());
      }
    }
  }
  static Map<String, Long> inventory(S3Client client, String bucket) {
    Map<String, Long> result = new TreeMap<>(); Set<String> tokens = new HashSet<>(); String token = null; long total = 0;
    do {
      final String continuation = token;
      var response = client.listObjectsV2(b -> b.bucket(bucket).maxKeys(MAX_OBJECTS).continuationToken(continuation));
      require(response.contents().size() <= MAX_OBJECTS);
      for (var object : response.contents()) {
        require(object.size() != null && object.size() > 0 && object.size() <= MAX_OBJECT); artifact(object.key(), object.size());
        require(result.put(object.key(), object.size()) == null && result.size() <= MAX_OBJECTS);
        total += object.size(); require(total <= MAX_TOTAL);
      }
      if (!Boolean.TRUE.equals(response.isTruncated())) break;
      token = response.nextContinuationToken(); require(token != null && !token.isEmpty() && token.length() <= 4096 && tokens.add(token) && tokens.size() <= MAX_OBJECTS);
    } while (true);
    return result;
  }
  static void download(S3Client client, String bucket, PluginArtifact artifact, Path target) throws Exception {
    try (ResponseInputStream<GetObjectResponse> input = client.getObject(b -> b.bucket(bucket).key(artifact.getObjectKey()))) {
      GetObjectResponse headers = input.response();
      require(headers.contentLength() != null && headers.contentLength() == artifact.getSizeBytes()
          && CONTENT_TYPE.equals(headers.contentType()) && headers.metadata().equals(Collections.singletonMap("sha256", artifact.getSha256())));
      if (target == null) ArtifactIntegrity.copyVerified(input, OutputStream.nullOutputStream(), artifact);
      else {
        Files.createFile(target, PosixFilePermissions.asFileAttribute(PosixFilePermissions.fromString("rw-------")));
        try (OutputStream output = Files.newOutputStream(target, StandardOpenOption.WRITE)) { ArtifactIntegrity.copyVerified(input, output, artifact); }
        VersityStorageApplication.sync(target);
      }
    }
  }
  static Map<String, Object> row(String key, long bytes, int ordinal, Index index) {
    PluginArtifact artifact = artifact(key, bytes); Map<String, Object> result = new LinkedHashMap<>();
    result.put("objectKey", key); result.put("sha256", artifact.getSha256()); result.put("sizeBytes", bytes);
    result.put("contentType", CONTENT_TYPE); result.put("metadata", Collections.singletonMap("sha256", artifact.getSha256()));
    result.put("bodyPath", String.format(java.util.Locale.ROOT, "bodies/%04d.jar", ordinal));
    result.put("classification", index.artifacts.containsKey(key) ? "REGISTERED" : "SOURCE_ORPHAN"); return result;
  }
  static void publish(Path root, String name, byte[] bytes) throws Exception {
    Path pending = root.resolve(name + ".partial"); Files.createFile(pending, PosixFilePermissions.asFileAttribute(PosixFilePermissions.fromString("rw-------")));
    Files.write(pending, bytes, StandardOpenOption.WRITE); VersityStorageApplication.sync(pending);
    Files.createLink(root.resolve(name), pending); Files.delete(pending); VersityStorageApplication.sync(root);
  }
  static void exportSnapshot(Path indexPath, String indexHash, String checkpointHash, Path output) throws Exception {
    phase = "trusted index validation"; Index index = new Index(indexPath, indexHash, checkpointHash);
    require(output.isAbsolute() && output.normalize().equals(output)); physical(output.getParent());
    phase = "application export configuration"; VersityStorageApplication.Settings settings = new VersityStorageApplication.Settings(false);
    URI endpoint = URI.create(System.getenv().getOrDefault("PLUGIN_STORAGE_S3_ENDPOINT", "")); properties(settings, endpoint).validateS3();
    phase = "new snapshot directory"; VersityStorageApplication.createDirectory(output); VersityStorageApplication.privateDirectory(output);
    VersityStorageApplication.sync(output.getParent());
    Path bodies = output.resolve("bodies"); VersityStorageApplication.createDirectory(bodies);
    publish(output, INDEX_NAME, index.bytes);
    List<Object> rows = new ArrayList<>(); long total = 0;
    try (S3Client client = VersityStorageApplication.client(settings, endpoint, false)) {
      phase = "frozen object inventory"; Map<String, Long> first = inventory(client, settings.bucket); index.inventory(first);
      for (Map.Entry<String, Long> object : first.entrySet()) {
        Map<String, Object> row = row(object.getKey(), object.getValue(), rows.size(), index);
        phase = "object byte export"; download(client, settings.bucket, artifact(object.getKey(), object.getValue()), output.resolve((String) row.get("bodyPath")));
        rows.add(row); total += object.getValue();
      }
      phase = "repeated frozen inventory verification"; require(first.equals(inventory(client, settings.bucket)));
      for (Map.Entry<String, Long> object : first.entrySet()) download(client, settings.bucket, artifact(object.getKey(), object.getValue()), null);
      require(first.equals(inventory(client, settings.bucket)));
    }
    VersityStorageApplication.sync(bodies);
    Map<String, Object> manifest = new LinkedHashMap<>(); manifest.put("schemaVersion", 1); manifest.put("format", FORMAT);
    manifest.put("artifactIndexSha256", index.hash); manifest.put("originalCheckpointReportSha256", index.checkpoint); manifest.put("archiveSha256", index.archive);
    manifest.put("objects", rows); manifest.put("objectCount", rows.size()); manifest.put("totalBytes", total);
    manifest.put("databaseAssociationScope", "verified-index-only"); manifest.put("recoveryVerified", false);
    phase = "completed snapshot publication"; byte[] bytes = encoded(manifest); publish(output, MANIFEST_NAME, bytes);
    Map<String, Object> detail = new LinkedHashMap<>(); detail.put("manifestSha256", VersityStorageApplication.hash(bytes)); detail.put("artifactIndexSha256", index.hash);
    detail.put("objectCount", rows.size()); detail.put("totalBytes", total); detail.put("recoveryVerified", false);
    VersityStorageApplication.result("PLUGIN_OBJECT_SNAPSHOT_EXPORTED", detail);
  }
  static PluginStorageProperties properties(VersityStorageApplication.Settings settings, URI endpoint) {
    PluginStorageProperties result = new PluginStorageProperties(); result.setMode(PluginStorageProperties.Mode.S3);
    result.setEndpoint(endpoint); result.setBucket(settings.bucket); result.setRegion(settings.region); result.setAccessKey(settings.appAccess); result.setSecretKey(settings.appSecret); return result;
  }
  static final class Snapshot {
    final Index index; final Map<String, Long> inventory = new TreeMap<>(); final List<JsonNode> rows = new ArrayList<>(); final Path root; final String hash;
    Snapshot(Path root, String manifestHash, String indexHash, String checkpointHash, Path rehearsalIndex) throws Exception {
      this.root = physical(root); VersityStorageApplication.privateDirectory(root);
      index = new Index(root.resolve(INDEX_NAME), indexHash, checkpointHash);
      Index restored = new Index(rehearsalIndex, indexHash, checkpointHash); require(Arrays.equals(index.bytes, restored.bytes));
      byte[] bytes = metadata(root.resolve(MANIFEST_NAME)); hash = VersityStorageApplication.hash(bytes); require(hash.equals(sha(manifestHash)));
      JsonNode manifest = VersityStorageApplication.JSON.readTree(bytes);
      fields(manifest, "schemaVersion format artifactIndexSha256 originalCheckpointReportSha256 archiveSha256 objects objectCount totalBytes databaseAssociationScope recoveryVerified");
      require(Arrays.equals(bytes, encoded(manifest)) && manifest.path("schemaVersion").isInt() && manifest.path("schemaVersion").intValue() == 1
          && string(manifest.path("format")).equals(FORMAT) && sha(manifest.path("artifactIndexSha256")).equals(index.hash)
          && sha(manifest.path("originalCheckpointReportSha256")).equals(index.checkpoint) && sha(manifest.path("archiveSha256")).equals(index.archive)
          && string(manifest.path("databaseAssociationScope")).equals("verified-index-only")
          && manifest.path("recoveryVerified").isBoolean() && !manifest.path("recoveryVerified").booleanValue()
          && manifest.path("objects").isArray() && manifest.path("objects").size() <= MAX_OBJECTS);
      // The regular-file transporter omits empty directories. Authenticated empty
      // snapshots need no body directory, and validation never recreates inputs.
      Set<String> expected = new HashSet<>(Arrays.asList(INDEX_NAME, MANIFEST_NAME));
      boolean hasBodies = VersityStorageApplication.entries(root).contains("bodies");
      require(hasBodies || manifest.path("objects").size() == 0);
      if (hasBodies) { expected.add("bodies"); VersityStorageApplication.privateDirectory(root.resolve("bodies")); }
      require(VersityStorageApplication.entries(root).equals(expected));
      Set<String> files = new HashSet<>(); String previous = ""; long total = 0;
      for (JsonNode entry : manifest.path("objects")) {
        fields(entry, "objectKey sha256 sizeBytes contentType metadata bodyPath classification"); String key = string(entry.path("objectKey")); long size = size(entry.path("sizeBytes"));
        require(key.compareTo(previous) > 0); previous = key;
        require(Arrays.equals(encoded(entry), encoded(row(key, size, rows.size(), index))));
        PluginArtifact artifact = artifact(key, size); privateBody(root.resolve(string(entry.path("bodyPath"))), artifact);
        files.add(Path.of(string(entry.path("bodyPath"))).getFileName().toString()); rows.add(entry); inventory.put(key, size); total += size; require(total <= MAX_TOTAL);
      }
      require(hasBodies ? VersityStorageApplication.entries(root.resolve("bodies")).equals(files) : files.isEmpty()); index.inventory(inventory);
      require(manifest.path("objectCount").isInt() && manifest.path("objectCount").intValue() == rows.size()
          && manifest.path("totalBytes").isIntegralNumber() && manifest.path("totalBytes").canConvertToLong() && manifest.path("totalBytes").longValue() == total);
    }
  }
  static Process startLocal(VersityStorageApplication.Settings settings) throws Exception {
    VersityStorageApplication.verifyState(settings, VersityStorageApplication.ROOT.resolve("objects"), VersityStorageApplication.ROOT.resolve("iam"));
    Process process = VersityStorageApplication.start(settings, VersityStorageApplication.ROOT.resolve("objects"), VersityStorageApplication.ROOT.resolve("iam"), true);
    try (S3Client root = VersityStorageApplication.client(settings, VersityStorageApplication.LOCAL_S3, true)) {
      try { VersityStorageApplication.waitReady(root, process); return process; } catch (Exception failure) { VersityStorageApplication.stop(process); throw failure; }
    }
  }
  static void verifyObjects(Snapshot snapshot, VersityStorageApplication.Settings settings) throws Exception {
    try (S3Client client = VersityStorageApplication.client(settings, VersityStorageApplication.LOCAL_S3, false)) {
      require(snapshot.inventory.equals(inventory(client, settings.bucket)));
      for (Map.Entry<String, Long> entry : snapshot.inventory.entrySet()) download(client, settings.bucket, artifact(entry.getKey(), entry.getValue()), null);
      require(snapshot.inventory.equals(inventory(client, settings.bucket)));
    }
  }
  static void restoreFresh(Path input, String manifestHash, String indexHash, String checkpointHash, Path rehearsalIndex) throws Exception {
    phase = "complete snapshot and database association validation"; Snapshot snapshot = new Snapshot(input, manifestHash, indexHash, checkpointHash, rehearsalIndex);
    phase = "fresh local restore validation"; require(Files.isDirectory(VersityStorageApplication.ROOT, LinkOption.NOFOLLOW_LINKS)
        && !Files.isSymbolicLink(VersityStorageApplication.ROOT) && VersityStorageApplication.entries(VersityStorageApplication.ROOT).isEmpty());
    VersityStorageApplication.Settings settings = new VersityStorageApplication.Settings(true);
    phase = "fresh qualified initialization"; VersityStorageApplication.bootstrap(settings);
    Path lease = VersityStorageApplication.ROOT.resolve("lease/gateway.lock");
    try (FileChannel channel = FileChannel.open(lease, StandardOpenOption.WRITE); FileLock lock = channel.tryLock()) {
      require(lock != null); Process process = null;
      try {
        phase = "isolated local provider startup"; process = startLocal(settings);
        try (S3Client client = VersityStorageApplication.client(settings, VersityStorageApplication.LOCAL_S3, false);
             S3ArtifactObjectStore store = S3ArtifactObjectStore.connect(properties(settings, VersityStorageApplication.LOCAL_S3))) {
          require(inventory(client, settings.bucket).isEmpty());
          phase = "verified object restore";
          for (JsonNode entry : snapshot.rows) {
            PluginArtifact artifact = artifact(entry.path("objectKey").textValue(), entry.path("sizeBytes").longValue());
            Path body = snapshot.root.resolve(entry.path("bodyPath").textValue()); privateBody(body, artifact); store.putIfAbsent(artifact, body);
          }
        }
        phase = "restored inventory verification"; verifyObjects(snapshot, settings);
        phase = "cold provider shutdown"; VersityStorageApplication.stop(process); process = null;
        phase = "cold provider restart"; process = startLocal(settings);
        phase = "cold client byte and metadata verification"; verifyObjects(snapshot, settings);
      } finally { VersityStorageApplication.stop(process); }
    }
    Map<String, Object> detail = new LinkedHashMap<>(); detail.put("manifestSha256", snapshot.hash); detail.put("artifactIndexSha256", snapshot.index.hash);
    detail.put("originalCheckpointReportSha256", snapshot.index.checkpoint); detail.put("archiveSha256", snapshot.index.archive);
    detail.put("objectCount", snapshot.rows.size()); detail.put("databaseIndexMatched", true); detail.put("coldReadbackVerified", true);
    detail.put("databaseAssociationScope", "verified-index-only");
    VersityStorageApplication.result("FRESH_LOCAL_PLUGIN_OBJECT_RESTORE_VERIFIED", detail);
  }
  public static void main(String[] args) {
    int exit = 1;
    try {
      require("Linux".equals(System.getProperty("os.name")));
      if (args.length == 5 && args[0].equals("--export")) exportSnapshot(Path.of(args[1]), args[2], args[3], Path.of(args[4]));
      else if (args.length == 6 && args[0].equals("--restore-fresh")) restoreFresh(Path.of(args[1]), args[2], args[3], args[4], Path.of(args[5]));
      else require(false);
      exit = 0;
    } catch (Throwable failure) { System.err.println("Plugin object snapshot failed during " + phase + ". Treat this operation as incomplete."); }
    System.exit(exit);
  }
}
