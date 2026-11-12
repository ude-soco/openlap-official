package com.openlap.plugins.management;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

import com.openlap.infrastructure.exception.ConflictException;
import com.openlap.plugins.artifacts.ArtifactObjectStore;
import com.openlap.plugins.artifacts.PluginStorageProperties;
import java.util.Collections;
import org.junit.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.support.PropertiesLoaderUtils;
import org.springframework.core.env.PropertiesPropertySource;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.data.mongodb.core.MongoTemplate;

public class PluginLifecycleAvailabilityTest {
  @Test
  public void logicalRemovalAndPhysicalDeletionHaveSeparateFailClosedGates() {
    PluginStorageProperties properties = new PluginStorageProperties();
    properties.setMode(PluginStorageProperties.Mode.S3);
    MongoTemplate mongo = mock(MongoTemplate.class);
    ArtifactObjectStore store = mock(ArtifactObjectStore.class);
    PluginRemovalService removal = new PluginRemovalService(mongo, properties, null, null);
    PluginArtifactCleanup cleanup = new PluginArtifactCleanup(mongo, properties, store, removal);
    assertThat(removal.available()).isFalse();
    assertThat(cleanup.available()).isFalse();

    properties.setRemovalEnabled(true);
    assertThat(removal.available()).isTrue();
    assertThat(cleanup.available()).isFalse();
    assertThatThrownBy(() -> cleanup.run(true, Collections.emptyList()))
        .isInstanceOf(ConflictException.class).hasMessageContaining("PLUGIN_DELETION_ENABLED");
    verifyNoInteractions(mongo, store);

    properties.setDeletionEnabled(true);
    assertThat(cleanup.available()).isTrue();
    properties.setRemovalEnabled(false);
    assertThat(removal.available()).isFalse();
    assertThat(cleanup.available()).isFalse();
    properties.setRemovalEnabled(true);
    properties.setMode(PluginStorageProperties.Mode.LOCAL);
    assertThat(removal.available()).isFalse();
    assertThat(cleanup.available()).isFalse();
  }

  @Test
  public void existingDeletionGateIsInheritedUnlessLogicalRemovalIsExplicit() {
    PluginStorageProperties properties = new PluginStorageProperties();
    assertThat(properties.isLogicalRemovalEnabled()).isFalse();
    properties.setDeletionEnabled(true);
    assertThat(properties.isLogicalRemovalEnabled()).isTrue();
    properties.setRemovalEnabled(false);
    assertThat(properties.isLogicalRemovalEnabled()).isFalse();
  }

  @Test
  public void applicationSettingsResolveTheSeparateFlagsAndLegacyFallback() throws Exception {
    MockEnvironment environment = new MockEnvironment();
    environment.getPropertySources().addLast(new PropertiesPropertySource("application",
        PropertiesLoaderUtils.loadProperties(new ClassPathResource("application.properties"))));
    assertThat(environment.getProperty("openlap.plugins.removal-enabled", Boolean.class)).isFalse();
    environment.setProperty("PLUGIN_DELETION_ENABLED", "true");
    assertThat(environment.getProperty("openlap.plugins.removal-enabled", Boolean.class)).isTrue();
    environment.setProperty("PLUGIN_REMOVAL_ENABLED", "false");
    assertThat(environment.getProperty("openlap.plugins.removal-enabled", Boolean.class)).isFalse();
    environment.setProperty("PLUGIN_REMOVAL_ENABLED", "true");
    environment.setProperty("PLUGIN_DELETION_ENABLED", "false");
    assertThat(environment.getProperty("openlap.plugins.removal-enabled", Boolean.class)).isTrue();
    assertThat(environment.getProperty("openlap.plugins.deletion-enabled", Boolean.class)).isFalse();
  }
}
