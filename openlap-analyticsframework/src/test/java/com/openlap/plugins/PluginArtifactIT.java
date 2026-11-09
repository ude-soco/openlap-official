package com.openlap.plugins;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.mongodb.DBRef;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.openlap.analytics_technique.repositories.AnalyticsTechniqueRepository;
import com.openlap.analytics_technique.services.impl.AnalyticsTechniqueServiceImpl;
import com.openlap.plugins.artifacts.ArtifactIntegrity;
import com.openlap.plugins.artifacts.ArtifactObjectStore;
import com.openlap.plugins.artifacts.PluginArtifact;
import com.openlap.plugins.artifacts.PluginArtifactCache;
import com.openlap.plugins.artifacts.PluginArtifactRegistry;
import com.openlap.plugins.artifacts.PluginArtifactRepository;
import com.openlap.plugins.artifacts.PluginArtifactResolver;
import com.openlap.plugins.artifacts.PluginCatalog;
import com.openlap.plugins.artifacts.PluginCatalogVerifier;
import com.openlap.plugins.artifacts.PluginKind;
import com.openlap.plugins.artifacts.PluginStorageException;
import com.openlap.plugins.artifacts.PluginStorageProperties;
import com.openlap.plugins.artifacts.S3ArtifactObjectStore;
import com.openlap.plugins.migration.PluginArtifactManifest;
import com.openlap.plugins.migration.PluginArtifactMigration;
import com.openlap.visualization_methods.repositories.VisualizationLibraryRepository;
import com.openlap.visualization_methods.repositories.VisualizationTypeRepository;
import com.openlap.visualization_methods.services.impl.VisualizationMethodUtilityServiceImpl;
import java.io.InputStream;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.junit.After;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.repository.support.MongoRepositoryFactory;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;

/** Opt-in only: scripts/test-plugin-artifacts.py supplies disposable, loopback-only services. */
public class PluginArtifactIT {
  @Rule public TemporaryFolder temporary = new TemporaryFolder();
  private MongoClient client;
  private MongoTemplate mongo;
  private PluginArtifactRepository artifacts;
  private S3ArtifactObjectStore store;
  private PluginArtifactRegistry registry;
  private PluginStorageProperties properties;
  private Path source;
  private Path jar;
  private PluginArtifactMigration migration;
  private final ObjectId methodId = new ObjectId();
  private final ObjectId libraryId = new ObjectId();
  private final ObjectId typeId = new ObjectId();
  private final ObjectId indicatorId = new ObjectId();
  private final List<AutoCloseable> closeables = new ArrayList<>();

  @Before
  public void setUp() throws Exception {
    properties = new PluginStorageProperties();
    properties.setMode(PluginStorageProperties.Mode.S3);
    URI endpoint = URI.create(required("PLUGIN_IT_S3_ENDPOINT"));
    URI mongoEndpoint = URI.create(required("PLUGIN_IT_MONGO_URI"));
    assertThat(endpoint.getHost()).isEqualTo("127.0.0.1");
    assertThat(mongoEndpoint.getHost()).isEqualTo("127.0.0.1");
    properties.setEndpoint(endpoint);
    properties.setBucket(required("PLUGIN_IT_S3_BUCKET"));
    properties.setAccessKey(required("PLUGIN_IT_S3_ACCESS_KEY"));
    properties.setSecretKey(required("PLUGIN_IT_S3_SECRET_KEY"));
    store = S3ArtifactObjectStore.connect(properties);
    closeables.add(store);
    client = MongoClients.create(mongoEndpoint.toString());
    mongo = new MongoTemplate(client, "plugin_artifacts_it_" + UUID.randomUUID().toString().replace("-", ""));
    artifacts = new MongoRepositoryFactory(mongo).getRepository(PluginArtifactRepository.class);
    registry = new PluginArtifactRegistry(artifacts, mongo, store);
    source = temporary.newFolder("sources").toPath();
    jar = PluginJarFixture.create(source, "installed.jar", "version" + UUID.randomUUID().toString().replace("-", ""));
    migration = new PluginArtifactMigration(mongo, Collections.singletonList(source));
    mongo.getCollection("analytics-technique").insertOne(new Document("_id", methodId)
        .append("name", "Edited analytics name").append("description", "Administrator metadata")
        .append("fileName", jar.toString()).append("implementingClass", PluginJarFixture.ANALYTICS_CLASS)
        .append("enabled", false).append("customLegacyField", Arrays.asList("retain", "me")));
    mongo.getCollection("visualization-library").insertOne(new Document("_id", libraryId)
        .append("name", "Edited library").append("frameworkLocation", jar.toString()).append("enabled", false));
    mongo.getCollection("visualization-type").insertOne(new Document("_id", typeId)
        .append("name", "Edited chart").append("implementingClass", PluginJarFixture.VISUALIZATION_CLASS)
        .append("visualizationLib", new DBRef("visualization-library", libraryId)).append("enabled", false));
    mongo.getCollection("indicator").insertOne(new Document("_id", indicatorId)
        .append("analytics", new DBRef("analytics-technique", methodId))
        .append("visualization", new DBRef("visualization-type", typeId)));
  }

