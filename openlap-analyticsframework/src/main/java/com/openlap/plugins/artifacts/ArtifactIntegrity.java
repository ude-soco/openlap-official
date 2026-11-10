package com.openlap.plugins.artifacts;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

public final class ArtifactIntegrity {
  private ArtifactIntegrity() {}

  public static String sha256(Path file) throws IOException {
    try (InputStream input = Files.newInputStream(file)) {
      MessageDigest digest = digest();
      byte[] buffer = new byte[8192];
      int count;
      while ((count = input.read(buffer)) != -1) digest.update(buffer, 0, count);
      return hex(digest.digest());
    }
  }

  /** Copies at most the declared size, hashing every byte before a cache file is published. */
  public static void copyVerified(InputStream input, OutputStream output, PluginArtifact artifact)
      throws IOException {
    artifact.validate();
    MessageDigest digest = digest();
    long size = 0;
    byte[] buffer = new byte[8192];
    int count;
    while ((count = input.read(buffer)) != -1) {
      size += count;
      if (size > artifact.getSizeBytes()) throw mismatch();
      digest.update(buffer, 0, count);
      output.write(buffer, 0, count);
    }
    if (size != artifact.getSizeBytes() || !hex(digest.digest()).equals(artifact.getSha256())) {
      throw mismatch();
    }
  }

  public static void verify(Path file, PluginArtifact artifact) throws IOException {
    try (InputStream input = Files.newInputStream(file)) {
      copyVerified(input, OutputStream.nullOutputStream(), artifact);
    }
  }

  private static MessageDigest digest() {
    try { return MessageDigest.getInstance("SHA-256"); }
    catch (NoSuchAlgorithmException e) { throw new IllegalStateException("SHA-256 is unavailable."); }
  }

  private static String hex(byte[] bytes) {
    StringBuilder result = new StringBuilder(64);
    for (byte value : bytes) result.append(String.format("%02x", value & 0xff));
    return result.toString();
  }

  private static PluginStorageException mismatch() {
    return new PluginStorageException("PLUGIN_ARTIFACT_CORRUPT", "The plugin JAR size or checksum does not match its registered version.");
  }
}
