package com.openlap.plugins;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyZeroInteractions;
import static org.mockito.Mockito.when;

import com.openlap.analytics_engine.services.impl.EngineServiceImpl;
import com.openlap.analytics_module.services.AnalyticsGoalsService;
import com.openlap.analytics_technique.repositories.AnalyticsTechniqueRepository;
import com.openlap.analytics_technique.services.AnalyticsTechniqueService;
import com.openlap.analytics_technique.services.impl.AnalyticsTechniqueServiceImpl;
import com.openlap.infrastructure.exception.ConflictException;
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
import com.openlap.visualization_methods.repositories.VisualizationLibraryRepository;
import com.openlap.visualization_methods.repositories.VisualizationTypeRepository;
import com.openlap.visualization_methods.services.VisualizationMethodUtilityService;
import com.openlap.visualization_methods.services.impl.VisualizationMethodUtilityServiceImpl;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Collections;
import java.util.Optional;
import org.bson.Document;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;
import org.springframework.data.mongodb.core.MongoTemplate;

public class PluginArtifactRuntimeTest {
  @Rule public TemporaryFolder temporary = new TemporaryFolder();

  @Test
  public void storageOutageNeverFallsBackToAnAvailableLocalJar() throws Exception {
    Path root = temporary.getRoot().toPath();
    Path local = PluginJarFixture.create(root, "local.jar", "localVersion");
    PluginArtifact staged = PluginArtifact.staged(PluginKind.ANALYTICS, ArtifactIntegrity.sha256(local), Files.size(local), "test");
    PluginArtifact ready = new PluginArtifact(staged.getId(), staged.getKind(), staged.getSha256(), staged.getSizeBytes(),
        staged.getObjectKey(), PluginArtifact.State.READY, staged.getCreatedAt(), "test");
    PluginArtifactRepository repository = mock(PluginArtifactRepository.class);
    when(repository.findById(ready.getId())).thenReturn(Optional.of(ready));
    ArtifactObjectStore offline = mock(ArtifactObjectStore.class);
    when(offline.open(any())).thenThrow(new PluginStorageException("PLUGIN_STORAGE_UNAVAILABLE", "offline"));
    PluginArtifactRegistry registry = new PluginArtifactRegistry(repository, mock(MongoTemplate.class), offline);
    try (PluginArtifactCache cache = new PluginArtifactCache(root.resolve("cache"), 100000, 4, offline)) {
      PluginArtifactResolver resolver = new PluginArtifactResolver(PluginStorageProperties.Mode.S3, registry, cache);
      assertThatThrownBy(() -> resolver.resolve(PluginKind.ANALYTICS, ready.getId(), root.toString(), local.toString()))
          .isInstanceOf(PluginStorageException.class).hasMessage("offline");
      assertThatThrownBy(() -> resolver.resolve(PluginKind.ANALYTICS, null, root.toString(), local.toString()))
          .isInstanceOf(PluginStorageException.class).hasFieldOrPropertyWithValue("code", "PLUGIN_MIGRATION_REQUIRED");
      assertThat(Files.exists(local)).isTrue();
    }
  }

  @Test
  public void localModeChecksMigratedReferencesAgainstTheExactLocalBytes() throws Exception {
    Path root = temporary.getRoot().toPath();
    Path jar = PluginJarFixture.create(root, "plugin.jar", "original");
    String id = PluginArtifact.identity(PluginKind.ANALYTICS, ArtifactIntegrity.sha256(jar));
    PluginArtifactResolver resolver = PluginArtifactResolver.local();
    assertThat(resolver.resolve(PluginKind.ANALYTICS, id, root.toString(), jar.toString())).isEqualTo(jar.toRealPath());
    PluginJarFixture.create(root, "plugin.jar", "changed");
    assertThatThrownBy(() -> resolver.resolve(PluginKind.ANALYTICS, id, root.toString(), jar.toString()))
        .isInstanceOf(PluginStorageException.class).hasFieldOrPropertyWithValue("code", "PLUGIN_ARTIFACT_CORRUPT");
  }