  @After
  public void tearDown() throws Exception {
    try {
      for (int i = closeables.size() - 1; i >= 0; i--) closeables.get(i).close();
    } finally {
      if (mongo != null) mongo.getDb().drop();
      if (client != null) client.close();
    }
  }

  @Test
  public void migrationPreservesCatalogAndIndependentBackendsLoadWithoutSourceJars() throws Exception {
    Document methodBefore = row("analytics-technique", methodId);
    Document libraryBefore = row("visualization-library", libraryId);
    Document typeBefore = row("visualization-type", typeId);
    Document indicatorBefore = row("indicator", indicatorId);
    PluginArtifactManifest manifest = migration.inventory();
    assertThat(manifest.entries).hasSize(2).allSatisfy(item -> assertThat(item.problem).isNull());
    migration.preflight(manifest);
    assertThat(artifacts.count()).isZero();
    assertThat(row("analytics-technique", methodId)).isEqualTo(methodBefore);
    assertThat(migration.apply(manifest, registry)).isEqualTo(2);
    assertThat(migration.apply(manifest, registry)).isEqualTo(2);
    assertThat(artifacts.findAll()).hasSize(2).allSatisfy(artifact ->
        assertThat(artifact.getState()).isEqualTo(PluginArtifact.State.READY));
    assertOnlyArtifactChanged("analytics-technique", methodId, methodBefore);
    assertOnlyArtifactChanged("visualization-library", libraryId, libraryBefore);
    assertThat(row("visualization-type", typeId)).isEqualTo(typeBefore);
    assertThat(row("indicator", indicatorId)).isEqualTo(indicatorBefore);
    String marker;
    try (Backend first = backend("first")) { marker = first.assertLoads(null); }
    Files.delete(jar);
    // No source filesystem is available to either new backend; both must fill their own caches.
    try (Backend second = backend("second"); Backend third = backend("third")) {
      second.assertLoads(marker);
      third.assertLoads(marker);
    }
    // A restarted JVM can rebuild an entirely empty cache from the same immutable artifacts.
    try (Backend restarted = backend("restart")) { restarted.assertLoads(marker); }
  }

  @Test
  public void incompleteChangedAndWrongClassMappingsCannotWriteAnything() throws Exception {
    PluginArtifactManifest incomplete = migration.inventory();
    incomplete.entries.remove(0);
    assertThatThrownBy(() -> migration.apply(incomplete, registry)).isInstanceOf(PluginStorageException.class);
    PluginArtifactManifest changed = migration.inventory();
    PluginJarFixture.create(source, "installed.jar", "changed");
    assertThatThrownBy(() -> migration.apply(changed, registry)).isInstanceOf(PluginStorageException.class);
    mongo.getCollection("analytics-technique").updateOne(new Document("_id", methodId),
        new Document("$set", new Document("implementingClass", "fixture.MissingClass")));
    PluginArtifactManifest wrongClass = migration.inventory();
    assertThat(wrongClass.entries).anySatisfy(item -> assertThat(item.problem).isNotNull());
    assertThatThrownBy(() -> migration.apply(wrongClass, registry)).isInstanceOf(PluginStorageException.class);
    assertNoAttachments();
    assertThat(artifacts.count()).isZero();
  }

