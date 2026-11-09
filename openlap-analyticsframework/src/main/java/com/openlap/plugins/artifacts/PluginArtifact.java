package com.openlap.plugins.artifacts;

import java.time.Instant;
import java.util.Objects;
import lombok.Getter;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.PersistenceConstructor;
import org.springframework.data.mongodb.core.mapping.Document;

/** Content-addressed identity is immutable; only STAGED -> READY is allowed by the registry. */
@Getter
@Document("plugin-artifact")
public class PluginArtifact {
  public enum State { STAGED, READY }

  @Id private final String id;
  private final PluginKind kind;
  private final String sha256;
  private final long sizeBytes;
  private final String objectKey;
  private final State state;
  private final Instant createdAt;
  private final String createdBy;

  @PersistenceConstructor
  public PluginArtifact(String id, PluginKind kind, String sha256, long sizeBytes,
      String objectKey, State state, Instant createdAt, String createdBy) {
    this.id = id;
    this.kind = kind;
    this.sha256 = sha256;
    this.sizeBytes = sizeBytes;
    this.objectKey = objectKey;
    this.state = state;
    this.createdAt = createdAt;
    this.createdBy = createdBy;
  }

  public static PluginArtifact staged(PluginKind kind, String sha256, long size, String actor) {
    PluginArtifact artifact = new PluginArtifact(identity(kind, sha256), kind, sha256, size,
        "plugins/" + kind.prefix() + "/" + sha256 + ".jar", State.STAGED, Instant.now(), actor);
    artifact.validate();
    return artifact;
  }

  public static String identity(PluginKind kind, String sha256) {
    if (kind == null || sha256 == null || !sha256.matches("[a-f0-9]{64}")) {
      throw invalid();
    }
    return kind.prefix() + "-" + sha256;
  }

  public void validate() {
    if (!Objects.equals(id, identity(kind, sha256)) || sizeBytes <= 0
        || sizeBytes > 100L * 1024 * 1024 || state == null
        || !Objects.equals(objectKey, "plugins/" + kind.prefix() + "/" + sha256 + ".jar")) {
      throw invalid();
    }
  }

  private static PluginStorageException invalid() {
    return new PluginStorageException("PLUGIN_ARTIFACT_INVALID", "The plugin artifact metadata is invalid.");
  }
}