  @Test
  public void startupRequiresMigrationEvenForDisabledInstalledPlugins() {
    MongoTemplate mongo = mock(MongoTemplate.class);
    when(mongo.findAll(eq(Document.class), anyString())).thenReturn(Collections.emptyList());
    when(mongo.findAll(Document.class, "analytics-technique")).thenReturn(Collections.singletonList(
        new Document("_id", "retired").append("enabled", false).append("fileName", "old.jar")
            .append("implementingClass", PluginJarFixture.ANALYTICS_CLASS)));
    PluginArtifactRepository repository = mock(PluginArtifactRepository.class);
    ArtifactObjectStore store = mock(ArtifactObjectStore.class);
    PluginCatalogVerifier verifier = new PluginCatalogVerifier(new PluginCatalog(mongo),
        new PluginArtifactRegistry(repository, mongo, store), null);
    assertThatThrownBy(verifier::afterSingletonsInstantiated).isInstanceOf(PluginStorageException.class)
        .hasFieldOrPropertyWithValue("code", "PLUGIN_MIGRATION_REQUIRED");
    verifyZeroInteractions(repository, store);
  }

  @Test
  public void legacyWritesAreRejectedBeforeTouchingFilesOrRepositoriesInS3Mode() {
    PluginArtifactResolver resolver = new PluginArtifactResolver(PluginStorageProperties.Mode.S3, null, null);
    AnalyticsTechniqueRepository methods = mock(AnalyticsTechniqueRepository.class);
    VisualizationTypeRepository types = mock(VisualizationTypeRepository.class);
    VisualizationLibraryRepository libraries = mock(VisualizationLibraryRepository.class);
    AnalyticsTechniqueServiceImpl analytics = new AnalyticsTechniqueServiceImpl(methods, resolver, com.openlap.plugins.management.PluginCatalogVisibility.legacyOnly());
    VisualizationMethodUtilityServiceImpl visualization = new VisualizationMethodUtilityServiceImpl(types, libraries, resolver, com.openlap.plugins.management.PluginCatalogVisibility.legacyOnly());
    assertThatThrownBy(() -> analytics.createAnalyticsTechnique(null)).isInstanceOf(ConflictException.class)
        .hasMessage("Local plugin changes are unavailable in S3 mode. Use Add methods or Add library in Administration.");
    assertThatThrownBy(analytics::populateAnalyticsTechniques).isInstanceOf(ConflictException.class);
    assertThatThrownBy(() -> analytics.uploadAnalyticsTechniqueFile(null)).isInstanceOf(ConflictException.class);
    assertThatThrownBy(() -> analytics.reloadAnalyticsTechniqueFile(null)).isInstanceOf(ConflictException.class);
    assertThatThrownBy(visualization::populateVisualizationMethods).isInstanceOf(ConflictException.class);
    assertThatThrownBy(() -> visualization.uploadVisualizationMethodFile(null)).isInstanceOf(ConflictException.class);
    assertThatThrownBy(() -> visualization.reloadVisualizationMethodFile(null)).isInstanceOf(ConflictException.class);
    verifyZeroInteractions(methods, types, libraries);
  }

  @Test
  public void localPopulationCannotResurrectRemovedCatalogEntries() {
    MongoTemplate mongo = mock(MongoTemplate.class);
    when(mongo.exists(any(org.springframework.data.mongodb.core.query.Query.class), eq("plugin-removal"))).thenReturn(true);
    assertThatThrownBy(() -> PluginArtifactResolver.local(mongo).requireLocalMutation())
        .isInstanceOf(ConflictException.class).hasFieldOrPropertyWithValue("code", "PLUGIN_MANAGEMENT_REMOVAL_HISTORY");
  }

  @Test
  public void databaseInitializationDoesNotRescanOrRecreateArtifactBackedPlugins() {
    AnalyticsGoalsService goals = mock(AnalyticsGoalsService.class);
    AnalyticsTechniqueService analytics = mock(AnalyticsTechniqueService.class);
    VisualizationMethodUtilityService visualization = mock(VisualizationMethodUtilityService.class);
    EngineServiceImpl engine = new EngineServiceImpl(goals, analytics, visualization,
        new PluginArtifactResolver(PluginStorageProperties.Mode.S3, null, null));
    assertThat(engine.initializeDatabase()).isTrue();
    verify(goals).populateAnalyticsGoal();
    verifyZeroInteractions(analytics, visualization);
  }
}