  @Test
  public void conflictingReplicaCopiesRequireAnExplicitReviewedMapping() throws Exception {
    Path replica = temporary.newFolder("replica").toPath();
    PluginJarFixture.create(replica, "installed.jar", "differentReplica");
    PluginArtifactMigration conflicted = new PluginArtifactMigration(mongo, Arrays.asList(source, replica));
    PluginArtifactManifest manifest = conflicted.inventory();
    assertThat(manifest.files).hasSize(2);
    assertThat(manifest.entries).allSatisfy(item -> {
      assertThat(item.sourcePath).isNull();
      assertThat(item.problem).isEqualTo("CONFLICTING_COPIES_CHOOSE_SOURCE_EXPLICITLY");
    });
    assertThatThrownBy(() -> conflicted.apply(manifest, registry)).isInstanceOf(PluginStorageException.class);
    assertNoAttachments();
    for (PluginArtifactManifest.Item item : manifest.entries) {
      item.sourcePath = jar.toString();
      item.sha256 = ArtifactIntegrity.sha256(jar);
      item.sizeBytes = Files.size(jar);
      item.problem = null;
    }
    assertThat(conflicted.apply(manifest, registry)).isEqualTo(2);
  }

  @Test
  public void outageLeavesStagedArtifactsThatCanBeRetriedWithoutRewritingTheirAudit() throws Exception {
    ArtifactObjectStore offline = new ArtifactObjectStore() {
      public void putIfAbsent(PluginArtifact artifact, Path snapshot) { throw new PluginStorageException("TEST_OUTAGE", "Test storage offline."); }
      public InputStream open(PluginArtifact artifact) { throw new AssertionError("No read after failed write."); }
    };
    PluginArtifactManifest manifest = migration.inventory();
    assertThatThrownBy(() -> migration.apply(manifest, new PluginArtifactRegistry(artifacts, mongo, offline)))
        .isInstanceOf(PluginStorageException.class).hasMessageContaining("offline");
    assertNoAttachments();
    assertThat(artifacts.count()).isEqualTo(1);
    PluginArtifact staged = artifacts.findAll().get(0);
    assertThat(staged.getState()).isEqualTo(PluginArtifact.State.STAGED);
    assertThat(migration.apply(manifest, registry)).isEqualTo(2);
    PluginArtifact ready = artifacts.findById(staged.getId()).get();
    assertThat(ready.getState()).isEqualTo(PluginArtifact.State.READY);
    assertThat(ready.getCreatedAt()).isEqualTo(staged.getCreatedAt());
    assertThat(ready.getCreatedBy()).isEqualTo(staged.getCreatedBy());
  }

  @Test
  public void partiallyStoredImportDoesNotAttachAnyCatalogReferences() throws Exception {
    ArtifactObjectStore partial = new ArtifactObjectStore() {
      public void putIfAbsent(PluginArtifact artifact, Path snapshot) {
        if (artifact.getKind() == PluginKind.VISUALIZATION) throw new PluginStorageException("TEST_OUTAGE", "offline");
        store.putIfAbsent(artifact, snapshot);
      }
      public InputStream open(PluginArtifact artifact) { return store.open(artifact); }
    };
    PluginArtifactManifest manifest = migration.inventory();
    assertThatThrownBy(() -> migration.apply(manifest, new PluginArtifactRegistry(artifacts, mongo, partial)))
        .isInstanceOf(PluginStorageException.class).hasMessage("offline");
    assertThat(artifacts.findAll()).extracting(PluginArtifact::getState)
        .containsExactlyInAnyOrder(PluginArtifact.State.READY, PluginArtifact.State.STAGED);
    assertNoAttachments();
    assertThat(migration.apply(manifest, registry)).isEqualTo(2);
  }

  @Test
  public void concurrentImportsConvergeOnTheSameVerifiedArtifacts() throws Exception {
    ExecutorService executor = Executors.newFixedThreadPool(2);
    try (S3ArtifactObjectStore secondStore = S3ArtifactObjectStore.connect(properties)) {
      PluginArtifactRegistry secondRegistry = new PluginArtifactRegistry(artifacts, mongo, secondStore);
      PluginArtifactManifest manifest = migration.inventory();
      CyclicBarrier start = new CyclicBarrier(2);
      Future<Integer> first = executor.submit(() -> { start.await(); return migration.apply(manifest, registry); });
      Future<Integer> second = executor.submit(() -> { start.await(); return migration.apply(manifest, secondRegistry); });
      assertThat(first.get()).isEqualTo(2);
      assertThat(second.get()).isEqualTo(2);
      assertThat(artifacts.findAll()).hasSize(2).allSatisfy(artifact ->
          assertThat(artifact.getState()).isEqualTo(PluginArtifact.State.READY));
      for (PluginArtifact artifact : artifacts.findAll()) {
        try (InputStream input = store.open(artifact)) {
          ArtifactIntegrity.copyVerified(input, java.io.OutputStream.nullOutputStream(), artifact);
        }
      }
    } finally { executor.shutdownNow(); }
  }

