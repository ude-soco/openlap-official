package com.openlap.plugins.artifacts;

import com.openlap.plugins.management.PluginManagementService;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.core.MongoTemplate;

@Configuration
@EnableConfigurationProperties(PluginStorageProperties.class)
public class PluginStorageConfiguration {
  @Bean
  public com.openlap.plugins.management.PluginRemovalService pluginRemovalService(MongoTemplate mongo,
      PluginStorageProperties properties, ObjectProvider<PluginArtifactRegistry> registry, ObjectProvider<PluginArtifactCache> cache) {
    return new com.openlap.plugins.management.PluginRemovalService(mongo, properties, registry.getIfAvailable(), cache.getIfAvailable());
  }
  @Bean
  public PluginManagementService pluginManagementService(MongoTemplate mongo,
      PluginStorageProperties properties, ObjectProvider<PluginArtifactRegistry> registry, ObjectProvider<PluginArtifactCache> cache) {
    return new PluginManagementService(mongo, properties, registry.getIfAvailable(), cache.getIfAvailable());
  }
  @Bean
  public PluginArtifactResolver pluginArtifactResolver(PluginStorageProperties properties,
      ObjectProvider<PluginArtifactRegistry> registry, ObjectProvider<PluginArtifactCache> cache) {
    return properties.getMode() == PluginStorageProperties.Mode.LOCAL ? PluginArtifactResolver.local()
        : new PluginArtifactResolver(properties.getMode(), registry.getObject(), cache.getObject());
  }

  @Bean(destroyMethod = "close")
  @ConditionalOnProperty(prefix = "openlap.plugins", name = "mode", havingValue = "s3")
  public S3ArtifactObjectStore pluginObjectStore(PluginStorageProperties properties) {
    return S3ArtifactObjectStore.connect(properties);
  }

  @Bean(destroyMethod = "close")
  @ConditionalOnProperty(prefix = "openlap.plugins", name = "mode", havingValue = "s3")
  public PluginArtifactCache pluginArtifactCache(PluginStorageProperties properties, ArtifactObjectStore store) {
    return new PluginArtifactCache(properties.getCacheDirectory(), properties.getCacheMaxBytes(), properties.getCacheMaxEntries(), store);
  }

  @Bean
  @ConditionalOnProperty(prefix = "openlap.plugins", name = "mode", havingValue = "s3")
  public PluginArtifactRegistry pluginArtifactRegistry(PluginArtifactRepository repository, MongoTemplate mongo, ArtifactObjectStore store) {
    return new PluginArtifactRegistry(repository, mongo, store);
  }

  @Bean
  @ConditionalOnProperty(prefix = "openlap.plugins", name = "mode", havingValue = "s3")
  public PluginCatalogVerifier pluginCatalogVerifier(MongoTemplate mongo, PluginArtifactRegistry registry, PluginArtifactCache cache) {
    return new PluginCatalogVerifier(new PluginCatalog(mongo), registry, cache);
  }
}
