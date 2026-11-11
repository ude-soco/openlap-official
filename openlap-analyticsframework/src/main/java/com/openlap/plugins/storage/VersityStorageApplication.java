package com.openlap.plugins.storage;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.openlap.plugins.artifacts.ArtifactIntegrity;
import com.openlap.plugins.artifacts.PluginArtifact;
import com.openlap.plugins.artifacts.PluginKind;
import com.openlap.plugins.artifacts.PluginStorageException;
import com.openlap.plugins.artifacts.PluginStorageProperties;
import com.openlap.plugins.artifacts.S3ArtifactObjectStore;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.channels.FileLock;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.nio.file.attribute.PosixFilePermissions;
import java.nio.file.attribute.UserDefinedFileAttributeView;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.auth.signer.Aws4Signer;
import software.amazon.awssdk.auth.signer.params.Aws4SignerParams;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.http.SdkHttpFullRequest;
import software.amazon.awssdk.http.SdkHttpMethod;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.BucketCannedACL;
import software.amazon.awssdk.services.s3.model.ObjectOwnership;
import software.amazon.awssdk.services.s3.model.S3Exception;

/** Opt-in single-gateway lifecycle; deliberately never starts Spring or connects to MongoDB. */
public final class VersityStorageApplication {
  static final String VERSION = "versity-1.11.0-v1";
  static final ObjectMapper JSON = new ObjectMapper().enable(JsonParser.Feature.STRICT_DUPLICATE_DETECTION)
      .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS);
  static final Path ROOT = Paths.get("/storage");
  static final Path OBJECTS = Paths.get("/objects");
  static final Path LEASE = Paths.get("/lease");
  static final Path BINARY = Paths.get("/usr/local/bin/versitygw");
  static final Path READY = Paths.get("/tmp/openlap-storage-ready");
  static final URI LOCAL_S3 = URI.create("http://127.0.0.1:9000");
  static final URI LOCAL_ADMIN = URI.create("http://127.0.0.1:9001/create-user");
  static final String MARKER = "installation.json";
  static String phase = "argument validation";
  static final Set<String> STATE_FIELDS = new HashSet<>(Arrays.asList(
      "format", "configurationSha256", "iamSha256", "iamBackupSha256", "bucketAttributes"));

  private VersityStorageApplication() {}

  static final class Settings {
    final String bucket, region, rootAccess, rootSecret, appAccess, appSecret;
    Settings(boolean root) throws Exception {
      Map<String, String> env = System.getenv();
      bucket = env.getOrDefault("PLUGIN_STORAGE_S3_BUCKET", "");
      region = env.getOrDefault("PLUGIN_STORAGE_S3_REGION", "");
      require(bucket.matches("[a-z0-9][a-z0-9-]{1,61}[a-z0-9]")
          && region.matches("[a-z0-9][a-z0-9-]{0,62}"));
      appAccess = secret(Paths.get("/run/openlap-client"), "PLUGIN_STORAGE_S3_ACCESS_KEY");
      appSecret = secret(Paths.get("/run/openlap-client"), "PLUGIN_STORAGE_S3_SECRET_KEY");
      rootAccess = root ? secret(Paths.get("/run/openlap-root"), "ROOT_ACCESS_KEY_ID") : "";
      rootSecret = root ? secret(Paths.get("/run/openlap-root"), "ROOT_SECRET_ACCESS_KEY") : "";
      require(appAccess.matches("[A-Za-z0-9_-]{16,64}") && appSecret.length() >= 32);
      if (root) require(rootAccess.matches("[A-Za-z0-9_-]{16,64}") && rootSecret.length() >= 32
          && !rootAccess.equals(appAccess) && !rootSecret.equals(appSecret));
    }
    String configuration() throws Exception {
      Map<String, Object> configuration = new LinkedHashMap<>();
      configuration.put("format", VERSION); configuration.put("bucket", bucket);
      configuration.put("region", region); configuration.put("rootIdentity", hash(rootAccess + "\0" + rootSecret));
      configuration.put("applicationIdentity", hash(appAccess + "\0" + appSecret));
      configuration.put("fsync", true); configuration.put("aclsDisabled", true);
      configuration.put("publishLock", "flock");
      configuration.put("directoryMode", "0700"); configuration.put("fileMode", "0600");
      configuration.put("ownership", "BucketOwnerEnforced");
      configuration.put("policySha256", hash(policy(this)));
      return hash(JSON.writeValueAsBytes(configuration));
    }
  }

  static void require(boolean condition) {
    if (!condition) throw new IllegalStateException("Storage operation rejected.");
  }
  static String hash(String value) throws Exception { return hash(value.getBytes(java.nio.charset.StandardCharsets.UTF_8)); }
  static String hash(byte[] value) throws Exception {
    byte[] digest = MessageDigest.getInstance("SHA-256").digest(value); StringBuilder hex = new StringBuilder();
    for (byte item : digest) hex.append(String.format("%02x", item & 255));
    return hex.toString();
  }
  static String secret(Path directory, String name) throws Exception {
    // Kubernetes projected keys are symlinks into a versioned directory inside the read-only mount.
    Path physicalRoot = directory.toRealPath(); Path file = directory.resolve(name).toRealPath();
    require(file.startsWith(physicalRoot) && Files.isRegularFile(file, LinkOption.NOFOLLOW_LINKS)
        && Files.size(file) > 0 && Files.size(file) <= 256);
    byte[] data = Files.readAllBytes(file); require(data.length > 0 && data.length <= 256);
    String value = new String(data, java.nio.charset.StandardCharsets.UTF_8);
    if (value.endsWith("\n")) value = value.substring(0, value.length() - 1);
    require(value.length() >= 16 && value.length() <= 128);
    for (char c : value.toCharArray()) require(c >= 33 && c <= 126);
    return value;
  }
  static void privateDirectory(Path path) throws Exception {
    require(Files.isDirectory(path, LinkOption.NOFOLLOW_LINKS) && !Files.isSymbolicLink(path));
    require(((Number) Files.getAttribute(path, "unix:uid", LinkOption.NOFOLLOW_LINKS)).intValue() == 1000);
    require(Files.getPosixFilePermissions(path).equals(PosixFilePermissions.fromString("rwx------")));
  }
  static byte[] privateFile(Path path, int maximum) throws Exception {
    require(Files.isRegularFile(path, LinkOption.NOFOLLOW_LINKS) && !Files.isSymbolicLink(path)
        && ((Number) Files.getAttribute(path, "unix:uid", LinkOption.NOFOLLOW_LINKS)).intValue() == 1000
        && ((Number) Files.getAttribute(path, "unix:nlink", LinkOption.NOFOLLOW_LINKS)).intValue() == 1
        && Files.getPosixFilePermissions(path).equals(PosixFilePermissions.fromString("rw-------"))
        && Files.size(path) > 0 && Files.size(path) <= maximum);
    byte[] bytes = Files.readAllBytes(path); require(bytes.length > 0 && bytes.length <= maximum); return bytes;
  }
  static void createDirectory(Path path) throws Exception {
    Files.createDirectory(path, PosixFilePermissions.asFileAttribute(PosixFilePermissions.fromString("rwx------")));
  }
  static void sync(Path path) throws Exception {
    try (FileChannel file = FileChannel.open(path, StandardOpenOption.READ)) { file.force(true); }
  }
  static Set<String> entries(Path path) throws Exception {
    Set<String> names = new HashSet<>();
    try (DirectoryStream<Path> children = Files.newDirectoryStream(path)) {
      for (Path child : children) require(names.add(child.getFileName().toString()));
    }
    return names;
  }
  static S3Client client(Settings s, URI endpoint, boolean root) {
    return S3Client.builder().endpointOverride(endpoint).region(Region.of(s.region))
        .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(
            root ? s.rootAccess : s.appAccess, root ? s.rootSecret : s.appSecret)))
        .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).chunkedEncodingEnabled(false).build())
        .httpClientBuilder(UrlConnectionHttpClient.builder().connectionTimeout(Duration.ofSeconds(3)).socketTimeout(Duration.ofSeconds(8)))
        .overrideConfiguration(c -> c.apiCallTimeout(Duration.ofSeconds(15)).apiCallAttemptTimeout(Duration.ofSeconds(10)))
        .build();
  }
  static String policy(Settings s) throws Exception {
    List<Object> statements = new ArrayList<>();
    statements.add(statement(s, Collections.singletonList("s3:ListBucket"), Collections.singletonList("arn:aws:s3:::" + s.bucket)));
    statements.add(statement(s, Arrays.asList("s3:GetObject", "s3:PutObject", "s3:DeleteObject"),
        Arrays.asList("arn:aws:s3:::" + s.bucket + "/plugins/analytics/*", "arn:aws:s3:::" + s.bucket + "/plugins/visualizations/*")));
    Map<String, Object> document = new LinkedHashMap<>(); document.put("Version", "2012-10-17"); document.put("Statement", statements);
    return JSON.writeValueAsString(document);
  }
  static Map<String, Object> statement(Settings s, List<String> actions, List<String> resources) {
    Map<String, Object> value = new LinkedHashMap<>(); value.put("Effect", "Allow");
    value.put("Principal", Collections.singletonMap("AWS", s.appAccess)); value.put("Action", actions); value.put("Resource", resources); return value;
  }
  static Process start(Settings s, Path objects, Path iam, boolean local) throws Exception {
    List<String> command = Arrays.asList(BINARY.toString(), "--port", local ? "127.0.0.1:9000" : ":9000",
        "--admin-port", "127.0.0.1:9001", "--region", s.region, "--iam-dir", iam.toString(),
        "--disable-acl", "--quiet", "--log-level", "silent", "--max-connections", "128", "--max-requests", "32",
        "--admin-max-connections", "4", "--admin-max-requests", "4", "posix", "--fsync", "--object-lock-mode", "flock",
        "--dir-perms", "0700", "--file-perms", "0600", objects.toString());
    ProcessBuilder builder = new ProcessBuilder(command).redirectOutput(ProcessBuilder.Redirect.DISCARD)
        .redirectError(ProcessBuilder.Redirect.DISCARD);
    builder.environment().clear(); builder.environment().put("PATH", "/usr/local/bin:/usr/bin:/bin");
    builder.environment().put("GOMEMLIMIT", "512MiB");
    builder.environment().put("ROOT_ACCESS_KEY_ID", s.rootAccess); builder.environment().put("ROOT_SECRET_ACCESS_KEY", s.rootSecret);
    return builder.start();
  }
  static void stop(Process process) throws Exception {
    if (process == null || !process.isAlive()) return;
    process.destroy();
    if (!process.waitFor(15, TimeUnit.SECONDS)) { process.destroyForcibly(); require(process.waitFor(5, TimeUnit.SECONDS)); }
  }
  static void waitReady(S3Client client, Process process) throws Exception {
    long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(45);
    while (System.nanoTime() < deadline) {
      require(process.isAlive());
      try { client.listBuckets(); return; } catch (Exception unavailable) { Thread.sleep(200); }
    }
    require(false);
  }
  static String xml(String value) {
    return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;").replace("'", "&apos;");
  }
  static void createUser(Settings s) throws Exception {
    String body = "<Account><Access>" + xml(s.appAccess) + "</Access><Secret>" + xml(s.appSecret)
        + "</Secret><Role>user</Role><UserID>1000</UserID><GroupID>1000</GroupID><ProjectID>0</ProjectID></Account>";
    byte[] bytes = body.getBytes(java.nio.charset.StandardCharsets.UTF_8);
    SdkHttpFullRequest signed = Aws4Signer.create().sign(SdkHttpFullRequest.builder().uri(LOCAL_ADMIN)
        .method(SdkHttpMethod.PATCH).putHeader("Content-Type", "application/xml")
        .putHeader("x-amz-content-sha256", hash(bytes)).contentStreamProvider(() -> new ByteArrayInputStream(bytes)).build(),
        Aws4SignerParams.builder().awsCredentials(AwsBasicCredentials.create(s.rootAccess, s.rootSecret))
            .signingName("s3").signingRegion(Region.of(s.region)).build());
    HttpRequest.Builder request = HttpRequest.newBuilder(LOCAL_ADMIN).timeout(Duration.ofSeconds(10))
        .method("PATCH", HttpRequest.BodyPublishers.ofByteArray(bytes));
    signed.headers().forEach((key, values) -> {
      if (!key.equalsIgnoreCase("host") && !key.equalsIgnoreCase("content-length")) for (String value : values) request.header(key, value);
    });
    HttpResponse<InputStream> response = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3))
        .followRedirects(HttpClient.Redirect.NEVER).version(HttpClient.Version.HTTP_1_1).build()
        .send(request.build(), HttpResponse.BodyHandlers.ofInputStream());
    try (InputStream stream = response.body()) {
      require(stream.readNBytes(8193).length <= 8192 && response.statusCode() == 201);
    }
  }
  static Map<String, String> bucketAttributes(Settings settings, Path bucket) throws Exception {
    UserDefinedFileAttributeView attrs = Files.getFileAttributeView(bucket, UserDefinedFileAttributeView.class, LinkOption.NOFOLLOW_LINKS);
    require(attrs != null); List<String> names = new ArrayList<>(attrs.list()); Collections.sort(names);
    require(new HashSet<>(names).equals(new HashSet<>(Arrays.asList("acl", "ownership", "policy"))));
    Map<String, String> hashes = new LinkedHashMap<>();
    for (String name : names) {
      int size = attrs.size(name); require(size > 0 && size <= 65536);
      ByteBuffer value = ByteBuffer.allocate(size); require(attrs.read(name, value) == size);
      byte[] bytes = value.array(); hashes.put(name, hash(bytes));
      if (name.equals("ownership")) require(Arrays.equals(bytes, "BucketOwnerEnforced".getBytes(java.nio.charset.StandardCharsets.US_ASCII)));
      if (name.equals("policy")) require(hash(bytes).equals(hash(policy(settings))));
      if (name.equals("acl")) {
        JsonNode acl = JSON.readTree(bytes);
        require(acl.isObject() && acl.size() == 2 && acl.path("Owner").asText().equals(settings.rootAccess));
        JsonNode grants = acl.path("Grantees"); require(grants.isNull() || grants.isArray() && grants.size() <= 1);
        if (grants.isArray()) for (JsonNode grant : grants) require(grant.isObject() && grant.size() == 3
            && grant.path("Access").asText().equals(settings.rootAccess)
            && grant.path("Permission").asText().equals("FULL_CONTROL") && grant.path("Type").asText().equals("CanonicalUser"));
      }
    }
    return hashes;
  }
  static void verifyIam(Settings s, Path iam) throws Exception {
    privateDirectory(iam); require(entries(iam).equals(new HashSet<>(Arrays.asList("users.json", "users.json.backup"))));
    JsonNode json = JSON.readTree(privateFile(iam.resolve("users.json"), 16384));
    require(json.isObject() && json.size() == 1 && json.path("accessAccounts").isObject() && json.path("accessAccounts").size() == 1);
    JsonNode account = json.path("accessAccounts").path(s.appAccess);
    require(account.isObject() && account.size() == 6 && account.path("access").asText().equals(s.appAccess)
        && account.path("secret").asText().equals(s.appSecret) && account.path("role").asText().equals("user")
        && account.path("userID").isIntegralNumber() && account.path("userID").asInt() == 1000
        && account.path("groupID").isIntegralNumber() && account.path("groupID").asInt() == 1000
        && account.path("projectID").isIntegralNumber() && account.path("projectID").asInt() == 0);
  }
  static void verifyState(Settings s, Path objects, Path iam) throws Exception {
    phase = "retained volume identity verification"; require(Files.isSameFile(ROOT.resolve("objects"), objects));
    phase = "retained lease directory verification"; privateDirectory(ROOT.resolve("lease"));
    phase = "retained object directory verification"; privateDirectory(objects);
    phase = "retained IAM directory verification"; privateDirectory(iam);
    phase = "retained directory inventory verification";
    require(entries(ROOT).equals(new HashSet<>(Arrays.asList("objects", "iam", "lease", MARKER))));
    require(entries(objects).equals(new HashSet<>(Arrays.asList(s.bucket, ".vgwlocks"))));
    privateDirectory(objects.resolve(".vgwlocks"));
    Path bucket = objects.resolve(s.bucket);
    phase = "retained bucket directory verification"; privateDirectory(bucket);
    phase = "retained IAM account verification"; verifyIam(s, iam);
    phase = "installation marker verification";
    JsonNode marker = JSON.readTree(privateFile(ROOT.resolve(MARKER), 16384)); Set<String> fields = new HashSet<>(); marker.fieldNames().forEachRemaining(fields::add);
    require(fields.equals(STATE_FIELDS) && marker.path("format").asText().equals(VERSION));
    phase = "retained configuration identity verification";
    require(marker.path("configurationSha256").asText().equals(s.configuration()));
    phase = "retained IAM digest verification";
    require(marker.path("iamSha256").asText().equals(hash(privateFile(iam.resolve("users.json"), 16384)))
        && marker.path("iamBackupSha256").asText().equals(hash(privateFile(iam.resolve("users.json.backup"), 16384)))
        );
    phase = "retained bucket metadata verification";
    require(marker.path("bucketAttributes").equals(JSON.valueToTree(bucketAttributes(s, bucket)))
        && marker.path("bucketAttributes").path("policy").asText().equals(hash(policy(s))));
  }
  static void bootstrap(Settings s) throws Exception {
    phase = "fresh storage validation";
    require(Files.isDirectory(ROOT, LinkOption.NOFOLLOW_LINKS) && !Files.isSymbolicLink(ROOT) && entries(ROOT).isEmpty());
    createDirectory(ROOT.resolve("lease")); createDirectory(ROOT.resolve("objects")); createDirectory(ROOT.resolve("iam"));
    Path lease = ROOT.resolve("lease/gateway.lock"); Files.createFile(lease, PosixFilePermissions.asFileAttribute(PosixFilePermissions.fromString("rw-------")));
    try (FileChannel channel = FileChannel.open(lease, StandardOpenOption.WRITE); FileLock lock = channel.tryLock()) {
      require(lock != null); Process process = null;
      try (S3Client root = client(s, LOCAL_S3, true)) {
        phase = "isolated gateway startup";
        process = start(s, ROOT.resolve("objects"), ROOT.resolve("iam"), true); waitReady(root, process);
        phase = "application account initialization";
        createUser(s);
        String reviewedPolicy = policy(s);
        phase = "private bucket initialization";
        root.createBucket(b -> b.bucket(s.bucket).objectOwnership(ObjectOwnership.BUCKET_OWNER_ENFORCED));
        root.putBucketPolicy(b -> b.bucket(s.bucket).policy(reviewedPolicy));
        require(root.getBucketAcl(b -> b.bucket(s.bucket)).owner().id().equals(s.rootAccess));
        require(root.getBucketOwnershipControls(b -> b.bucket(s.bucket)).ownershipControls().rules().size() == 1
            && root.getBucketOwnershipControls(b -> b.bucket(s.bucket)).ownershipControls().rules().get(0).objectOwnership() == ObjectOwnership.BUCKET_OWNER_ENFORCED);
        require(root.getBucketPolicy(b -> b.bucket(s.bucket)).policy().equals(policy(s)));
        phase = "bootstrap shutdown"; stop(process); process = null;
        phase = "static IAM durability verification";
        verifyIam(s, ROOT.resolve("iam"));
        for (String file : Arrays.asList("users.json", "users.json.backup")) sync(ROOT.resolve("iam").resolve(file));
        sync(ROOT.resolve("iam")); sync(ROOT.resolve("objects").resolve(s.bucket)); sync(ROOT.resolve("objects")); sync(lease); sync(ROOT.resolve("lease"));
        Map<String, Object> marker = new LinkedHashMap<>(); marker.put("format", VERSION); marker.put("configurationSha256", s.configuration());
        marker.put("iamSha256", hash(privateFile(ROOT.resolve("iam/users.json"), 16384)));
        marker.put("iamBackupSha256", hash(privateFile(ROOT.resolve("iam/users.json.backup"), 16384)));
        phase = "bucket metadata durability verification";
        marker.put("bucketAttributes", bucketAttributes(s, ROOT.resolve("objects").resolve(s.bucket)));
        publishMarker(marker); verifyState(s, ROOT.resolve("objects"), ROOT.resolve("iam"));
      } finally { stop(process); }
    }
    result("FRESH_STORAGE_INITIALIZED", Collections.emptyMap());
  }
  static void publishMarker(Map<String, Object> marker) throws Exception {
    Path pending = ROOT.resolve("installation.partial"); Path complete = ROOT.resolve(MARKER);
    Files.createFile(pending, PosixFilePermissions.asFileAttribute(PosixFilePermissions.fromString("rw-------")));
    byte[] data = JSON.writeValueAsBytes(marker);
    try (FileChannel output = FileChannel.open(pending, StandardOpenOption.WRITE)) {
      ByteBuffer buffer = ByteBuffer.wrap(data); while (buffer.hasRemaining()) output.write(buffer); output.force(true);
    }
    sync(ROOT); boolean linked = false;
    try {
      Files.createLink(complete, pending); linked = true; sync(ROOT); Files.delete(pending); sync(ROOT);
    } catch (Exception failure) {
      if (linked) Files.deleteIfExists(complete);
      throw failure;
    }
  }
  static void serve(Settings s) throws Exception {
    phase = "exclusive storage lease";
    privateDirectory(LEASE); Path lease = LEASE.resolve("gateway.lock");
    require(Files.isSameFile(ROOT.resolve("lease"), LEASE) && Files.isSameFile(ROOT.resolve("objects"), OBJECTS));
    require(Files.isRegularFile(lease, LinkOption.NOFOLLOW_LINKS) && !Files.isSymbolicLink(lease)
        && ((Number) Files.getAttribute(lease, "unix:uid", LinkOption.NOFOLLOW_LINKS)).intValue() == 1000
        && Files.getPosixFilePermissions(lease).equals(PosixFilePermissions.fromString("rw-------")));
    try (FileChannel channel = FileChannel.open(lease, StandardOpenOption.WRITE); FileLock lock = channel.tryLock()) {
      require(lock != null); verifyState(s, OBJECTS, ROOT.resolve("iam"));
      phase = "gateway startup"; Process process = start(s, OBJECTS, ROOT.resolve("iam"), false);
      Thread shutdown = new Thread(() -> { try { Files.deleteIfExists(READY); stop(process); } catch (Exception ignored) {} }); Runtime.getRuntime().addShutdownHook(shutdown);
      try {
        try (S3Client root = client(s, LOCAL_S3, true)) { waitReady(root, process); }
        Files.createFile(READY, PosixFilePermissions.asFileAttribute(PosixFilePermissions.fromString("rw-------")));
        result("STORAGE_SERVING", Collections.emptyMap());
        require(process.waitFor() == 0);
      } finally { Files.deleteIfExists(READY); stop(process); Runtime.getRuntime().removeShutdownHook(shutdown); }
    }
  }
  static void missing(S3ArtifactObjectStore store, PluginArtifact artifact) throws Exception {
    try (InputStream unused = store.open(artifact)) { require(false); }
    catch (PluginStorageException e) { require("PLUGIN_OBJECT_MISSING".equals(e.getCode())); }
  }
  static void probe(Settings s) throws Exception {
    phase = "application storage probe";
    URI endpoint = URI.create(System.getenv().getOrDefault("PLUGIN_STORAGE_S3_ENDPOINT", ""));
    PluginStorageProperties properties = new PluginStorageProperties(); properties.setMode(PluginStorageProperties.Mode.S3);
    properties.setEndpoint(endpoint); properties.setBucket(s.bucket); properties.setRegion(s.region);
    properties.setAccessKey(s.appAccess); properties.setSecretKey(s.appSecret); properties.validateS3();
    byte[] nonce = new byte[32]; new SecureRandom().nextBytes(nonce); ByteArrayOutputStream body = new ByteArrayOutputStream();
    try (ZipOutputStream zip = new ZipOutputStream(body)) { zip.putNextEntry(new ZipEntry("META-INF/openlap-readiness")); zip.write(nonce); zip.closeEntry(); }
    byte[] payload = body.toByteArray(); PluginArtifact artifact = PluginArtifact.staged(PluginKind.ANALYTICS, hash(payload), payload.length, "storage-readiness");
    Path source = Files.createTempFile("openlap-storage-probe-", ".jar"); Files.setPosixFilePermissions(source, PosixFilePermissions.fromString("rw-------"));
    Files.write(source, payload); boolean created = false;
    try (S3ArtifactObjectStore store = S3ArtifactObjectStore.connect(properties); S3Client client = client(s, endpoint, false)) {
      try {
        missing(store, artifact); store.putIfAbsent(artifact, source); created = true;
        try (InputStream input = store.open(artifact)) { ArtifactIntegrity.copyVerified(input, java.io.OutputStream.nullOutputStream(), artifact); }
        var head = client.headObject(b -> b.bucket(s.bucket).key(artifact.getObjectKey()));
        require(head.contentLength() == payload.length && "application/java-archive".equals(head.contentType())
            && artifact.getSha256().equals(head.metadata().get("sha256")));
        store.deleteVerified(artifact); missing(store, artifact); created = false;
        Map<String, Object> detail = new LinkedHashMap<>(); detail.put("artifactSha256", artifact.getSha256()); detail.put("sizeBytes", payload.length);
        detail.put("roundtripVerified", true); detail.put("syntheticObjectRemoved", true); detail.put("catalogChanged", false); detail.put("pluginExecuted", false);
        result("APPLICATION_STORAGE_PROBE_VERIFIED", detail);
      } finally {
        if (created) store.deleteVerified(artifact);
      }
    } finally { Files.deleteIfExists(source); }
  }
  static void result(String status, Map<String, Object> detail) throws Exception {
    Map<String, Object> report = new LinkedHashMap<>(); report.put("schemaVersion", 1); report.put("status", status); report.putAll(detail);
    byte[] bytes = (JSON.writeValueAsString(report) + "\n").getBytes(java.nio.charset.StandardCharsets.US_ASCII);
    require(bytes.length < 4096); System.out.write(bytes); System.out.flush(); require(!System.out.checkError());
  }
  public static void main(String[] args) {
    int exit = 1;
    try {
      require(args.length == 1 && Arrays.asList("--bootstrap-fresh", "--serve", "--check-state", "--probe").contains(args[0]));
      require("Linux".equals(System.getProperty("os.name")));
      if ("--serve".equals(args[0])) Files.deleteIfExists(READY);
      phase = "projected credential validation";
      Settings settings = new Settings(!"--probe".equals(args[0]));
      switch (args[0]) {
        case "--bootstrap-fresh": bootstrap(settings); break;
        case "--serve": serve(settings); break;
        case "--check-state": verifyState(settings, OBJECTS, ROOT.resolve("iam")); result("STORAGE_STATE_VERIFIED", Collections.emptyMap()); break;
        case "--probe": probe(settings); break;
        default: require(false);
      }
      exit = 0;
    } catch (Throwable failure) {
      System.err.println("Storage operation failed during " + phase + ". Retain protected data and review the bounded operation result.");
    }
    System.exit(exit);
  }
}
