package com.openlap.plugins;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.openlap.configurations.Utils;
import com.openlap.infrastructure.exception.ConflictException;
import com.openlap.infrastructure.exception.ServiceException;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.jar.JarEntry;
import java.util.jar.JarOutputStream;
import java.util.stream.Stream;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;
import org.springframework.mock.web.MockMultipartFile;

public class PluginJarFilesTest {
  @Rule public TemporaryFolder temporary = new TemporaryFolder();

  private byte[] jar(String name, byte[] bytes) throws IOException {
    ByteArrayOutputStream data = new ByteArrayOutputStream();
    try (JarOutputStream archive = new JarOutputStream(data)) {
      archive.putNextEntry(new JarEntry(name));
      archive.write(bytes);
      archive.closeEntry();
    }
    return data.toByteArray();
  }

  private MockMultipartFile upload(byte[] data) {
    return new MockMultipartFile("file", "plugin.jar", "application/java-archive", data);
  }

  private byte[] validJar() throws IOException {
    // Static inspection must not load or execute this class entry.
    return jar("example/Method.class", new byte[] {(byte) 0xca, (byte) 0xfe, (byte) 0xba, (byte) 0xbe});
  }

  @Test
  public void publishesValidatedJarAndCreatesNestedDirectory() throws Exception {
    Path folder = temporary.getRoot().toPath().resolve("nested/plugins");
    byte[] data = validJar();
    Utils.saveFile(upload(data), folder.toString(), "plugin.jar");
    assertThat(Files.readAllBytes(folder.resolve("plugin.jar"))).isEqualTo(data);
    try (Stream<Path> files = Files.list(folder)) {
      assertThat(files.count()).isEqualTo(1);
    }
  }

  @Test
  public void existingJarRemainsUnchanged() throws Exception {
    Path target = temporary.newFile("plugin.jar").toPath();
    byte[] original = {1, 2, 3};
    Files.write(target, original);
    assertThatThrownBy(() -> PluginJarFiles.saveNew(upload(validJar()), target))
        .isInstanceOf(ConflictException.class)
        .hasFieldOrPropertyWithValue("code", "PLUGIN_FILE_EXISTS");
    assertThat(Files.readAllBytes(target)).isEqualTo(original);
    try (Stream<Path> files = Files.list(target.getParent())) {
      assertThat(files.count()).isEqualTo(1);
    }
  }

  @Test
  public void existingSymlinkIsNotFollowedOrReplaced() throws Exception {
    Path original = temporary.newFile("original.jar").toPath();
    Files.write(original, new byte[] {7});
    Path target = original.resolveSibling("plugin.jar");
    Files.createSymbolicLink(target, original);
    assertThatThrownBy(() -> PluginJarFiles.saveNew(upload(validJar()), target))
        .isInstanceOf(ConflictException.class);
    assertThat(Files.isSymbolicLink(target)).isTrue();
    assertThat(Files.readAllBytes(original)).containsExactly((byte) 7);
  }

  @Test
  public void simultaneousUploadsCannotReplaceEachOther() throws Exception {
    Path target = temporary.getRoot().toPath().resolve("plugin.jar");
    byte[] first = validJar();
    byte[] second = jar("example/Second.class", new byte[] {2});
    CyclicBarrier ready = new CyclicBarrier(2);
    ExecutorService executor = Executors.newFixedThreadPool(2);
    try {
      Callable<Boolean> a = () -> saveTogether(ready, first, target);
      Callable<Boolean> b = () -> saveTogether(ready, second, target);
      Future<Boolean> resultA = executor.submit(a);
      Future<Boolean> resultB = executor.submit(b);
      assertThat(Arrays.asList(resultA.get(), resultB.get())).containsExactlyInAnyOrder(true, false);
      byte[] stored = Files.readAllBytes(target);
      assertThat(Arrays.equals(stored, first) || Arrays.equals(stored, second)).isTrue();
      try (Stream<Path> files = Files.list(target.getParent())) {
        assertThat(files.count()).isEqualTo(1);
      }
    } finally {
      executor.shutdownNow();
    }
  }

  private boolean saveTogether(CyclicBarrier ready, byte[] data, Path target) throws Exception {
    ready.await();
    try {
      PluginJarFiles.saveNew(upload(data), target);
      return true;
    } catch (ConflictException e) {
      return false;
    }
  }

  @Test
  public void malformedOrEmptyUploadsLeaveNoFiles() throws Exception {
    Path target = temporary.getRoot().toPath().resolve("plugin.jar");
    for (byte[] data : new byte[][] {new byte[0], new byte[] {1, 2, 3}}) {
      assertThatThrownBy(() -> PluginJarFiles.saveNew(upload(data), target))
          .isInstanceOf(InvalidPluginJarException.class);
    }
    try (Stream<Path> files = Files.list(target.getParent())) {
      assertThat(files.count()).isZero();
    }
  }

