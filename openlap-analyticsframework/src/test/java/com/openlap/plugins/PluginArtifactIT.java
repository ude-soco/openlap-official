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
import com.openlap.plugins.management.PluginCatalogVisibility;
import com.openlap.plugins.management.PluginManagementService;
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
import java.util.Map;
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
import org.springframework.mock.web.MockMultipartFile;
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

  @Test
  public void uploadsRequireExplicitInspectionAndBothKindsActivateWithoutReplacingExistingEntries() throws Exception {
    Path managed = ManagedPluginFixture.create(source, "Upload" + UUID.randomUUID().toString().replace("-", ""), false);
    PluginManagementService management = management(mongo);
    System.clearProperty("openlap.fixture.inspected");
    Map<String, Object> analytics = upload(management, managed, PluginKind.ANALYTICS);
    Map<String, Object> visualization = upload(management, managed, PluginKind.VISUALIZATION);
    assertThat(System.getProperty("openlap.fixture.inspected")).isNull();
    assertThat(analytics.get("state")).isEqualTo("UPLOADED");
    String analyticsId = (String) analytics.get("id");
    long uploadedVersion = version(analytics);
    assertThatThrownBy(() -> management.activate(analyticsId, uploadedVersion)).isInstanceOf(com.openlap.infrastructure.exception.ConflictException.class);
    assertThatThrownBy(() -> management.inspect(analyticsId, uploadedVersion, false)).isInstanceOf(com.openlap.infrastructure.exception.ValidationException.class);
    assertThat(mongo.getCollection("analytics-technique").countDocuments()).isEqualTo(1);
    analytics = management.inspect(analyticsId, version(analytics), true);
    assertThat(analytics.get("state")).isEqualTo("INSPECTED");
    assertThat(mongo.getCollection("analytics-technique").countDocuments()).isEqualTo(1);
    analytics = management.activate(analyticsId, version(analytics));
    String visualizationId = (String) visualization.get("id");
    visualization = management.inspect(visualizationId, version(visualization), true);
    visualization = management.activate(visualizationId, version(visualization));
    assertThat(analytics.get("state")).isEqualTo("ACTIVE");
    assertThat(visualization.get("state")).isEqualTo("ACTIVE");
    assertThat(upload(management, managed, PluginKind.ANALYTICS).get("id")).isEqualTo(analyticsId);
    assertThat(management.activate(analyticsId, -1L).get("state")).isEqualTo("ACTIVE");
    assertThat(mongo.getCollection("analytics-technique").countDocuments()).isEqualTo(2);
    assertThat(row("analytics-technique", methodId).getBoolean("enabled")).isFalse();
    MongoRepositoryFactory repositories = new MongoRepositoryFactory(mongo);
    com.openlap.visualization_methods.entities.VisLibrary library = repositories.getRepository(VisualizationLibraryRepository.class)
        .findAll().stream().filter(item -> visualizationId.equals(item.getInstallationId())).findFirst().get();
    assertThat(library.getVisualizationTypes()).hasSize(1);
    assertThat(library.getVisualizationTypes().get(0).getVisualizationLib().getId()).isEqualTo(library.getId());
    String chartId = library.getVisualizationTypes().get(0).getId();
    PluginArtifactCache runtimeCache = new PluginArtifactCache(temporary.newFolder("managed-runtime").toPath(), 1000000, 10, store);
    closeables.add(runtimeCache);
    PluginArtifactResolver resolver = new PluginArtifactResolver(PluginStorageProperties.Mode.S3, registry, runtimeCache);
    com.openlap.plugins.management.PluginCatalogVisibility visibility = new PluginCatalogVisibility(mongo);
    AnalyticsTechniqueServiceImpl analyticsRuntime = new AnalyticsTechniqueServiceImpl(repositories.getRepository(AnalyticsTechniqueRepository.class), resolver, visibility);
    VisualizationMethodUtilityServiceImpl visualRuntime = new VisualizationMethodUtilityServiceImpl(repositories.getRepository(VisualizationTypeRepository.class),
        repositories.getRepository(VisualizationLibraryRepository.class), resolver, visibility);
    try {
      String method = repositories.getRepository(AnalyticsTechniqueRepository.class).findAll().stream()
          .filter(item -> analyticsId.equals(item.getInstallationId())).findFirst().get().getId();
      assertThat(analyticsRuntime.loadAnalyticsMethodInstance(method).getAnalyticsMethodName()).startsWith("Method Upload");
      assertThat(visualRuntime.loadVisTypeInstance(chartId).getName()).startsWith("Chart Upload");
    } finally { analyticsRuntime.closePluginLoaders(); visualRuntime.closePluginLoaders(); System.clearProperty("openlap.fixture.inspected"); }
  }

  @Test
  public void partialActivationIsHiddenAndResumesWithoutDuplicateCatalogRows() throws Exception {
    Path managed = ManagedPluginFixture.create(source, "Partial" + UUID.randomUUID().toString().replace("-", ""), false);
    MongoTemplate interrupted = org.mockito.Mockito.spy(mongo);
    java.util.concurrent.atomic.AtomicInteger writes = new java.util.concurrent.atomic.AtomicInteger();
    org.mockito.Mockito.doAnswer(call -> {
      if (writes.incrementAndGet() == 2) throw new org.springframework.dao.DataAccessResourceFailureException("simulated outage");
      return call.callRealMethod();
    }).when(interrupted).upsert(org.mockito.ArgumentMatchers.any(org.springframework.data.mongodb.core.query.Query.class),
        org.mockito.ArgumentMatchers.any(org.springframework.data.mongodb.core.query.Update.class), org.mockito.ArgumentMatchers.anyString());
    PluginManagementService management = management(interrupted);
    Map<String, Object> upload = upload(management, managed, PluginKind.VISUALIZATION);
    String id = (String) upload.get("id");
    Map<String, Object> inspected = management.inspect(id, version(upload), true);
    assertThatThrownBy(() -> management.activate(id, version(inspected))).isInstanceOf(org.springframework.dao.DataAccessException.class);
    assertThat(management.get(id).get("state")).isEqualTo("ACTIVATING");
    assertThat(new PluginCatalogVisibility(mongo).isInstalled(id)).isFalse();
    assertThat(new PluginCatalog(mongo).entries()).hasSize(2); // Only the two original legacy entries.
    Document staged = mongo.getCollection("visualization-type").find(new Document("installationId", id)).first();
    assertThat(staged).isNotNull();
    assertThatThrownBy(() -> new PluginCatalogVisibility(mongo).requireInstalled(id)).isInstanceOf(com.openlap.infrastructure.exception.ConflictException.class);
    MongoRepositoryFactory repositories = new MongoRepositoryFactory(mongo);
    VisualizationTypeRepository types = repositories.getRepository(VisualizationTypeRepository.class);
    VisualizationLibraryRepository libraries = repositories.getRepository(VisualizationLibraryRepository.class);
    VisualizationMethodUtilityServiceImpl utility = new VisualizationMethodUtilityServiceImpl(types, libraries,
        PluginArtifactResolver.local(), new PluginCatalogVisibility(mongo));
    assertThatThrownBy(() -> utility.fetchVisualizationTypeMethod(staged.getString("_id")))
        .isInstanceOf(com.openlap.infrastructure.exception.ConflictException.class);
    assertThat(new com.openlap.visualization_methods.services.impl.VisualizationTypeServiceImpl(types, utility, libraries,
        new PluginCatalogVisibility(mongo)).getAllVisualizationTypes()).isEmpty();
    assertThat(management.activate(id, version(management.get(id))).get("state")).isEqualTo("ACTIVE");
    assertThat(mongo.getCollection("visualization-type").countDocuments(new Document("installationId", id))).isEqualTo(1);
    assertThat(mongo.getCollection("visualization-library").countDocuments(new Document("installationId", id))).isEqualTo(1);
  }

  @Test
  public void concurrentActivationAttemptsCannotReleaseAnInProgressCatalogLock() throws Exception {
    Path managed = ManagedPluginFixture.create(source, "Concurrent" + UUID.randomUUID().toString().replace("-", ""), false);
    java.util.concurrent.CountDownLatch entered = new java.util.concurrent.CountDownLatch(1);
    java.util.concurrent.CountDownLatch release = new java.util.concurrent.CountDownLatch(1);
    MongoTemplate blocked = org.mockito.Mockito.spy(mongo);
    org.mockito.Mockito.doAnswer(call -> {
      entered.countDown();
      if (!release.await(15, java.util.concurrent.TimeUnit.SECONDS)) throw new AssertionError("Activation test did not release its writer.");
      return call.callRealMethod();
    }).when(blocked).upsert(org.mockito.ArgumentMatchers.any(org.springframework.data.mongodb.core.query.Query.class),
        org.mockito.ArgumentMatchers.any(org.springframework.data.mongodb.core.query.Update.class), org.mockito.ArgumentMatchers.anyString());
    PluginManagementService first = management(blocked);
    PluginManagementService second = management(mongo);
    Map<String, Object> uploaded = upload(first, managed, PluginKind.ANALYTICS);
    String id = (String) uploaded.get("id");
    Map<String, Object> reviewed = first.inspect(id, version(uploaded), true);
    ExecutorService executor = Executors.newSingleThreadExecutor();
    try {
      Future<Map<String, Object>> activation = executor.submit(() -> first.activate(id, version(reviewed)));
      assertThat(entered.await(10, java.util.concurrent.TimeUnit.SECONDS)).isTrue();
      assertThatThrownBy(() -> second.activate(id, version(second.get(id))))
          .isInstanceOf(com.openlap.infrastructure.exception.ConflictException.class).hasMessageContaining("in progress");
      assertThat(new PluginCatalogVisibility(mongo).isInstalled(id)).isFalse();
      Map<String, Object> visualization = upload(second, managed, PluginKind.VISUALIZATION);
      String otherId = (String) visualization.get("id");
      Map<String, Object> otherReview = second.inspect(otherId, version(visualization), true);
      assertThatThrownBy(() -> second.activate(otherId, version(otherReview)))
          .isInstanceOf(com.openlap.infrastructure.exception.ConflictException.class).hasMessageContaining("must finish first");
      release.countDown();
      assertThat(activation.get().get("state")).isEqualTo("ACTIVE");
      assertThat(second.activate(otherId, version(second.get(otherId))).get("state")).isEqualTo("ACTIVE");
      assertThat(mongo.getCollection("analytics-technique").countDocuments(new Document("installationId", id))).isEqualTo(1);
    } finally { release.countDown(); executor.shutdownNow(); }
  }

  @Test
  public void differentBytesWithExistingEntryClassesCannotReplaceAnInstalledPlugin() throws Exception {
    Path managed = ManagedPluginFixture.create(source, "Duplicate" + UUID.randomUUID().toString().replace("-", ""), false);
    PluginManagementService management = management(mongo);
    Map<String, Object> uploaded = upload(management, managed, PluginKind.ANALYTICS);
    String id = (String) uploaded.get("id");
    Map<String, Object> reviewed = management.inspect(id, version(uploaded), true);
    management.activate(id, version(reviewed));
    Path changed = source.resolve("different-bytes.jar");
    try (java.util.jar.JarFile input = new java.util.jar.JarFile(managed.toFile());
         java.util.jar.JarOutputStream output = new java.util.jar.JarOutputStream(Files.newOutputStream(changed))) {
      for (java.util.jar.JarEntry entry : Collections.list(input.entries())) {
        output.putNextEntry(new java.util.jar.JarEntry(entry.getName()));
        try (InputStream bytes = input.getInputStream(entry)) { bytes.transferTo(output); }
        output.closeEntry();
      }
      output.putNextEntry(new java.util.jar.JarEntry("version.txt"));
      output.write(new byte[] {1});
      output.closeEntry();
    }
    Map<String, Object> other = upload(management, changed, PluginKind.ANALYTICS);
    String otherId = (String) other.get("id");
    assertThat(otherId).isNotEqualTo(id);
    assertThat((List<?>) other.get("conflicts")).isNotEmpty();
    Map<String, Object> otherReview = management.inspect(otherId, version(other), true);
    assertThatThrownBy(() -> management.activate(otherId, version(otherReview)))
        .isInstanceOf(com.openlap.infrastructure.exception.ConflictException.class).hasMessageContaining("Already installed");
    assertThat(mongo.getCollection("analytics-technique").countDocuments()).isEqualTo(2);
    assertThat(management.get(id).get("state")).isEqualTo("ACTIVE");
  }

  private PluginManagementService management(MongoTemplate template) throws Exception {
    PluginArtifactCache cache = new PluginArtifactCache(temporary.newFolder().toPath(), 1000000, 20, store);
    closeables.add(cache);
    return new PluginManagementService(template, properties, registry, cache);
  }

  @Test
  public void expiredCrashClaimsAndPostCommitLocksCanBeRecoveredExplicitly() throws Exception {
    Path managed = ManagedPluginFixture.create(source, "Crash" + UUID.randomUUID().toString().replace("-", ""), false);
    PluginManagementService management = management(mongo);
    Map<String, Object> uploaded = upload(management, managed, PluginKind.ANALYTICS);
    String id = (String) uploaded.get("id");
    java.util.Date expired = java.util.Date.from(java.time.Instant.now().minusSeconds(660));
    mongo.getCollection("plugin-installation").updateOne(new Document("_id", id),
        new Document("$set", new Document("state", "INSPECTING").append("inspectionClaim", "abandoned")
            .append("inspectionStartedAt", expired).append("version", 1L)));
    Map<String, Object> review = management.inspect(id, 1L, true);
    mongo.getCollection("plugin-management-lock").insertOne(new Document("_id", "catalog-activation")
        .append("owner", id).append("claim", "crashed").append("running", true).append("startedAt", expired));
    assertThat(management.activate(id, version(review)).get("state")).isEqualTo("ACTIVE");
    // Simulate losing the final lock-cleanup acknowledgement after the ACTIVE commit.
    mongo.getCollection("plugin-management-lock").insertOne(new Document("_id", "catalog-activation")
        .append("owner", id).append("claim", "committed").append("running", true).append("startedAt", new java.util.Date()));
    Map<String, Object> visualization = upload(management, managed, PluginKind.VISUALIZATION);
    String nextId = (String) visualization.get("id");
    Map<String, Object> nextReview = management.inspect(nextId, version(visualization), true);
    assertThat(management.activate(nextId, version(nextReview)).get("state")).isEqualTo("ACTIVE");
    assertThat(mongo.getCollection("plugin-management-lock").countDocuments()).isZero();
  }

  private Map<String, Object> upload(PluginManagementService management, Path jar, PluginKind kind) throws Exception {
    return management.upload(kind, new MockMultipartFile("file", jar.getFileName().toString(), "application/java-archive", Files.readAllBytes(jar)), "test-admin");
  }

  private static long version(Map<String, Object> review) { return ((Number) review.get("version")).longValue(); }

  @Test
  public void metadataEditsPreserveBinaryIdentityLegacyIdsAndUnknownFields() {
    com.openlap.plugins.management.PluginCatalogEditor editor = new com.openlap.plugins.management.PluginCatalogEditor(mongo);
    Document before = row("analytics-technique", methodId);
    Map<String, Object> update = new java.util.LinkedHashMap<>();
    update.put("version", 0L); update.put("name", "Edited name"); update.put("description", "Updated description"); update.put("creator", "Admin attribution");
    Map<String, Object> result = editor.edit(com.openlap.plugins.management.PluginCatalogKind.ANALYTICS_METHOD, methodId.toHexString(), update);
    assertThat(result.get("version")).isEqualTo(1L);
    Document after = row("analytics-technique", methodId);
    assertThat(after.get("_id")).isEqualTo(methodId);
    for (String field : Arrays.asList("fileName", "implementingClass", "enabled", "customLegacyField")) assertThat(after.get(field)).isEqualTo(before.get(field));
    assertThat(row("indicator", indicatorId).get("analytics")).isEqualTo(new DBRef("analytics-technique", methodId));
    assertThatThrownBy(() -> editor.edit(com.openlap.plugins.management.PluginCatalogKind.ANALYTICS_METHOD, methodId.toHexString(), update))
        .isInstanceOf(com.openlap.infrastructure.exception.ConflictException.class);
    update.put("version", 1L); update.put("artifactId", "cannot-change-binary");
    assertThatThrownBy(() -> editor.edit(com.openlap.plugins.management.PluginCatalogKind.ANALYTICS_METHOD, methodId.toHexString(), update))
        .isInstanceOf(com.openlap.infrastructure.exception.ValidationException.class);
  }

  @Test
  public void statusUpdatesInvalidateStaleMetadataEditsWithoutOverwritingFields() {
    com.openlap.plugins.management.PluginCatalogEditor editor = new com.openlap.plugins.management.PluginCatalogEditor(mongo);
    editor.setEnabled(com.openlap.plugins.management.PluginCatalogKind.ANALYTICS_METHOD, methodId.toHexString(), true);
    Map<String, Object> stale = new java.util.LinkedHashMap<>(); stale.put("version", 0L); stale.put("name", "Stale edit");
    assertThatThrownBy(() -> editor.edit(com.openlap.plugins.management.PluginCatalogKind.ANALYTICS_METHOD, methodId.toHexString(), stale))
        .isInstanceOf(com.openlap.infrastructure.exception.ConflictException.class);
    assertThat(row("analytics-technique", methodId).getBoolean("enabled")).isTrue();
    assertThat(row("analytics-technique", methodId).get("customLegacyField")).isEqualTo(Arrays.asList("retain", "me"));
    // Explicit null revisions in historical documents use the same initial revision as missing fields.
    mongo.getCollection("visualization-type").updateOne(new Document("_id", typeId), new Document("$set", new Document("managementVersion", null)));
    Map<String, Object> typeEdit = new java.util.LinkedHashMap<>(); typeEdit.put("version", 0L); typeEdit.put("description", "Accessible chart description");
    editor.edit(com.openlap.plugins.management.PluginCatalogKind.VISUALIZATION_TYPE, typeId.toHexString(), typeEdit);
    assertThat(row("visualization-type", typeId).getString("description")).isEqualTo("Accessible chart description");
  }

  @Test
  public void replacementVersionsKeepOriginalExecutionMetadataAndDisabledStates() throws Exception {
    for (PluginKind pluginKind : PluginKind.values()) {
      com.openlap.plugins.management.PluginCatalogKind catalogKind = pluginKind == PluginKind.ANALYTICS
          ? com.openlap.plugins.management.PluginCatalogKind.ANALYTICS_METHOD : com.openlap.plugins.management.PluginCatalogKind.VISUALIZATION_LIBRARY;
      String suffix = "Versions" + UUID.randomUUID().toString().replace("-", "");
      PluginManagementService service = management(mongo);
      Path firstJar = ManagedPluginFixture.create(source, suffix, false, "v1");
      Map<String, Object> first = upload(service, firstJar, pluginKind);
      String firstId = (String) first.get("id");
      first = service.inspect(firstId, version(first), true);
      service.activate(firstId, version(first));
      Document original = mongo.getCollection(catalogKind.collection).find(new Document("installationId", firstId)).first();
      String oldId = original.get("_id").toString();
      com.openlap.plugins.management.PluginCatalogEditor editor = new com.openlap.plugins.management.PluginCatalogEditor(mongo);
      Map<String, Object> edit = new java.util.LinkedHashMap<>();
      edit.put("version", 0L); edit.put("name", "Administrator " + suffix); edit.put("description", "Preserved metadata"); edit.put("creator", "Admin attribution");
      editor.edit(catalogKind, oldId, edit);
      if (pluginKind == PluginKind.ANALYTICS) editor.setEnabled(catalogKind, oldId, false);
      else {
        Document chart = mongo.getCollection("visualization-type").find(new Document("installationId", firstId)).first();
        editor.setEnabled(com.openlap.plugins.management.PluginCatalogKind.VISUALIZATION_TYPE, chart.getString("_id"), false);
      }
      Path secondJar = ManagedPluginFixture.create(source, suffix, false, "v2");
      Map<String, Object> second = service.upload(pluginKind, new MockMultipartFile("file", "v2.jar", "application/java-archive", Files.readAllBytes(secondJar)), "admin", catalogKind, oldId);
      String secondId = (String) second.get("id");
      assertThat(secondId).contains("-r-");
      second = service.inspect(secondId, version(second), true);
      assertThat((List<?>) second.get("conflicts")).isEmpty();
      Map<String, Object> mapping = mapping(second);
      second = service.configureReplacement(secondId, version(second), mapping);
      // A concurrent edit requires another explicit mapping review, without altering the old version.
      Map<String, Object> changed = new java.util.LinkedHashMap<>();
      changed.put("version", editor.details(catalogKind, oldId).get("version")); changed.put("description", "Concurrent metadata");
      editor.edit(catalogKind, oldId, changed);
      long stale = version(second);
      assertThatThrownBy(() -> service.activate(secondId, stale)).isInstanceOf(com.openlap.infrastructure.exception.ConflictException.class);
      second = service.get(secondId);
      assertThat(second.get("state")).isEqualTo("INSPECTED");
      second = service.configureReplacement(secondId, version(second), mapping(second));
      second = service.activate(secondId, version(second));
      Document replacement = mongo.getCollection(catalogKind.collection).find(new Document("installationId", secondId)).first();
      assertThat(replacement.get("artifactId")).isNotEqualTo(secondId);
      assertThat(replacement.getString("name")).isEqualTo("Administrator " + suffix);
      assertThat(replacement.getString("description")).isEqualTo("Concurrent metadata");
      assertThat(replacement.getString("previousId")).isEqualTo(oldId);
      assertThat(replacement.get("_id")).isNotEqualTo(original.get("_id"));
      if (pluginKind == PluginKind.ANALYTICS) assertThat(replacement.getBoolean("enabled")).isFalse();
      else assertThat(mongo.getCollection("visualization-type").find(new Document("installationId", secondId)).first().getBoolean("enabled")).isFalse();
      assertThat(((List<?>) service.history(catalogKind, oldId).get("versions"))).hasSize(2);
      assertThat(service.history(catalogKind, oldId).get("latest")).isEqualTo(false);
      assertThat(service.upload(pluginKind, new MockMultipartFile("file", "v2.jar", "application/java-archive", Files.readAllBytes(secondJar)), "admin", catalogKind, oldId).get("id")).isEqualTo(secondId);
      // Disabling the original is an explicit action after activation, using its latest revision.
      if (pluginKind == PluginKind.ANALYTICS) editor.setEnabled(catalogKind, oldId, true);
      second = service.get(secondId);
      Map<String, Object> expected = new java.util.LinkedHashMap<>();
      @SuppressWarnings("unchecked") List<Map<String, Object>> targets = (List<Map<String, Object>>) second.get("retirementTargets");
      for (Map<String, Object> target : targets) if (Boolean.TRUE.equals(target.get("enabled"))) expected.put((String) target.get("id"), target.get("version"));
      Map<String, Object> retirementEdit = new java.util.LinkedHashMap<>();
      retirementEdit.put("version", editor.details(catalogKind, oldId).get("version")); retirementEdit.put("description", "Edited after retirement review");
      editor.edit(catalogKind, oldId, retirementEdit);
      long reviewedRetirement = version(second);
      assertThatThrownBy(() -> service.retirePrevious(secondId, reviewedRetirement, expected))
          .isInstanceOf(com.openlap.infrastructure.exception.ConflictException.class);
      assertThat(editor.details(catalogKind, oldId).get("enabled")).isEqualTo(true);
      second = service.get(secondId);
      @SuppressWarnings("unchecked") List<Map<String, Object>> refreshedTargets = (List<Map<String, Object>>) second.get("retirementTargets");
      expected.clear();
      for (Map<String, Object> target : refreshedTargets) if (Boolean.TRUE.equals(target.get("enabled"))) expected.put((String) target.get("id"), target.get("version"));
      service.retirePrevious(secondId, version(second), expected);
      assertThat(editor.details(catalogKind, oldId).get("enabled")).isEqualTo(false);
      MongoRepositoryFactory repositories = new MongoRepositoryFactory(mongo);
      PluginArtifactCache runtime = new PluginArtifactCache(temporary.newFolder().toPath(), 1000000, 20, store); closeables.add(runtime);
      PluginArtifactResolver resolver = new PluginArtifactResolver(PluginStorageProperties.Mode.S3, registry, runtime);
      PluginCatalogVisibility visibility = new PluginCatalogVisibility(mongo);
      if (pluginKind == PluginKind.ANALYTICS) {
        AnalyticsTechniqueServiceImpl analytics = new AnalyticsTechniqueServiceImpl(repositories.getRepository(AnalyticsTechniqueRepository.class), resolver, visibility);
        try {
          assertThat(analytics.loadAnalyticsMethodInstance(oldId).getAnalyticsMethodName()).isEqualTo("Method v1");
          assertThat(analytics.loadAnalyticsMethodInstance(replacement.getString("_id")).getAnalyticsMethodName()).isEqualTo("Method v2");
        } finally { analytics.closePluginLoaders(); }
      } else {
        VisualizationMethodUtilityServiceImpl visuals = new VisualizationMethodUtilityServiceImpl(repositories.getRepository(VisualizationTypeRepository.class), repositories.getRepository(VisualizationLibraryRepository.class), resolver, visibility);
        try {
          String oldChart = mongo.getCollection("visualization-type").find(new Document("installationId", firstId)).first().getString("_id");
          String newChart = mongo.getCollection("visualization-type").find(new Document("installationId", secondId)).first().getString("_id");
          assertThat(visuals.loadVisTypeInstance(oldChart).getName()).isEqualTo("Chart v1");
          assertThat(visuals.loadVisTypeInstance(newChart).getName()).isEqualTo("Chart v2");
        } finally { visuals.closePluginLoaders(); }
      }
      Path thirdJar = ManagedPluginFixture.create(source, suffix, false, "v3");
      String newId = replacement.getString("_id");
      Map<String, Object> third = service.upload(pluginKind, new MockMultipartFile("file", "v3.jar", "application/java-archive", Files.readAllBytes(thirdJar)), "admin", catalogKind, newId);
      String thirdId = (String) third.get("id");
      third = service.inspect(thirdId, version(third), true);
      third = service.configureReplacement(thirdId, version(third), mapping(third));
      assertThat(service.activate(thirdId, version(third)).get("state")).isEqualTo("ACTIVE");
      assertThat((List<?>) service.history(catalogKind, oldId).get("versions")).hasSize(3);
    }
  }

  @Test
  public void replacementMappingsHandleRemovedAndReintroducedEntriesExplicitly() throws Exception {
    String suffix = "Mapping" + UUID.randomUUID().toString().replace("-", "");
    PluginManagementService service = management(mongo);
    com.openlap.plugins.management.PluginCatalogKind kind = com.openlap.plugins.management.PluginCatalogKind.ANALYTICS_METHOD;
    Path originalJar = ManagedPluginFixture.create(source, suffix, false, "v1", true);
    Map<String, Object> original = upload(service, originalJar, PluginKind.ANALYTICS);
    String originalOp = (String) original.get("id");
    original = service.inspect(originalOp, version(original), true); service.activate(originalOp, version(original));
    List<Document> oldRows = new ArrayList<>(); mongo.getCollection(kind.collection).find(new Document("installationId", originalOp)).into(oldRows);
    Document oldMain = oldRows.stream().filter(row -> !row.getString("implementingClass").endsWith("Extra")).findFirst().get();
    String mainId = oldMain.getString("_id");
    Path nextJar = ManagedPluginFixture.create(source, suffix, false, "v2", false);
    Map<String, Object> next = service.upload(PluginKind.ANALYTICS, new MockMultipartFile("file", "v2.jar", "application/java-archive", Files.readAllBytes(nextJar)), "admin", kind, mainId);
    String nextOp = (String) next.get("id"); next = service.inspect(nextOp, version(next), true);
    Map<String, Object> plan = mapping(next);
    @SuppressWarnings("unchecked") Map<String, Object> mappings = (Map<String, Object>) plan.get("mappings");
    for (Document row : oldRows) if (row.getString("implementingClass").endsWith("Extra")) mappings.put(row.getString("_id"), null);
    Map<String, Object> invalid = new java.util.LinkedHashMap<>(plan);
    invalid.put("mappings", Collections.singletonMap(mainId, oldMain.getString("implementingClass")));
    long reviewed = version(next);
    assertThatThrownBy(() -> service.configureReplacement(nextOp, reviewed, invalid)).isInstanceOf(com.openlap.infrastructure.exception.ValidationException.class);
    next = service.configureReplacement(nextOp, version(next), plan); service.activate(nextOp, version(next));
    assertThat(mongo.getCollection(kind.collection).countDocuments(new Document("installationId", nextOp))).isEqualTo(1);
    Document second = mongo.getCollection(kind.collection).find(new Document("installationId", nextOp)).first();
    new com.openlap.plugins.management.PluginCatalogEditor(mongo).setEnabled(kind, second.getString("_id"), false);
    Path thirdJar = ManagedPluginFixture.create(source, suffix, false, "v3", true);
    Map<String, Object> third = service.upload(PluginKind.ANALYTICS, new MockMultipartFile("file", "v3.jar", "application/java-archive", Files.readAllBytes(thirdJar)), "admin", kind, second.getString("_id"));
    String thirdOp = (String) third.get("id"); third = service.inspect(thirdOp, version(third), true);
    third = service.configureReplacement(thirdOp, version(third), mapping(third)); service.activate(thirdOp, version(third));
    List<Document> installed = new ArrayList<>(); mongo.getCollection(kind.collection).find(new Document("installationId", thirdOp)).into(installed);
    assertThat(installed).hasSize(2);
    assertThat(installed.stream().filter(row -> row.getString("implementingClass").endsWith("Extra")).findFirst().get().getBoolean("enabled")).isTrue();
    assertThat(installed.stream().filter(row -> !row.getString("implementingClass").endsWith("Extra")).findFirst().get().getBoolean("enabled")).isFalse();
    assertThat(mongo.getCollection(kind.collection).countDocuments(new Document("installationId", originalOp))).isEqualTo(2);
  }

  @SuppressWarnings("unchecked")
  private static Map<String, Object> mapping(Map<String, Object> review) {
    Map<String, Object> source = (Map<String, Object>) review.get("replacementSource");
    Map<String, Object> expected = new java.util.LinkedHashMap<>();
    Map<String, Object> mappings = new java.util.LinkedHashMap<>();
    for (Map<String, Object> row : (List<Map<String, Object>>) source.get("entries")) {
      expected.put((String) row.get("id"), row.get("version"));
      mappings.put((String) row.get("id"), row.get("implementingClass"));
    }
    if (source.get("library") != null) {
      Map<String, Object> library = (Map<String, Object>) source.get("library"); expected.put((String) library.get("id"), library.get("version"));
    }
    Map<String, Object> result = new java.util.LinkedHashMap<>(); result.put("expectedVersions", expected); result.put("mappings", mappings);
    return result;
  }

  @Test
  public void removalChecksSavedIndicatorsDraftJsonCardsAndUnreadableConfigurations() throws Exception {
    com.openlap.plugins.management.PluginRemovalService removal = removalService();
    com.openlap.plugins.management.PluginCatalogKind kind = com.openlap.plugins.management.PluginCatalogKind.ANALYTICS_METHOD;
    mongo.getCollection("analytics-indicator").insertOne(new Document("analyticsTechniqueReference", new Document("analyticsTechnique", new DBRef("analytics-technique", methodId))));
    mongo.getCollection("analytics-indicator-drafts").insertOne(new Document("session", "{\"analysis\":{\"selectedMethod\":{\"id\":\"" + methodId + "\"}}}"));
    mongo.getCollection("openlap-isc").insertOne(new Document("status", "DRAFT").append("visRef", "{\"selectedType\":{\"id\":\"" + typeId + "\"}}"));
    Map<String, Object> methodPreview = removal.preview(kind, methodId.toHexString());
    @SuppressWarnings("unchecked") Map<String, Long> dependencies = (Map<String, Long>) methodPreview.get("dependencies");
    assertThat(dependencies.get("savedIndicators")).isEqualTo(1);
    assertThat(dependencies.get("indicatorDrafts")).isEqualTo(1);
    assertThatThrownBy(() -> removal.remove(kind, methodId.toHexString(), removalVersions(methodPreview)))
        .isInstanceOf(com.openlap.infrastructure.exception.ConflictException.class);
    assertThat(row("analytics-technique", methodId)).doesNotContainKey("removalState");
    Map<String, Object> library = removal.preview(com.openlap.plugins.management.PluginCatalogKind.VISUALIZATION_LIBRARY, libraryId.toHexString());
    assertThat(((Map<?, ?>) library.get("dependencies")).get("cardDrafts")).isEqualTo(1L);
    mongo.getCollection("analytics-indicator-drafts").insertOne(new Document("session", "{unreadable"));
    assertThat(((Map<?, ?>) removal.preview(kind, methodId.toHexString()).get("dependencies")).get("unreadableConfigurations")).isEqualTo(1L);
  }

  @Test
  public void durableWriteReservationsCloseTheSaveVersusRemovalRace() throws Exception {
    com.openlap.plugins.management.PluginRemovalService removal = removalService();
    com.openlap.plugins.management.PluginCatalogKind kind = com.openlap.plugins.management.PluginCatalogKind.ANALYTICS_METHOD;
    com.openlap.plugins.management.PluginReferenceFence fence = new com.openlap.plugins.management.PluginReferenceFence(mongo);
    Document draft = new Document("_id", "race-draft").append("session", "{\"analyticsTechniqueId\":\"" + methodId + "\"}");
    fence.beforeSave(draft, "analytics-indicator-drafts");
    Map<String, Object> review = removal.preview(kind, methodId.toHexString());
    assertThat(review.get("inFlightWrites")).isEqualTo(1L);
    assertThatThrownBy(() -> removal.remove(kind, methodId.toHexString(), removalVersions(review)))
        .isInstanceOf(com.openlap.infrastructure.exception.ConflictException.class);
    // The reserved writer commits after the competing removal attempt has failed.
    mongo.getCollection("analytics-indicator-drafts").insertOne(draft); fence.afterSave(draft);
    assertThat(((Map<?, ?>) removal.preview(kind, methodId.toHexString()).get("dependencies")).get("indicatorDrafts")).isEqualTo(1L);
    mongo.getCollection("analytics-indicator-drafts").deleteOne(new Document("_id", "race-draft"));
    removal.remove(kind, methodId.toHexString(), removalVersions(removal.preview(kind, methodId.toHexString())));
    org.springframework.context.support.GenericApplicationContext context = new org.springframework.context.support.GenericApplicationContext();
    context.addApplicationListener(new com.openlap.plugins.management.PluginReferenceWriteListener(mongo)); context.refresh();
    mongo.setApplicationContext(context); closeables.add(context);
    assertThatThrownBy(() -> mongo.insert(new Document("session", "{\"analyticsTechniqueId\":\"" + methodId + "\"}"), "analytics-indicator-drafts"))
        .isInstanceOf(com.openlap.infrastructure.exception.ConflictException.class);
    assertThat(mongo.getCollection("analytics-indicator-drafts").countDocuments()).isZero();
  }

  @Test
  public void sharedJarAndLibraryRemovalKeepBytesAndRestoreAllEntriesDisabled() throws Exception {
    migration.apply(migration.inventory(), registry);
    com.openlap.plugins.management.PluginRemovalService removal = removalService();
    com.openlap.plugins.management.PluginCatalogKind type = com.openlap.plugins.management.PluginCatalogKind.VISUALIZATION_TYPE;
    Map<String, Object> removedType = removal.remove(type, typeId.toHexString(), removalVersions(removal.preview(type, typeId.toHexString())));
    assertThat(new PluginCatalogVisibility(mongo).isVisible(null, "visualization-type", typeId.toHexString())).isFalse();
    assertThat(new PluginCatalogVisibility(mongo).isVisible(null, "visualization-library", libraryId.toHexString())).isTrue();
    assertThat(removal.restore((String) removedType.get("id")).get("state")).isEqualTo("RESTORED");
    assertThat(row("visualization-type", typeId).getBoolean("enabled")).isFalse();
    com.openlap.plugins.management.PluginCatalogKind library = com.openlap.plugins.management.PluginCatalogKind.VISUALIZATION_LIBRARY;
    Map<String, Object> removed = removal.remove(library, libraryId.toHexString(), removalVersions(removal.preview(library, libraryId.toHexString())));
    assertThat(row("visualization-library", libraryId).getString("removalState")).isEqualTo("REMOVED");
    assertThat(row("visualization-type", typeId).getString("removalState")).isEqualTo("REMOVED");
    PluginArtifact artifact = registry.ready(row("visualization-library", libraryId).getString("artifactId"), PluginKind.VISUALIZATION);
    try (InputStream bytes = store.open(artifact)) { ArtifactIntegrity.copyVerified(bytes, java.io.OutputStream.nullOutputStream(), artifact); }
    removal.restore((String) removed.get("id"));
    assertThat(new PluginCatalogVisibility(mongo).isVisible(null, "visualization-type", typeId.toHexString())).isTrue();
    assertThat(row("visualization-library", libraryId).getBoolean("enabled")).isFalse();
    assertThat(row("visualization-type", typeId).get("visualizationLib")).isEqualTo(new DBRef("visualization-library", libraryId));
  }

  private com.openlap.plugins.management.PluginRemovalService removalService() throws Exception {
    properties.setDeletionEnabled(true);
    PluginArtifactCache cache = new PluginArtifactCache(temporary.newFolder().toPath(), 1000000, 20, store); closeables.add(cache);
    return new com.openlap.plugins.management.PluginRemovalService(mongo, properties, registry, cache);
  }

  @SuppressWarnings("unchecked") private static Map<String, Object> removalVersions(Map<String, Object> preview) {
    Map<String, Object> result = new java.util.LinkedHashMap<>();
    for (Map<String, Object> row : (List<Map<String, Object>>) preview.get("affected")) result.put((String) row.get("key"), row.get("version"));
    return result;
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
      analytics = new AnalyticsTechniqueServiceImpl(repositories.getRepository(AnalyticsTechniqueRepository.class), resolver, com.openlap.plugins.management.PluginCatalogVisibility.legacyOnly());
      visualization = new VisualizationMethodUtilityServiceImpl(repositories.getRepository(VisualizationTypeRepository.class),
          repositories.getRepository(VisualizationLibraryRepository.class), resolver, com.openlap.plugins.management.PluginCatalogVisibility.legacyOnly());
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
