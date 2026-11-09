package com.openlap.plugins.artifacts;

import com.openlap.plugins.PluginJarFiles;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

/** Retriable cross-store workflow; only verified object bytes can transition STAGED -> READY. */
public final class PluginArtifactRegistry {
  private final PluginArtifactRepository repository;
  private final MongoTemplate mongo;
  private final ArtifactObjectStore store;

  public PluginArtifactRegistry(PluginArtifactRepository repository, MongoTemplate mongo, ArtifactObjectStore store) {
    this.repository = repository;
    this.mongo = mongo;
    this.store = store;
  }

  public PluginArtifact ensureStored(PluginKind kind, Path source, String sha256, long size, String actor) {
    PluginArtifact expected = PluginArtifact.staged(kind, sha256, size, actor);
    Path snapshot = null;
    try {
      snapshot = Files.createTempFile("openlap-plugin-artifact-", ".jar");
      try (InputStream input = Files.newInputStream(source); OutputStream output = Files.newOutputStream(snapshot)) {
        ArtifactIntegrity.copyVerified(input, output, expected);
      }
      PluginJarFiles.validate(snapshot);
      PluginArtifact registered;
      try { registered = repository.insert(expected); }
      catch (DuplicateKeyException e) { registered = repository.findById(expected.getId()).orElseThrow(PluginArtifactRegistry::unavailable); }
      registered.validate();
      if (registered.getSizeBytes() != size || registered.getKind() != kind) {
        throw new PluginStorageException("PLUGIN_ARTIFACT_INVALID", "The registered artifact identity conflicts with this JAR.");
      }
      store.putIfAbsent(registered, snapshot);
      try (InputStream input = store.open(registered)) {
        ArtifactIntegrity.copyVerified(input, OutputStream.nullOutputStream(), registered);
      }
      mongo.updateFirst(Query.query(Criteria.where("_id").is(registered.getId())
              .and("state").is(PluginArtifact.State.STAGED).and("sha256").is(sha256).and("sizeBytes").is(size)),
          Update.update("state", PluginArtifact.State.READY), PluginArtifact.class);
      return ready(registered.getId(), kind);
    } catch (IOException e) {
      throw new PluginStorageException("PLUGIN_ARTIFACT_SOURCE_UNAVAILABLE", "The source JAR could not be snapshotted and verified.");
    } catch (DataAccessException e) { throw unavailable(); }
    finally {
      if (snapshot != null) {
        try { Files.deleteIfExists(snapshot); }
        catch (IOException e) { org.slf4j.LoggerFactory.getLogger(PluginArtifactRegistry.class).warn("Could not clean an artifact staging file."); }
      }
    }
  }

  public PluginArtifact ready(String id, PluginKind kind) {
    try {
      PluginArtifact artifact = repository.findById(id).orElseThrow(() ->
          new PluginStorageException("PLUGIN_MIGRATION_REQUIRED", "This plugin has no registered artifact. Complete the artifact migration first."));
      artifact.validate();
      if (artifact.getKind() != kind || artifact.getState() != PluginArtifact.State.READY) {
        throw new PluginStorageException("PLUGIN_ARTIFACT_NOT_READY", "This plugin's artifact is not ready for execution.");
      }
      return artifact;
    } catch (DataAccessException e) { throw unavailable(); }
  }

  private static PluginStorageException unavailable() {
    return new PluginStorageException("PLUGIN_ARTIFACT_REGISTRY_UNAVAILABLE", "The plugin artifact registry is unavailable. Retry the operation.");
  }
}
