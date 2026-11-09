package com.openlap.plugins.artifacts;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyZeroInteractions;
import static org.mockito.Mockito.when;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.jar.JarEntry;
import java.util.jar.JarOutputStream;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;
import org.springframework.data.mongodb.core.MongoTemplate;

public class PluginArtifactRegistryTest {
  @Rule public TemporaryFolder temporary = new TemporaryFolder();
  private final PluginArtifactRepository repository = mock(PluginArtifactRepository.class);
  private final MongoTemplate mongo = mock(MongoTemplate.class);
  private final ArtifactObjectStore store = mock(ArtifactObjectStore.class);
  private final PluginArtifactRegistry registry = new PluginArtifactRegistry(repository, mongo, store);

  private Path jar() throws Exception {
    Path source = temporary.newFile("source.jar").toPath();
    try (JarOutputStream output = new JarOutputStream(Files.newOutputStream(source))) {
      output.putNextEntry(new JarEntry("example/Method.class"));
      output.write(1);
      output.closeEntry();
    }
    return source;
  }

  @Test
  public void changedSourceIsRejectedBeforeDatabaseOrObjectWrites() throws Exception {
    Path source = jar();
    String expected = ArtifactIntegrity.sha256(source);
    long size = Files.size(source);
    Files.write(source, new byte[(int) size]);
    assertThatThrownBy(() -> registry.ensureStored(PluginKind.ANALYTICS, source, expected, size, "migration"))
        .isInstanceOf(PluginStorageException.class).hasFieldOrPropertyWithValue("code", "PLUGIN_ARTIFACT_CORRUPT");
    verifyZeroInteractions(repository, mongo, store);
  }

  @Test
  public void successfulPutWithCorruptStoredBytesCannotBecomeReady() throws Exception {
    Path source = jar();
    when(repository.insert(any(PluginArtifact.class))).thenAnswer(invocation -> invocation.getArgument(0));
    when(store.open(any())).thenReturn(new ByteArrayInputStream(new byte[] {9}));
    assertThatThrownBy(() -> registry.ensureStored(PluginKind.ANALYTICS, source,
        ArtifactIntegrity.sha256(source), Files.size(source), "migration"))
        .isInstanceOf(PluginStorageException.class).hasFieldOrPropertyWithValue("code", "PLUGIN_ARTIFACT_CORRUPT");
    verifyZeroInteractions(mongo);
  }

  @Test
  public void failedObjectStoreLeavesStagedMetadataWithoutCatalogActivation() throws Exception {
    Path source = jar();
    when(repository.insert(any(PluginArtifact.class))).thenAnswer(invocation -> invocation.getArgument(0));
    when(store.open(any())).thenThrow(new PluginStorageException("PLUGIN_STORAGE_UNAVAILABLE", "offline"));
    assertThatThrownBy(() -> registry.ensureStored(PluginKind.ANALYTICS, source,
        ArtifactIntegrity.sha256(source), Files.size(source), "migration"))
        .isInstanceOf(PluginStorageException.class).hasFieldOrPropertyWithValue("code", "PLUGIN_STORAGE_UNAVAILABLE");
    verifyZeroInteractions(mongo);
  }
}
