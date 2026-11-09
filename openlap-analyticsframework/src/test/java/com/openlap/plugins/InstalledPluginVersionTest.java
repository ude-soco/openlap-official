package com.openlap.plugins;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.openlap.analytics_technique.entities.AnalyticsTechnique;
import com.openlap.analytics_technique.exceptions.AnalyticsMethodClassLoaderException;
import com.openlap.analytics_technique.repositories.AnalyticsTechniqueRepository;
import com.openlap.analytics_technique.services.impl.AnalyticsTechniqueServiceImpl;
import com.openlap.infrastructure.exception.ServiceException;
import com.openlap.visualization_methods.entities.VisLibrary;
import com.openlap.visualization_methods.entities.VisType;
import com.openlap.visualization_methods.exceptions.VisualizationClassLoaderException;
import com.openlap.visualization_methods.repositories.VisualizationLibraryRepository;
import com.openlap.visualization_methods.repositories.VisualizationTypeRepository;
import com.openlap.visualization_methods.services.impl.VisualizationMethodUtilityServiceImpl;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;
import java.util.jar.JarOutputStream;
import org.junit.After;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;
import org.springframework.test.util.ReflectionTestUtils;

public class InstalledPluginVersionTest {
  @Rule public TemporaryFolder temporary = new TemporaryFolder();
  private final AnalyticsTechniqueRepository methods = mock(AnalyticsTechniqueRepository.class);
  private final VisualizationTypeRepository types = mock(VisualizationTypeRepository.class);
  private final AnalyticsTechniqueServiceImpl analytics = new AnalyticsTechniqueServiceImpl(methods, com.openlap.plugins.artifacts.PluginArtifactResolver.local());
  private final VisualizationMethodUtilityServiceImpl visualization =
      new VisualizationMethodUtilityServiceImpl(types, mock(VisualizationLibraryRepository.class), com.openlap.plugins.artifacts.PluginArtifactResolver.local());
  private Path folder;

  @Before
  public void configureFolders() {
    folder = temporary.getRoot().toPath();
    ReflectionTestUtils.setField(analytics, "analyticsMethodsJarsFolder", folder.toString());
    ReflectionTestUtils.setField(visualization, "visualizerJarsFolder", folder.toString());
  }

  @After
  public void closeLoaders() {
    analytics.closePluginLoaders();
    visualization.closePluginLoaders();
  }

  private void register(String id, Path jar) {
    AnalyticsTechnique method = new AnalyticsTechnique();
    method.setId(id);
    method.setFileName(jar.toString());
    method.setImplementingClass(PluginJarFixture.ANALYTICS_CLASS);
    method.setEnabled(false); // Retiring a version must preserve existing execution.
    when(methods.findById(id)).thenReturn(Optional.of(method));
    VisLibrary library = new VisLibrary();
    library.setFrameworkLocation(jar.toString());
    library.setEnabled(false);
    VisType type = new VisType();
    type.setId(id);
    type.setVisualizationLib(library);
    type.setImplementingClass(PluginJarFixture.VISUALIZATION_CLASS);
    type.setEnabled(false);
    when(types.findById(id)).thenReturn(Optional.of(type));
  }

  @Test
  public void identicalClassNamesResolveToTheRecordedVersionForBothPluginKinds() throws Exception {
    register("old", PluginJarFixture.create(folder, "old.jar", "old"));
    register("new", PluginJarFixture.create(folder, "new.jar", "new"));
    assertThat(analytics.loadAnalyticsMethodInstance("new").getAnalyticsMethodName()).isEqualTo("new");
    assertThat(analytics.loadAnalyticsMethodInstance("old").getAnalyticsMethodName()).isEqualTo("old");
    assertThat(visualization.loadVisTypeInstance("new").getName()).isEqualTo("new");
    assertThat(visualization.loadVisTypeInstance("old").getName()).isEqualTo("old");
  }

  @Test
  public void missingClassDoesNotFallBackToAnotherJar() throws Exception {
    PluginJarFixture.create(folder, "other.jar", "other");
    Path empty = folder.resolve("recorded.jar");
    try (JarOutputStream ignored = new JarOutputStream(Files.newOutputStream(empty))) {}
    register("recorded", empty);
    assertThatThrownBy(() -> analytics.loadAnalyticsMethodInstance("recorded"))
        .isInstanceOf(AnalyticsMethodClassLoaderException.class);
    assertThatThrownBy(() -> visualization.loadVisTypeInstance("recorded"))
        .isInstanceOf(VisualizationClassLoaderException.class);
  }

  @Test
  public void missingRecordedJarDoesNotFallBackToAnotherVersion() throws Exception {
    PluginJarFixture.create(folder, "other.jar", "other");
    register("missing", folder.resolve("missing.jar"));
    assertThatThrownBy(() -> analytics.loadAnalyticsMethodInstance("missing"))
        .isInstanceOf(ServiceException.class).hasMessageContaining("unavailable");
    assertThatThrownBy(() -> visualization.loadVisTypeInstance("missing"))
        .isInstanceOf(ServiceException.class).hasMessageContaining("unavailable");
  }

  @Test
  public void recordedFileNameWithoutDirectoryResolvesWithinConfiguredFolder() throws Exception {
    Path jar = PluginJarFixture.create(folder, "plugin.jar", "plugin");
    assertThat(PluginJarFiles.installedPath(folder.toString(), "plugin.jar")).isEqualTo(jar.toRealPath());
  }

  @Test
  public void jarOutsideConfiguredDirectoryIsRejected() throws Exception {
    Path nested = Files.createDirectory(folder.resolve("plugins"));
    Path outside = PluginJarFixture.create(folder, "outside.jar", "outside");
    assertThatThrownBy(() -> PluginJarFiles.installedPath(nested.toString(), outside.toString()))
        .isInstanceOf(ServiceException.class);
    Path link = nested.resolve("linked.jar");
    Files.createSymbolicLink(link, outside);
    assertThatThrownBy(() -> PluginJarFiles.installedPath(nested.toString(), link.toString()))
        .isInstanceOf(ServiceException.class);
  }

  @Test
  public void missingLibraryProducesAnExplicitLoadError() {
    VisType orphan = new VisType();
    when(types.findById("orphan")).thenReturn(Optional.of(orphan));
    assertThatThrownBy(() -> visualization.loadVisTypeInstance("orphan"))
        .isInstanceOf(VisualizationClassLoaderException.class).hasMessageContaining("library");
  }
}
