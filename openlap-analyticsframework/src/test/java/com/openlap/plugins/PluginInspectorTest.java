package com.openlap.plugins;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.openlap.infrastructure.exception.ValidationException;
import com.openlap.plugins.artifacts.PluginKind;
import com.openlap.plugins.management.PluginInspection;
import com.openlap.plugins.management.PluginInspector;
import java.nio.file.Path;
import org.junit.After;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

public class PluginInspectorTest {
  @Rule public TemporaryFolder temporary = new TemporaryFolder();
  private final PluginInspector inspector = new PluginInspector();

  @After public void cleanup() { System.clearProperty("openlap.fixture.inspected"); }

  @Test public void staticDiscoveryDoesNotInitializeOrConstructPlugins() throws Exception {
    System.clearProperty("openlap.fixture.inspected");
    Path jar = ManagedPluginFixture.create(temporary.getRoot().toPath(), "Static", false);
    assertThat(inspector.discover(PluginKind.ANALYTICS, jar).getClasses()).containsExactly("managedfixture.ManagedAnalyticsStatic");
    assertThat(System.getProperty("openlap.fixture.inspected")).isNull();
    PluginInspection inspected = inspector.inspect(PluginKind.ANALYTICS, jar);
    assertThat(System.getProperty("openlap.fixture.inspected")).isEqualTo("yes");
    assertThat(inspected.getEntries()).hasSize(1);
    assertThat(inspected.getEntries().get(0).getString("name")).isEqualTo("Method Static");
  }

  @Test public void visualizationInspectionFindsItsLibraryBeforeAssociatingChartTypes() throws Exception {
    Path jar = ManagedPluginFixture.create(temporary.getRoot().toPath(), "Chart", false);
    PluginInspection inspected = inspector.inspect(PluginKind.VISUALIZATION, jar);
    assertThat(inspected.getLibrary().getString("name")).isEqualTo("Library Chart");
    assertThat(inspected.getEntries()).hasSize(1);
    assertThat(inspected.getEntries().get(0)).containsKeys("chartConfiguration", "inputs");
  }

  @Test public void metadataFailureRejectsTheWholeReviewAndRedactsPluginExceptions() throws Exception {
    Path jar = ManagedPluginFixture.create(temporary.getRoot().toPath(), "Broken", true);
    assertThatThrownBy(() -> inspector.inspect(PluginKind.ANALYTICS, jar)).isInstanceOf(ValidationException.class)
        .hasMessage("Plugin contract inspection failed. Check constructors, metadata and dependencies; no entries were activated.");
  }

  @Test public void visualizationJarWithoutLibraryMetadataCannotPassDiscovery() throws Exception {
    Path jar = PluginJarFixture.create(temporary.getRoot().toPath(), "missing-library.jar", "test");
    assertThatThrownBy(() -> inspector.discover(PluginKind.VISUALIZATION, jar)).isInstanceOf(ValidationException.class)
        .hasMessageContaining("VisualizationLibraryInfo");
  }
}
