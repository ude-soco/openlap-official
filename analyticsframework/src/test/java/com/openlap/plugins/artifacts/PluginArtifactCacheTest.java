package com.openlap.plugins.artifacts;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.FileTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.jar.JarEntry;
import java.util.jar.JarOutputStream;
import java.util.stream.Stream;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

public class PluginArtifactCacheTest {
  @Rule public TemporaryFolder temporary = new TemporaryFolder();

  private byte[] jar(int marker) throws IOException {
    ByteArrayOutputStream bytes = new ByteArrayOutputStream();
    try (JarOutputStream output = new JarOutputStream(bytes)) {
      output.putNextEntry(new JarEntry("example/Method.class"));
      output.write(new byte[] {(byte) 0xca, (byte) 0xfe, (byte) 0xba, (byte) 0xbe, (byte) marker});
      output.closeEntry();
    }
    return bytes.toByteArray();
  }

  private PluginArtifact artifact(byte[] bytes) throws IOException {
    Path source = temporary.newFile().toPath();
    Files.write(source, bytes);
    PluginArtifact staged = PluginArtifact.staged(PluginKind.ANALYTICS,
        ArtifactIntegrity.sha256(source), bytes.length, "test");
    return new PluginArtifact(staged.getId(), staged.getKind(), staged.getSha256(), staged.getSizeBytes(),
        staged.getObjectKey(), PluginArtifact.State.READY, staged.getCreatedAt(), "test");
  }

  private Path root() { return temporary.getRoot().toPath().resolve("cache"); }

  private ArtifactObjectStore store(byte[] bytes, AtomicInteger reads) {
    return new ArtifactObjectStore() {
      @Override public void putIfAbsent(PluginArtifact artifact, Path source) { throw new AssertionError("cache must never upload"); }
      @Override public InputStream open(PluginArtifact artifact) {
        reads.incrementAndGet();
        return new ByteArrayInputStream(bytes);
      }
    };
  }

  @Test
  public void concurrentRequestsDownloadOneCompleteVerifiedJar() throws Exception {
    byte[] bytes = jar(1);
    PluginArtifact artifact = artifact(bytes);
    AtomicInteger reads = new AtomicInteger();
    ExecutorService executor = Executors.newFixedThreadPool(8);
    try (PluginArtifactCache cache = new PluginArtifactCache(root(), 100000, 4, store(bytes, reads))) {
      CyclicBarrier start = new CyclicBarrier(8);
      List<Future<Path>> results = new ArrayList<>();
      for (int i = 0; i < 8; i++) results.add(executor.submit(() -> { start.await(); return cache.resolve(artifact); }));
      for (Future<Path> result : results) assertThat(Files.readAllBytes(result.get())).isEqualTo(bytes);
      assertThat(reads.get()).isEqualTo(1);
      assertThat(filesEnding(".part")).isZero();
      assertThat(filesEnding(".jar")).isEqualTo(1);
    } finally { executor.shutdownNow(); }
  }

  @Test
  public void verifiedCacheSurvivesProcessRestartAndStorageOutage() throws Exception {
    byte[] bytes = jar(1);
    PluginArtifact artifact = artifact(bytes);
    try (PluginArtifactCache cache = new PluginArtifactCache(root(), 100000, 4, store(bytes, new AtomicInteger()))) {
      cache.resolve(artifact);
    }
    AtomicInteger failedReads = new AtomicInteger();
    ArtifactObjectStore unavailable = new ArtifactObjectStore() {
      @Override public void putIfAbsent(PluginArtifact artifact, Path source) { throw new AssertionError(); }
      @Override public InputStream open(PluginArtifact artifact) {
        failedReads.incrementAndGet();
        throw new PluginStorageException("PLUGIN_STORAGE_UNAVAILABLE", "offline");
      }
    };
    try (PluginArtifactCache restarted = new PluginArtifactCache(root(), 100000, 4, unavailable)) {
      assertThat(Files.readAllBytes(restarted.resolve(artifact))).isEqualTo(bytes);
      assertThat(failedReads.get()).isZero();
    }
    Files.delete(root().resolve(artifact.getId() + ".jar"));
    try (PluginArtifactCache cold = new PluginArtifactCache(root(), 100000, 4, unavailable)) {
      assertThatThrownBy(() -> cold.resolve(artifact)).isInstanceOf(PluginStorageException.class)
          .hasFieldOrPropertyWithValue("code", "PLUGIN_STORAGE_UNAVAILABLE");
      assertThat(filesEnding(".part")).isZero();
    }
  }

