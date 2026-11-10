package com.openlap.plugins.artifacts;

import java.io.InputStream;
import java.nio.file.Path;

/** Object deletion is deliberately absent from the migration/cache integration. */
public interface ArtifactObjectStore {
  /**
   * Verify and reuse an existing object, or upload the caller's owned, verified snapshot.
   * The key is derived from its digest; concurrent missing-object writers must have identical
   * bytes. This does not assume the provider implements conditional PUT headers.
   */
  void putIfAbsent(PluginArtifact artifact, Path source);
  InputStream open(PluginArtifact artifact);

  default void deleteVerified(PluginArtifact artifact) {
    throw new PluginStorageException("PLUGIN_PURGE_UNAVAILABLE", "This object store does not support verified retention cleanup.");
  }
}