  @Test
  public void corruptExistingObjectIsRejectedWithoutOverwriteOrCatalogAttachment() throws Exception {
    PluginArtifact expected = PluginArtifact.staged(PluginKind.ANALYTICS, ArtifactIntegrity.sha256(jar), Files.size(jar), "test");
    try (S3Client raw = rawClient()) {
      raw.putObject(request -> request.bucket(properties.getBucket()).key(expected.getObjectKey()), RequestBody.fromString("corrupt existing object"));
      assertThatThrownBy(() -> migration.apply(migration.inventory(), registry)).isInstanceOf(PluginStorageException.class);
      assertThat(raw.getObjectAsBytes(request -> request.bucket(properties.getBucket()).key(expected.getObjectKey())).asUtf8String())
          .isEqualTo("corrupt existing object");
    }
    assertNoAttachments();
    assertThat(artifacts.findById(expected.getId()).get().getState()).isEqualTo(PluginArtifact.State.STAGED);
  }

  private void assertOnlyArtifactChanged(String collection, ObjectId id, Document before) {
    Document after = row(collection, id);
    assertThat(after.remove("artifactId")).isInstanceOf(String.class);
    assertThat(after).isEqualTo(before);
  }

  private void assertNoAttachments() {
    assertThat(row("analytics-technique", methodId)).doesNotContainKey("artifactId");
    assertThat(row("visualization-library", libraryId)).doesNotContainKey("artifactId");
  }

  private Document row(String collection, ObjectId id) {
    return mongo.getCollection(collection).find(new Document("_id", id)).first();
  }

  private Backend backend(String name) throws Exception { return new Backend(temporary.newFolder(name).toPath()); }

  private final class Backend implements AutoCloseable {
    private final S3ArtifactObjectStore ownStore = S3ArtifactObjectStore.connect(properties);
    private final PluginArtifactCache cache;
    private final AnalyticsTechniqueServiceImpl analytics;
    private final VisualizationMethodUtilityServiceImpl visualization;

    Backend(Path cacheRoot) {
      cache = new PluginArtifactCache(cacheRoot, 10 * 1024 * 1024, 10, ownStore);
      PluginArtifactRegistry ownRegistry = new PluginArtifactRegistry(artifacts, mongo, ownStore);
      PluginArtifactResolver resolver = new PluginArtifactResolver(PluginStorageProperties.Mode.S3, ownRegistry, cache);
      new PluginCatalogVerifier(new PluginCatalog(mongo), ownRegistry, cache).afterSingletonsInstantiated();
      // Real repositories exercise ObjectId conversion and visualization DBRef loading too.
      MongoRepositoryFactory repositories = new MongoRepositoryFactory(mongo);
      analytics = new AnalyticsTechniqueServiceImpl(repositories.getRepository(AnalyticsTechniqueRepository.class), resolver);
      visualization = new VisualizationMethodUtilityServiceImpl(repositories.getRepository(VisualizationTypeRepository.class),
          repositories.getRepository(VisualizationLibraryRepository.class), resolver);
    }

    String assertLoads(String expected) {
      String marker = analytics.loadAnalyticsMethodInstance(methodId.toHexString()).getAnalyticsMethodName();
      assertThat(visualization.loadVisTypeInstance(typeId.toHexString()).getName()).isEqualTo(marker);
      if (expected != null) assertThat(marker).isEqualTo(expected);
      return marker;
    }

    @Override public void close() throws java.io.IOException {
      analytics.closePluginLoaders();
      visualization.closePluginLoaders();
      cache.close();
      ownStore.close();
    }
  }

  private S3Client rawClient() {
    return S3Client.builder().endpointOverride(properties.getEndpoint()).region(Region.of(properties.getRegion()))
        .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(properties.getAccessKey(), properties.getSecretKey())))
        .httpClientBuilder(UrlConnectionHttpClient.builder())
        .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).chunkedEncodingEnabled(false).build()).build();
  }

  private static String required(String name) {
    String value = System.getenv(name);
    if (value == null || value.isEmpty()) throw new AssertionError("Run scripts/test-plugin-artifacts.py to supply disposable integration services.");
    return value;
  }
}
