package com.openlap.plugins.artifacts;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Collections;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

public final class S3ArtifactObjectStore implements ArtifactObjectStore, AutoCloseable {
  private final S3Client client;
  private final String bucket;

  public S3ArtifactObjectStore(S3Client client, String bucket) {
    this.client = client;
    this.bucket = bucket;
  }

  public static S3ArtifactObjectStore connect(PluginStorageProperties properties) {
    properties.validateS3();
    S3Client client = S3Client.builder()
        .endpointOverride(properties.getEndpoint())
        .region(Region.of(properties.getRegion()))
        .credentialsProvider(StaticCredentialsProvider.create(
            AwsBasicCredentials.create(properties.getAccessKey(), properties.getSecretKey())))
        .serviceConfiguration(S3Configuration.builder()
            .pathStyleAccessEnabled(true).chunkedEncodingEnabled(false).build())
        .httpClientBuilder(UrlConnectionHttpClient.builder()
            .connectionTimeout(Duration.ofSeconds(5)).socketTimeout(Duration.ofSeconds(20)))
        .overrideConfiguration(config -> config.apiCallTimeout(Duration.ofSeconds(60))
            .apiCallAttemptTimeout(Duration.ofSeconds(25)))
        .build();
    return new S3ArtifactObjectStore(client, properties.getBucket());
  }

  @Override
  public void putIfAbsent(PluginArtifact artifact, Path source) {
    artifact.validate();
    try { ArtifactIntegrity.verify(source, artifact); }
    catch (IOException e) { throw unavailable(); }
    try (InputStream existing = open(artifact)) {
      ArtifactIntegrity.copyVerified(existing, java.io.OutputStream.nullOutputStream(), artifact);
      return;
    } catch (PluginStorageException e) {
      if (!"PLUGIN_OBJECT_MISSING".equals(e.getCode())) throw e;
    } catch (IOException e) { throw unavailable(); }
    // Garage ignores If-None-Match on PUT. Only matching, snapshotted bytes may be
    // written under this content-addressed key; concurrent absent-object writers
    // therefore write identical bytes. Existing objects are verified above.
    try {
      client.putObject(PutObjectRequest.builder().bucket(bucket).key(artifact.getObjectKey())
          .contentLength(artifact.getSizeBytes())
          .contentType("application/java-archive")
          .metadata(Collections.singletonMap("sha256", artifact.getSha256())).build(), RequestBody.fromFile(source));
    } catch (SdkException e) { throw unavailable(); }
  }

  @Override
  public InputStream open(PluginArtifact artifact) {
    artifact.validate();
    try {
      ResponseInputStream<GetObjectResponse> stream = client.getObject(
          GetObjectRequest.builder().bucket(bucket).key(artifact.getObjectKey()).build());
      Long length = stream.response().contentLength();
      if (length != null && length != artifact.getSizeBytes()) {
        stream.abort();
        throw new PluginStorageException("PLUGIN_ARTIFACT_CORRUPT", "The stored plugin JAR has an unexpected size.");
      }
      return stream;
    } catch (S3Exception e) {
      if (e.statusCode() == 404) {
        throw new PluginStorageException("PLUGIN_OBJECT_MISSING", "The registered plugin JAR is missing from storage. Restore this artifact version.");
      }
      throw unavailable();
    } catch (SdkException e) { throw unavailable(); }
  }

  private static PluginStorageException unavailable() {
    return new PluginStorageException("PLUGIN_STORAGE_UNAVAILABLE", "Plugin storage is unavailable. Retry the operation or contact an administrator.");
  }

  @Override public void deleteVerified(PluginArtifact artifact) {
    artifact.validate();
    try (InputStream existing = open(artifact)) {
      ArtifactIntegrity.copyVerified(existing, java.io.OutputStream.nullOutputStream(), artifact);
    } catch (PluginStorageException error) {
      if ("PLUGIN_OBJECT_MISSING".equals(error.getCode())) return; // Idempotent recovery after a lost delete acknowledgement.
      throw error;
    } catch (IOException error) { throw unavailable(); }
    try { client.deleteObject(request -> request.bucket(bucket).key(artifact.getObjectKey())); }
    catch (SdkException error) { throw unavailable(); }
  }

  @Override public void close() { client.close(); }
}