  @Test
  public void damagedOrTruncatedDownloadsNeverPublishAJarAndReleaseCapacity() throws Exception {
    byte[] bytes = jar(1);
    PluginArtifact artifact = artifact(bytes);
    for (byte[] broken : new byte[][] {new byte[] {1}, new byte[bytes.length], new byte[bytes.length + 1]}) {
      try (PluginArtifactCache cache = new PluginArtifactCache(root(), 100000, 1, store(broken, new AtomicInteger()))) {
        assertThatThrownBy(() -> cache.resolve(artifact)).isInstanceOf(PluginStorageException.class)
            .hasFieldOrPropertyWithValue("code", "PLUGIN_ARTIFACT_CORRUPT");
        assertThat(filesEnding(".jar")).isZero();
        assertThat(filesEnding(".part")).isZero();
      }
    }
    try (PluginArtifactCache cache = new PluginArtifactCache(root(), 100000, 1, store(bytes, new AtomicInteger()))) {
      assertThat(Files.readAllBytes(cache.resolve(artifact))).isEqualTo(bytes);
    }
  }

  @Test
  public void limitsBlockNewArtifactsWithoutDeletingLoadedFiles() throws Exception {
    byte[] first = jar(1);
    byte[] second = jar(2);
    PluginArtifact a = artifact(first);
    PluginArtifact b = artifact(second);
    AtomicInteger reads = new AtomicInteger();
    try (PluginArtifactCache cache = new PluginArtifactCache(root(), first.length, 1, store(first, reads))) {
      Path pinned = cache.resolve(a);
      assertThatThrownBy(() -> cache.resolve(b)).isInstanceOf(PluginStorageException.class)
          .hasFieldOrPropertyWithValue("code", "PLUGIN_CACHE_CAPACITY");
      assertThat(reads.get()).isEqualTo(1);
      assertThat(Files.readAllBytes(pinned)).isEqualTo(first);
    }
    assertThatThrownBy(() -> new PluginArtifactCache(root(), 1, 1, store(first, reads)))
        .isInstanceOf(PluginStorageException.class).hasFieldOrPropertyWithValue("code", "PLUGIN_CACHE_CAPACITY");
    // A failed constructor must release ownership.
    try (PluginArtifactCache cache = new PluginArtifactCache(root(), 100000, 1, store(first, reads))) {
      assertThat(cache.resolve(a)).exists();
    }
  }

  @Test
  public void unsafeOrChangedCacheEntriesAreRejectedWithoutFallback() throws Exception {
    byte[] bytes = jar(1);
    PluginArtifact artifact = artifact(bytes);
    AtomicInteger reads = new AtomicInteger();
    try (PluginArtifactCache cache = new PluginArtifactCache(root(), 100000, 4, store(bytes, reads))) {
      Path target = cache.resolve(artifact);
      Files.write(target, new byte[bytes.length]);
      Files.setLastModifiedTime(target, FileTime.fromMillis(System.currentTimeMillis() + 2000));
      assertThatThrownBy(() -> cache.resolve(artifact)).isInstanceOf(PluginStorageException.class)
          .hasFieldOrPropertyWithValue("code", "PLUGIN_ARTIFACT_CORRUPT");
      assertThat(reads.get()).isEqualTo(1);
    }
    Path target = root().resolve(artifact.getId() + ".jar");
    Files.delete(target);
    Path outside = temporary.newFile().toPath();
    Files.write(outside, bytes);
    Files.createSymbolicLink(target, outside);
    assertThatThrownBy(() -> new PluginArtifactCache(root(), 100000, 4, store(bytes, reads)))
        .isInstanceOf(PluginStorageException.class);
    assertThat(Files.readAllBytes(outside)).isEqualTo(bytes);
  }

  @Test
  public void oneProcessOwnsEachCacheAndCleansAbandonedParts() throws Exception {
    byte[] bytes = jar(1);
    try (PluginArtifactCache first = new PluginArtifactCache(root(), 100000, 4, store(bytes, new AtomicInteger()))) {
      assertThatThrownBy(() -> new PluginArtifactCache(root(), 100000, 4, store(bytes, new AtomicInteger())))
          .isInstanceOf(PluginStorageException.class);
    }
    Files.write(root().resolve(".download-abandoned.part"), bytes);
    try (PluginArtifactCache restarted = new PluginArtifactCache(root(), 100000, 4, store(bytes, new AtomicInteger()))) {
      assertThat(filesEnding(".part")).isZero();
    }
  }

  @Test
  public void invalidRegistryIdentityCannotEscapeTheCache() throws Exception {
    byte[] bytes = jar(1);
    PluginArtifact good = artifact(bytes);
    PluginArtifact bad = new PluginArtifact("../../outside", good.getKind(), good.getSha256(), good.getSizeBytes(),
        good.getObjectKey(), PluginArtifact.State.READY, good.getCreatedAt(), "test");
    AtomicInteger reads = new AtomicInteger();
    try (PluginArtifactCache cache = new PluginArtifactCache(root(), 100000, 4, store(bytes, reads))) {
      assertThatThrownBy(() -> cache.resolve(bad)).isInstanceOf(PluginStorageException.class);
      assertThat(reads.get()).isZero();
    }
  }

  private long filesEnding(String suffix) throws IOException {
    try (Stream<Path> files = Files.list(root())) {
      return files.filter(path -> path.toString().endsWith(suffix)).count();
    }
  }
}
