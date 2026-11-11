package com.openlap.plugins.storage;

import com.openlap.plugins.artifacts.ArtifactIntegrity;
import com.openlap.plugins.artifacts.PluginArtifact;
import com.openlap.plugins.artifacts.PluginKind;
import com.openlap.plugins.artifacts.PluginStorageProperties;
import com.openlap.plugins.artifacts.S3ArtifactObjectStore;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;
import java.nio.ByteBuffer;
import java.nio.file.attribute.UserDefinedFileAttributeView;
import java.time.Duration;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.BucketCannedACL;
import software.amazon.awssdk.services.s3.model.ObjectCannedACL;
import software.amazon.awssdk.services.s3.model.S3Exception;

/** Synthetic fixture, compiled into scratch only; never packaged in the runtime image. */
public final class VersityStorageQualification {
  private static String step = "initialization";
  private static void require(boolean okay) { if (!okay) throw new IllegalStateException("Qualification assertion failed."); }
  private static void denied(Runnable operation) {
    try { operation.run(); throw new IllegalStateException("Denied action succeeded."); }
    catch (S3Exception denied) { require(denied.statusCode() == 403); }
  }
  @FunctionalInterface private interface Operation { void run() throws Exception; }
  private static void rejected(Operation operation) throws Exception {
    boolean failed = false; try { operation.run(); } catch (Exception expected) { failed = true; } require(failed);
  }
  public static void main(String[] args) {
    try {
      require(Files.isRegularFile(Path.of("/opt/openlap-storage/lib/s3-2.57.11.jar")));
      if (args.length == 1 && args[0].equals("--fsync-error")) {
        step = "filesystem sync error propagation"; rejected(() -> VersityStorageApplication.sync(Path.of("/proc/self/status")));
        System.out.println("Filesystem failure fixture passed."); return;
      }
      if (args.length == 1 && args[0].equals("--iam-readonly")) {
        step = "read-only IAM update rejection";
        VersityStorageApplication.Settings root = new VersityStorageApplication.Settings(true);
        rejected(() -> Files.createFile(Path.of("/storage/iam/forbidden-write")));
        rejected(() -> VersityStorageApplication.createUser(root));
        VersityStorageApplication.verifyState(root, Path.of("/objects"), Path.of("/storage/iam"));
        System.out.println("Read-only IAM fixture passed."); return;
      }
      if (args.length == 1 && args[0].equals("--state-negatives")) {
        VersityStorageApplication.Settings settings = new VersityStorageApplication.Settings(true);
        Path data = Path.of("/storage"), iam = data.resolve("iam"), objects = data.resolve("objects");
        step = "missing IAM remains missing";
        Files.move(iam.resolve("users.json"), Path.of("/tmp/preserved-users.json"));
        try { rejected(() -> VersityStorageApplication.verifyState(settings, objects, iam)); require(!Files.exists(iam.resolve("users.json"))); }
        finally { Files.move(Path.of("/tmp/preserved-users.json"), iam.resolve("users.json")); }
        step = "corrupt IAM remains rejected";
        Files.move(iam.resolve("users.json"), Path.of("/tmp/preserved-users.json"));
        try {
          Files.writeString(iam.resolve("users.json"), "{\"accessAccounts\":{}}"); Files.setPosixFilePermissions(iam.resolve("users.json"), PosixFilePermissions.fromString("rw-------"));
          rejected(() -> VersityStorageApplication.verifyState(settings, objects, iam));
        } finally { Files.delete(iam.resolve("users.json")); Files.move(Path.of("/tmp/preserved-users.json"), iam.resolve("users.json")); }
        step = "partial installation is not adopted";
        Files.move(data.resolve("installation.json"), Path.of("/tmp/preserved-installation.json"));
        try { rejected(() -> VersityStorageApplication.verifyState(settings, objects, iam)); }
        finally { Files.move(Path.of("/tmp/preserved-installation.json"), data.resolve("installation.json")); }
        step = "bucket policy drift remains rejected";
        UserDefinedFileAttributeView attributes = Files.getFileAttributeView(objects.resolve(settings.bucket), UserDefinedFileAttributeView.class);
        ByteBuffer original = ByteBuffer.allocate(attributes.size("policy")); attributes.read("policy", original);
        try { attributes.write("policy", ByteBuffer.wrap("{}".getBytes(java.nio.charset.StandardCharsets.US_ASCII))); rejected(() -> VersityStorageApplication.verifyState(settings, objects, iam)); }
        finally { attributes.write("policy", ByteBuffer.wrap(original.array())); }
        step = "forged owner plus consistent marker remains rejected";
        byte[] markerBytes = Files.readAllBytes(data.resolve("installation.json"));
        ByteBuffer originalAcl = ByteBuffer.allocate(attributes.size("acl")); attributes.read("acl", originalAcl);
        try {
          var acl = (com.fasterxml.jackson.databind.node.ObjectNode) VersityStorageApplication.JSON.readTree(originalAcl.array());
          acl.put("Owner", settings.appAccess); byte[] changed = VersityStorageApplication.JSON.writeValueAsBytes(acl);
          attributes.write("acl", ByteBuffer.wrap(changed));
          var marker = (com.fasterxml.jackson.databind.node.ObjectNode) VersityStorageApplication.JSON.readTree(markerBytes);
          ((com.fasterxml.jackson.databind.node.ObjectNode) marker.path("bucketAttributes")).put("acl", VersityStorageApplication.hash(changed));
          Files.write(data.resolve("installation.json"), VersityStorageApplication.JSON.writeValueAsBytes(marker));
          rejected(() -> VersityStorageApplication.verifyState(settings, objects, iam));
        } finally { attributes.write("acl", ByteBuffer.wrap(originalAcl.array())); Files.write(data.resolve("installation.json"), markerBytes); }
        step = "admin role plus consistent marker remains rejected";
        byte[] usersBytes = Files.readAllBytes(iam.resolve("users.json"));
        try {
          var users = VersityStorageApplication.JSON.readTree(usersBytes);
          ((com.fasterxml.jackson.databind.node.ObjectNode) users.path("accessAccounts").path(settings.appAccess)).put("role", "admin");
          byte[] changed = VersityStorageApplication.JSON.writeValueAsBytes(users); Files.write(iam.resolve("users.json"), changed);
          var marker = (com.fasterxml.jackson.databind.node.ObjectNode) VersityStorageApplication.JSON.readTree(markerBytes);
          marker.put("iamSha256", VersityStorageApplication.hash(changed)); Files.write(data.resolve("installation.json"), VersityStorageApplication.JSON.writeValueAsBytes(marker));
          rejected(() -> VersityStorageApplication.verifyState(settings, objects, iam));
        } finally { Files.write(iam.resolve("users.json"), usersBytes); Files.write(data.resolve("installation.json"), markerBytes); }
        step = "restored test state still verifies"; VersityStorageApplication.verifyState(settings, objects, iam);
        System.out.println("Retained state rejection fixtures passed."); return;
      }
      boolean readOnly = args.length == 1 && args[0].equals("--read-persisted"); require(args.length == 0 || readOnly);
      VersityStorageApplication.Settings settings = new VersityStorageApplication.Settings(false);
      URI endpoint = URI.create(System.getenv("PLUGIN_STORAGE_S3_ENDPOINT"));
      PluginStorageProperties properties = new PluginStorageProperties(); properties.setMode(PluginStorageProperties.Mode.S3);
      properties.setEndpoint(endpoint); properties.setBucket(settings.bucket); properties.setRegion(settings.region);
      properties.setAccessKey(settings.appAccess); properties.setSecretKey(settings.appSecret);
      ByteArrayOutputStream bytes = new ByteArrayOutputStream();
      try (ZipOutputStream zip = new ZipOutputStream(bytes)) {
        ZipEntry entry = new ZipEntry("META-INF/openlap-qualification"); entry.setTime(0); zip.putNextEntry(entry);
        zip.write("Persistent class-free synthetic OpenLAP artifact v1".getBytes(java.nio.charset.StandardCharsets.US_ASCII)); zip.closeEntry();
      }
      byte[] payload = bytes.toByteArray(); PluginArtifact artifact = PluginArtifact.staged(PluginKind.ANALYTICS,
          VersityStorageApplication.hash(payload), payload.length, "isolated-qualification");
      Path source = Files.createTempFile("openlap-qualification-", ".jar");
      Files.setPosixFilePermissions(source, PosixFilePermissions.fromString("rw-------")); Files.write(source, payload);
      try (S3Client client = VersityStorageApplication.client(settings, endpoint, false);
           S3ArtifactObjectStore store = S3ArtifactObjectStore.connect(properties)) {
        if (!readOnly) {
          step = "persist application artifact"; store.putIfAbsent(artifact, source);
          step = "bucket mutation denied";
          denied(() -> client.createBucket(b -> b.bucket("forbidden-new-bucket")));
          denied(() -> client.deleteBucket(b -> b.bucket(settings.bucket)));
          denied(() -> client.putBucketAcl(b -> b.bucket(settings.bucket).acl(BucketCannedACL.PUBLIC_READ)));
          denied(() -> client.putBucketPolicy(b -> b.bucket(settings.bucket).policy("{\"Version\":\"2012-10-17\",\"Statement\":[]}")));
          denied(() -> client.deleteBucketPolicy(b -> b.bucket(settings.bucket)));
          step = "object ACL mutation denied";
          denied(() -> client.putObjectAcl(b -> b.bucket(settings.bucket).key(artifact.getObjectKey()).acl(ObjectCannedACL.PUBLIC_READ)));
          step = "outside prefix denied";
          denied(() -> client.putObject(b -> b.bucket(settings.bucket).key("outside/forbidden"), RequestBody.fromString("synthetic")));
          denied(() -> client.getObjectAsBytes(b -> b.bucket(settings.bucket).key("outside/forbidden")));
          denied(() -> client.deleteObject(b -> b.bucket(settings.bucket).key("outside/forbidden")));
          step = "anonymous reads denied";
          HttpResponse<Void> anonymous = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build().send(
              HttpRequest.newBuilder(URI.create(endpoint + "/" + settings.bucket + "/" + artifact.getObjectKey()))
                  .timeout(Duration.ofSeconds(5)).GET().build(), HttpResponse.BodyHandlers.discarding());
          require(anonymous.statusCode() == 403);
          step = "dedicated bucket list";
          require(client.listObjectsV2(b -> b.bucket(settings.bucket)).contents().stream().anyMatch(o -> artifact.getObjectKey().equals(o.key())));
        }
        step = "verify cold bytes and metadata";
        try (InputStream input = store.open(artifact)) { ArtifactIntegrity.copyVerified(input, java.io.OutputStream.nullOutputStream(), artifact); }
        var head = client.headObject(b -> b.bucket(settings.bucket).key(artifact.getObjectKey()));
        require(head.contentLength() == payload.length && "application/java-archive".equals(head.contentType())
            && artifact.getSha256().equals(head.metadata().get("sha256")));
        if (readOnly) { step = "remove own persisted fixture"; store.deleteVerified(artifact); }
      } finally { Files.deleteIfExists(source); }
      System.out.println("Application permission and persistence fixtures passed.");
    } catch (Throwable failure) {
      System.err.println("Qualification failed during " + step + "."); System.exit(1);
    }
  }
}
