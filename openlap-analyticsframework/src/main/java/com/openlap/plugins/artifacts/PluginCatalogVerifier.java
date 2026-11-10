package com.openlap.plugins.artifacts;

import java.io.IOException;
import java.nio.file.Path;
import org.springframework.beans.factory.SmartInitializingSingleton;

/** S3 mode is ready only after every installed (including disabled) entry can be loaded locally. */
public final class PluginCatalogVerifier implements SmartInitializingSingleton {
  private final PluginCatalog catalog;
  private final PluginArtifactRegistry registry;
  private final PluginArtifactCache cache;

  public PluginCatalogVerifier(PluginCatalog catalog, PluginArtifactRegistry registry, PluginArtifactCache cache) {
    this.catalog = catalog;
    this.registry = registry;
    this.cache = cache;
  }

  @Override public void afterSingletonsInstantiated() {
    for (PluginCatalog.Entry entry : catalog.entries()) {
      if (entry.getArtifactId() == null) {
        throw new PluginStorageException("PLUGIN_MIGRATION_REQUIRED", "Installed plugins must be migrated before enabling S3 mode.");
      }
      Path jar = cache.resolve(registry.ready(entry.getArtifactId(), entry.getKind()));
      try { PluginCatalog.verifyClasses(jar, entry); }
      catch (IOException e) { throw new PluginStorageException("PLUGIN_CACHE_UNAVAILABLE", "A required plugin JAR could not be inspected."); }
    }
  }
}
