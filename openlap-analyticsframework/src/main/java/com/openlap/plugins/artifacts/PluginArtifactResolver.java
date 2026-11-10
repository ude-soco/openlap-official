package com.openlap.plugins.artifacts;

import com.openlap.infrastructure.exception.ConflictException;
import com.openlap.plugins.PluginJarFiles;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

public final class PluginArtifactResolver {
  private final PluginStorageProperties.Mode mode;
  private final PluginArtifactRegistry registry;
  private final PluginArtifactCache cache;
  private org.springframework.data.mongodb.core.MongoTemplate mutationCatalog;

  public PluginArtifactResolver(PluginStorageProperties.Mode mode, PluginArtifactRegistry registry, PluginArtifactCache cache) {
    this.mode = mode;
    this.registry = registry;
    this.cache = cache;
  }

  public static PluginArtifactResolver local() {
    return new PluginArtifactResolver(PluginStorageProperties.Mode.LOCAL, null, null);
  }

  public static PluginArtifactResolver local(org.springframework.data.mongodb.core.MongoTemplate mongo) {
    PluginArtifactResolver resolver = local(); resolver.mutationCatalog = mongo; return resolver;
  }

  public boolean usesObjectStorage() { return mode == PluginStorageProperties.Mode.S3; }

  public void requireLocalMutation() {
    if (usesObjectStorage()) throw new ConflictException("PLUGIN_MANAGEMENT_MIGRATION",
        "Local plugin changes are unavailable in S3 mode. Use Add methods or Add library in Administration.");
    if (mutationCatalog != null && mutationCatalog.exists(org.springframework.data.mongodb.core.query.Query.query(
        org.springframework.data.mongodb.core.query.Criteria.where("state").in("PREPARING", "COMMITTING", "REMOVED", "RESTORING", "RESTORED")), "plugin-removal"))
      throw new ConflictException("PLUGIN_MANAGEMENT_REMOVAL_HISTORY", "This catalog has plugin removal history. Keep local population disabled and use the guarded S3 management workflow.");
  }

  public Path resolve(PluginKind kind, String artifactId, String folder, String recordedPath) {
    if (usesObjectStorage()) {
      if (artifactId == null || artifactId.isEmpty()) {
        throw new PluginStorageException("PLUGIN_MIGRATION_REQUIRED", "Complete the plugin artifact migration before using S3 mode.");
      }
      return cache.resolve(registry.ready(artifactId, kind));
    }
    Path local = PluginJarFiles.installedPath(folder, recordedPath);
    // During explicit migration, local mode remains usable after references are attached.
    // A migrated reference must still correspond to the exact local binary.
    if (artifactId != null) {
      String prefix = kind.prefix() + "-";
      if (!artifactId.startsWith(prefix)) {
        throw new PluginStorageException("PLUGIN_ARTIFACT_INVALID", "The local plugin artifact reference is invalid.");
      }
      String sha = artifactId.substring(prefix.length());
      if (!PluginArtifact.identity(kind, sha).equals(artifactId)) {
        throw new PluginStorageException("PLUGIN_ARTIFACT_INVALID", "The local plugin artifact reference is invalid.");
      }
      try { ArtifactIntegrity.verify(local, PluginArtifact.staged(kind, sha, Files.size(local), "migration")); }
      catch (IOException e) { throw new PluginStorageException("PLUGIN_ARTIFACT_SOURCE_UNAVAILABLE", "The migrated local plugin JAR is unavailable."); }
    }
    return local;
  }
}
