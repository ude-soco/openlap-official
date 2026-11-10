package com.openlap.plugins.artifacts;

import java.net.URI;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Intentionally has no toString: credentials must not appear in diagnostics. */
@Getter
@Setter
@ConfigurationProperties("openlap.plugins")
public class PluginStorageProperties {
  public enum Mode { LOCAL, S3 }

  private Mode mode = Mode.LOCAL;
  private URI endpoint;
  private String region = "garage";
  private String bucket;
  private String accessKey;
  private String secretKey;
  private Path cacheDirectory = Paths.get("data/plugin-cache");
  private long cacheMaxBytes = 1024L * 1024 * 1024;
  private int cacheMaxEntries = 256;
  private boolean deletionEnabled;
  private int retentionDays = 30;

  public void validateS3() {
    if (mode != Mode.S3 || endpoint == null || endpoint.getHost() == null
        || !("https".equals(endpoint.getScheme()) || "http".equals(endpoint.getScheme()))
        || endpoint.getRawUserInfo() != null || endpoint.getRawQuery() != null
        || endpoint.getRawFragment() != null
        || !(endpoint.getPath().isEmpty() || "/".equals(endpoint.getPath()))) {
      throw new IllegalStateException("S3 plugin storage requires a valid explicit HTTP(S) endpoint without credentials, path, query or fragment.");
    }
    if (blank(bucket) || !bucket.matches("[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]")
        || blank(region) || blank(accessKey) || blank(secretKey)) {
      throw new IllegalStateException("S3 plugin storage requires bucket, region, access-key and secret-key settings.");
    }
    if (cacheDirectory == null || cacheMaxBytes <= 0 || cacheMaxEntries <= 0) {
      throw new IllegalStateException("Plugin cache directory and positive capacity limits are required.");
    }
  }

  public static PluginStorageProperties forMigration(Map<String, String> environment) {
    PluginStorageProperties properties = new PluginStorageProperties();
    if (!"s3".equalsIgnoreCase(environment.get("PLUGIN_STORAGE_MODE"))) {
      throw new IllegalStateException("Explicitly set PLUGIN_STORAGE_MODE=s3 to apply an artifact migration.");
    }
    properties.mode = Mode.S3;
    try { properties.endpoint = URI.create(environment.getOrDefault("PLUGIN_STORAGE_S3_ENDPOINT", "")); }
    catch (IllegalArgumentException e) { throw new IllegalStateException("Invalid PLUGIN_STORAGE_S3_ENDPOINT."); }
    properties.region = environment.getOrDefault("PLUGIN_STORAGE_S3_REGION", "garage");
    properties.bucket = environment.get("PLUGIN_STORAGE_S3_BUCKET");
    properties.accessKey = environment.get("PLUGIN_STORAGE_S3_ACCESS_KEY");
    properties.secretKey = environment.get("PLUGIN_STORAGE_S3_SECRET_KEY");
    properties.validateS3();
    return properties;
  }

  private static boolean blank(String value) { return value == null || value.trim().isEmpty(); }
}
