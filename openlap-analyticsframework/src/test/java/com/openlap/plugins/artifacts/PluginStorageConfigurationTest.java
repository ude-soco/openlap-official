package com.openlap.plugins.artifacts;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.nio.file.Files;
import java.util.Collections;
import org.bson.Document;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.data.mongodb.core.MongoTemplate;

public class PluginStorageConfigurationTest {
  @Rule public TemporaryFolder temporary = new TemporaryFolder();

  private ApplicationContextRunner runner() {
    MongoTemplate mongo = mock(MongoTemplate.class);
    when(mongo.findAll(eq(Document.class), anyString())).thenReturn(Collections.emptyList());
    return new ApplicationContextRunner().withUserConfiguration(PluginStorageConfiguration.class)
        .withInitializer(context -> {
          context.getBeanFactory().registerSingleton("mongoTemplate", mongo);
          context.getBeanFactory().registerSingleton("pluginArtifactRepository", mock(PluginArtifactRepository.class));
        });
  }

  @Test
  public void defaultLocalModeDoesNotCreateAClientOrCache() {
    runner().withPropertyValues("openlap.plugins.cache-directory=" + temporary.getRoot() + "/unused")
        .run(context -> {
          assertThat(context).hasNotFailed();
          assertThat(context.getBean(PluginArtifactResolver.class).usesObjectStorage()).isFalse();
          assertThat(context).doesNotHaveBean(S3ArtifactObjectStore.class).doesNotHaveBean(PluginArtifactCache.class);
          assertThat(Files.exists(temporary.getRoot().toPath().resolve("unused"))).isFalse();
        });
  }

  @Test
  public void s3ModeFailsWithoutAnExplicitEndpointAndCredentials() {
    runner().withPropertyValues("openlap.plugins.mode=s3").run(context -> assertThat(context).hasFailed());
  }

  @Test
  public void explicitS3ModeSupportsAnEmptyCatalogWithoutNetworkDiscovery() {
    runner().withPropertyValues("openlap.plugins.mode=s3", "openlap.plugins.endpoint=http://127.0.0.1:1",
        "openlap.plugins.region=garage", "openlap.plugins.bucket=integration-bucket",
        "openlap.plugins.access-key=test-only-key", "openlap.plugins.secret-key=test-only-secret",
        "openlap.plugins.cache-directory=" + temporary.getRoot() + "/cache").run(context -> {
          assertThat(context).hasNotFailed();
          assertThat(context.getBean(PluginArtifactResolver.class).usesObjectStorage()).isTrue();
        });
  }
}
