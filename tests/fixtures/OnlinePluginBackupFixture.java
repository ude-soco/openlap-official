package com.openlap.plugins.storage;

import com.openlap.plugins.artifacts.ArtifactIntegrity;
import com.openlap.plugins.artifacts.PluginArtifact;
import com.openlap.plugins.artifacts.PluginKind;
import com.openlap.plugins.artifacts.S3ArtifactObjectStore;
import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Random;
import java.util.TreeMap;
import java.util.concurrent.atomic.AtomicReference;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/** Generated class-free objects and actual exporter, with no production hooks. */
public final class OnlinePluginBackupFixture {
  static void require(boolean okay) { if (!okay) throw new IllegalStateException("Online backup fixture mismatch."); }
  static byte[] body(String label) throws Exception {
    byte[] payload = new byte[2 * 1024 * 1024]; new Random(label.hashCode()).nextBytes(payload);
    ByteArrayOutputStream bytes = new ByteArrayOutputStream();
    try (ZipOutputStream zip = new ZipOutputStream(bytes)) {
      ZipEntry entry = new ZipEntry("META-INF/generated-online-backup"); entry.setTime(0); zip.putNextEntry(entry);
      zip.write(payload); zip.closeEntry();
    }
    return bytes.toByteArray();
  }
  static PluginArtifact artifact(String label) throws Exception {
    byte[] bytes = body(label); return PluginArtifact.staged(PluginKind.ANALYTICS, VersityStorageApplication.hash(bytes), bytes.length, "online-generated");
  }
  static void put(S3ArtifactObjectStore store, String label) throws Exception {
    Path temporary = Files.createTempFile("generated-online-", ".jar");
    try { Files.write(temporary, body(label)); store.putIfAbsent(artifact(label), temporary); }
    finally { Files.delete(temporary); }
  }
  static Map<String, Long> orphans() throws Exception {
    Map<String, Long> result = new TreeMap<>();
    for (String label : new String[]{"cut-orphan-a", "cut-orphan-b"}) result.put(artifact(label).getObjectKey(), artifact(label).getSizeBytes());
    return result;
  }
  static void export(String[] args, boolean frozen) throws Exception {
    require(args.length == 5);
    Path output = Path.of(args[4]); String late = frozen ? "late-frozen-key" : "late-online-key";
    VersityStorageApplication.Settings settings = new VersityStorageApplication.Settings(false);
    URI endpoint = URI.create(System.getenv("PLUGIN_STORAGE_S3_ENDPOINT"));
    AtomicReference<Throwable> writerFailure = new AtomicReference<>();
    try (S3ArtifactObjectStore store = S3ArtifactObjectStore.connect(PluginObjectSnapshotApplication.properties(settings, endpoint))) {
      if (!frozen) for (String label : new String[]{"cut-orphan-a", "cut-orphan-b"}) put(store, label);
      Thread writer = new Thread(() -> {
        try {
          long deadline = System.nanoTime() + java.util.concurrent.TimeUnit.SECONDS.toNanos(30);
          while (!Files.exists(output.resolve("bodies/0000.jar"))) {
            require(System.nanoTime() < deadline); Thread.sleep(1);
          }
          // Body creation occurs after the actual first native inventory cut.
          require(!Files.exists(output.resolve("snapshot.json"))); PluginObjectSnapshotQualification.put(store, late, PluginKind.ANALYTICS);
          require(!Files.exists(output.resolve("snapshot.json")));
        } catch (Throwable failure) { writerFailure.set(failure); }
      }, "generated-concurrent-object-writer");
      writer.start(); boolean rejected = false;
      try { PluginObjectSnapshotApplication.exportSnapshot(Path.of(args[1]), args[2], args[3], output, !frozen); }
      catch (Exception mismatch) { rejected = true; }
      finally { writer.join(35000); }
      require(!writer.isAlive() && writerFailure.get() == null);
      if (frozen) {
        require(rejected && !Files.exists(output.resolve("snapshot.json")));
        require(PluginObjectSnapshotApplication.phase.equals("repeated frozen inventory verification"));
        VersityStorageApplication.result("GENERATED_FROZEN_EXTRA_KEY_REJECTED", Collections.emptyMap()); return;
      }
      require(!rejected);
      var bytes = Files.readAllBytes(output.resolve("snapshot.json"));
      var manifest = VersityStorageApplication.JSON.readTree(bytes);
      require(manifest.path("schemaVersion").intValue() == 2 && manifest.path("objectCount").intValue() == 8);
      Map<String, Long> cut = new TreeMap<>();
      for (var row : manifest.path("objects")) cut.put(row.path("objectKey").textValue(), row.path("sizeBytes").longValue());
      require(!cut.containsKey(PluginObjectSnapshotQualification.artifact(late, PluginKind.ANALYTICS).getObjectKey()) && cut.entrySet().containsAll(orphans().entrySet()));
      try (var client = VersityStorageApplication.client(settings, endpoint, false)) {
        var now = PluginObjectSnapshotApplication.inventory(client, settings.bucket);
        require(now.size() == cut.size() + 1 && now.entrySet().containsAll(cut.entrySet()));
        Map<String, Long> changed = new TreeMap<>(cut); changed.remove(cut.keySet().iterator().next());
        require(!PluginObjectSnapshotApplication.inventoryMatches(cut, changed, true));
        changed = new TreeMap<>(cut); String key = cut.keySet().iterator().next(); changed.put(key, cut.get(key) + 1);
        require(!PluginObjectSnapshotApplication.inventoryMatches(cut, changed, true));
        require(!PluginObjectSnapshotApplication.inventoryMatches(cut, now, false));
      }
      Map<String, Object> result = new LinkedHashMap<>(); result.put("manifestSha256", VersityStorageApplication.hash(bytes));
      result.put("objectCount", cut.size()); result.put("concurrentNewKeyExcluded", true); result.put("cutOrphansPreserved", true);
      VersityStorageApplication.result("GENERATED_IMMUTABLE_CUT_VERIFIED", result);
    }
  }
  static void cold() throws Exception {
    VersityStorageApplication.Settings settings = new VersityStorageApplication.Settings(false);
    try (S3ArtifactObjectStore store = S3ArtifactObjectStore.connect(PluginObjectSnapshotApplication.properties(settings, URI.create(System.getenv("PLUGIN_STORAGE_S3_ENDPOINT"))))) {
      for (String label : new String[]{"cut-orphan-a", "cut-orphan-b"}) {
        try (var input = store.open(artifact(label))) { ArtifactIntegrity.copyVerified(input, java.io.OutputStream.nullOutputStream(), artifact(label)); }
      }
    }
    CombinedPluginRecoveryFixture.verify(false, orphans());
  }
  static void manifestNegatives(String[] args) throws Exception {
    require(args.length == 5 && VersityStorageApplication.entries(VersityStorageApplication.ROOT).isEmpty());
    Path original = Path.of(args[1]), copy = Files.createTempDirectory("generated-invalid-online-");
    Files.setPosixFilePermissions(copy, java.nio.file.attribute.PosixFilePermissions.fromString("rwx------"));
    try (var paths = Files.walk(original)) {
      for (Path path : (Iterable<Path>) paths::iterator) {
        if (path.equals(original)) continue;
        Path target = copy.resolve(original.relativize(path));
        if (Files.isDirectory(path)) Files.createDirectory(target);
        else Files.copy(path, target);
        Files.setPosixFilePermissions(target, java.nio.file.attribute.PosixFilePermissions.fromString(Files.isDirectory(path) ? "rwx------" : "rw-------"));
      }
    }
    byte[] originalBytes = Files.readAllBytes(original.resolve("snapshot.json"));
    for (int variant = 0; variant < 7; variant++) {
      var manifest = (com.fasterxml.jackson.databind.node.ObjectNode) VersityStorageApplication.JSON.readTree(originalBytes);
      if (variant == 0) manifest.put("schemaVersion", 3);
      else if (variant == 1) manifest.put("format", PluginObjectSnapshotApplication.FORMAT);
      else if (variant == 2) manifest.remove("objectSelectionPolicy");
      else if (variant == 3) manifest.put("objectSelectionPolicy", "ASSUMED_CURRENT_BUCKET");
      else if (variant == 4) manifest.put("physicalDeletionDisabled", false);
      else if (variant == 5) manifest.put("freezeEvidenceId", "invented-freeze");
      else manifest.put("objectCount", manifest.path("objectCount").intValue() + 1);
      byte[] bytes = PluginObjectSnapshotApplication.encoded(manifest); Files.write(copy.resolve("snapshot.json"), bytes);
      boolean rejected = false;
      try { PluginObjectSnapshotApplication.restoreFresh(copy, VersityStorageApplication.hash(bytes), args[2], args[3], Path.of(args[4])); }
      catch (Exception mismatch) { rejected = true; }
      require(rejected && PluginObjectSnapshotApplication.phase.equals("complete snapshot and database association validation")
          && VersityStorageApplication.entries(VersityStorageApplication.ROOT).isEmpty());
    }
    require(java.util.Arrays.equals(originalBytes, Files.readAllBytes(original.resolve("snapshot.json"))));
    VersityStorageApplication.result("GENERATED_ONLINE_MANIFEST_PREWRITE_REJECTIONS_VERIFIED", Collections.singletonMap("cases", 7));
  }
  public static void main(String[] args) throws Exception {
    require(args.length > 0);
    if (args[0].equals("--export-concurrent")) export(args, false);
    else if (args[0].equals("--frozen-reject-concurrent")) export(args, true);
    else if (args[0].equals("--verify-cold")) cold();
    else if (args[0].equals("--validate-manifest-negatives")) manifestNegatives(args);
    else require(false);
  }
}