  @Test
  public void jarWithoutClassesIsRejected() throws Exception {
    Path target = temporary.getRoot().toPath().resolve("plugin.jar");
    assertThatThrownBy(() -> PluginJarFiles.saveNew(upload(jar("notes.txt", new byte[] {1})), target))
        .isInstanceOf(InvalidPluginJarException.class)
        .hasMessageContaining("classes");
    assertThat(Files.exists(target)).isFalse();
  }

  @Test
  public void traversalInsideJarIsRejected() throws Exception {
    Path target = temporary.getRoot().toPath().resolve("plugin.jar");
    for (String name : new String[] {"../Method.class", "a/../Method.class", "/Method.class", "a\\Method.class"}) {
      assertThatThrownBy(() -> PluginJarFiles.saveNew(upload(jar(name, new byte[] {1})), target))
          .isInstanceOf(InvalidPluginJarException.class);
    }
    try (Stream<Path> files = Files.list(target.getParent())) {
      assertThat(files.count()).isZero();
    }
  }

  @Test
  public void declaredUploadLimitIsCheckedBeforeReading() throws Exception {
    Path target = temporary.getRoot().toPath().resolve("plugin.jar");
    MockMultipartFile large = new MockMultipartFile("file", new byte[] {1}) {
      @Override public long getSize() { return PluginJarFiles.MAX_UPLOAD_BYTES + 1; }
      @Override public InputStream getInputStream() { throw new AssertionError("must not read"); }
    };
    assertThatThrownBy(() -> PluginJarFiles.saveNew(large, target))
        .isInstanceOf(InvalidPluginJarException.class);
  }

  @Test
  public void actualUploadLimitDoesNotTrustMultipartSize() throws Exception {
    Path target = temporary.getRoot().toPath().resolve("plugin.jar");
    MockMultipartFile dishonest = new MockMultipartFile("file", new byte[] {1}) {
      @Override public InputStream getInputStream() {
        return new InputStream() {
          long remaining = PluginJarFiles.MAX_UPLOAD_BYTES + 1;
          @Override public int read() { return remaining-- > 0 ? 0 : -1; }
          @Override public int read(byte[] bytes, int offset, int length) {
            if (remaining <= 0) return -1;
            int count = (int) Math.min(remaining, length);
            remaining -= count;
            Arrays.fill(bytes, offset, offset + count, (byte) 0);
            return count;
          }
        };
      }
    };
    assertThatThrownBy(() -> PluginJarFiles.saveNew(dishonest, target))
        .isInstanceOf(InvalidPluginJarException.class);
    try (Stream<Path> files = Files.list(target.getParent())) {
      assertThat(files.count()).isZero();
    }
  }

  @Test
  public void tooManyArchiveEntriesAreRejected() throws Exception {
    ByteArrayOutputStream data = new ByteArrayOutputStream();
    try (JarOutputStream jar = new JarOutputStream(data)) {
      for (int i = 0; i <= PluginJarFiles.MAX_ENTRIES; i++) {
        jar.putNextEntry(new JarEntry("example/Class" + i + ".class"));
        jar.write(1);
        jar.closeEntry();
      }
    }
    Path target = temporary.getRoot().toPath().resolve("plugin.jar");
    assertThatThrownBy(() -> PluginJarFiles.saveNew(upload(data.toByteArray()), target))
        .isInstanceOf(InvalidPluginJarException.class)
        .hasMessageContaining("too many");
  }

  @Test
  public void compressedArchiveCannotBypassExpansionLimit() throws Exception {
    ByteArrayOutputStream data = new ByteArrayOutputStream();
    try (JarOutputStream jar = new JarOutputStream(data)) {
      jar.putNextEntry(new JarEntry("example/Method.class"));
      byte[] block = new byte[8192];
      for (long count = 0; count <= PluginJarFiles.MAX_EXPANDED_BYTES; count += block.length) {
        jar.write(block);
      }
      jar.closeEntry();
    }
    Path target = temporary.getRoot().toPath().resolve("plugin.jar");
    assertThatThrownBy(() -> PluginJarFiles.saveNew(upload(data.toByteArray()), target))
        .isInstanceOf(InvalidPluginJarException.class)
        .hasMessageContaining("expanded");
  }

  @Test
  public void failedInputReadLeavesNoPublishedOrStagingFile() throws Exception {
    MockMultipartFile broken = new MockMultipartFile("file", new byte[] {1}) {
      @Override public InputStream getInputStream() {
        return new InputStream() {
          boolean first = true;
          @Override public int read() throws IOException {
            if (first) { first = false; return 1; }
            throw new IOException("broken connection");
          }
        };
      }
    };
    Path target = temporary.getRoot().toPath().resolve("plugin.jar");
    assertThatThrownBy(() -> PluginJarFiles.saveNew(broken, target))
        .isInstanceOf(ServiceException.class);
    try (Stream<Path> files = Files.list(target.getParent())) {
      assertThat(files.count()).isZero();
    }
  }
}
