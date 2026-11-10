package com.openlap.plugins.artifacts;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.Rule;
import org.junit.Before;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;
import org.mockito.ArgumentCaptor;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.http.AbortableInputStream;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

public class S3ArtifactObjectStoreTest {
  @Rule public TemporaryFolder temporary = new TemporaryFolder();
  private final S3Client client = mock(S3Client.class);
  private final S3ArtifactObjectStore store = new S3ArtifactObjectStore(client, "private-test-bucket");

  @Before public void absentByDefault() {
    when(client.getObject(any(GetObjectRequest.class))).thenThrow(S3Exception.builder().statusCode(404).build());
  }

  private PluginArtifact artifact(Path source) throws Exception {
    return PluginArtifact.staged(PluginKind.ANALYTICS, ArtifactIntegrity.sha256(source), Files.size(source), "test");
  }

  @Test
  public void uploadUsesVerifiedContentAddressedKeyInsteadOfOriginalFileName() throws Exception {
    Path source = temporary.newFile("arbitrary-name.jar").toPath();
    Files.write(source, new byte[] {1, 2, 3});
    PluginArtifact artifact = artifact(source);
    store.putIfAbsent(artifact, source);
    ArgumentCaptor<PutObjectRequest> request = ArgumentCaptor.forClass(PutObjectRequest.class);
    verify(client).putObject(request.capture(), any(RequestBody.class));
    assertThat(request.getValue().bucket()).isEqualTo("private-test-bucket");
    assertThat(request.getValue().key()).isEqualTo(artifact.getObjectKey());
    assertThat(request.getValue().metadata().get("sha256")).isEqualTo(artifact.getSha256());
  }

  @Test
  public void existingObjectIsNotOverwrittenAndCallerCanVerifyIt() throws Exception {
    Path source = temporary.newFile().toPath();
    Files.write(source, new byte[] {1});
    PluginArtifact artifact = artifact(source);
    when(client.getObject(any(GetObjectRequest.class))).thenReturn(new ResponseInputStream<>(
        GetObjectResponse.builder().contentLength(1L).build(), AbortableInputStream.create(new ByteArrayInputStream(new byte[] {1}))));
    store.putIfAbsent(artifact, source);
    verify(client, never()).putObject(any(PutObjectRequest.class), any(RequestBody.class));
  }

  @Test
  public void corruptExistingObjectIsNeverOverwritten() throws Exception {
    Path source = temporary.newFile().toPath();
    Files.write(source, new byte[] {1});
    PluginArtifact artifact = artifact(source);
    when(client.getObject(any(GetObjectRequest.class))).thenReturn(new ResponseInputStream<>(
        GetObjectResponse.builder().contentLength(1L).build(), AbortableInputStream.create(new ByteArrayInputStream(new byte[] {2}))));
    assertThatThrownBy(() -> store.putIfAbsent(artifact, source)).isInstanceOf(PluginStorageException.class)
        .hasFieldOrPropertyWithValue("code", "PLUGIN_ARTIFACT_CORRUPT");
    verify(client, never()).putObject(any(PutObjectRequest.class), any(RequestBody.class));
  }

  @Test
  public void storageFailureDoesNotLeakServerResponseDetails() throws Exception {
    Path source = temporary.newFile().toPath();
    Files.write(source, new byte[] {1});
    PluginArtifact artifact = artifact(source);
    when(client.getObject(any(GetObjectRequest.class)))
        .thenThrow(S3Exception.builder().statusCode(403).message("sensitive-server-response").build());
    assertThatThrownBy(() -> store.open(artifact)).isInstanceOf(PluginStorageException.class)
        .hasMessage("Plugin storage is unavailable. Retry the operation or contact an administrator.")
        .hasFieldOrPropertyWithValue("code", "PLUGIN_STORAGE_UNAVAILABLE");
    when(client.getObject(any(GetObjectRequest.class)))
        .thenThrow(S3Exception.builder().statusCode(404).build());
    assertThatThrownBy(() -> store.open(artifact)).isInstanceOf(PluginStorageException.class)
        .hasFieldOrPropertyWithValue("code", "PLUGIN_OBJECT_MISSING");
  }
}
