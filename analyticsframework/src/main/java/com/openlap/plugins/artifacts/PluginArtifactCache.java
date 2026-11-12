package com.openlap.plugins.artifacts;

import com.openlap.plugins.PluginJarFiles;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.channels.FileChannel;
import java.nio.channels.FileLock;
import java.nio.channels.OverlappingFileLockException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Stream;

/**
 * A bounded, process-owned cache. Valid JARs are retained for the lifetime of classloaders;
 * admission limits, rather than eviction of possibly executing code, bound its growth.
 */
public final class PluginArtifactCache implements AutoCloseable {
  private final Path root;
  private final ArtifactObjectStore store;
  private final long maxBytes;
  private final int maxEntries;
  private final Object[] stripes = new Object[64];
  private final Map<String, BasicFileAttributes> verified = new HashMap<>();
  private final FileChannel lockChannel;
  private final FileLock processLock;
  private long reservedBytes;
  private int reservedEntries;
  private volatile boolean closed;

  public PluginArtifactCache(Path directory, long maxBytes, int maxEntries, ArtifactObjectStore store) {
    if (maxBytes <= 0 || maxEntries <= 0) throw new IllegalArgumentException("Positive plugin cache limits are required.");
    this.store = store;
    this.maxBytes = maxBytes;
    this.maxEntries = maxEntries;
    Arrays.setAll(stripes, index -> new Object());
    FileChannel channel = null;
    FileLock ownership = null;
    try {
      if (Files.isSymbolicLink(directory)) throw new IOException("Cache directory must not be a symlink.");
      Files.createDirectories(directory);
      root = directory.toRealPath();
      channel = FileChannel.open(root.resolve(".lock"), StandardOpenOption.CREATE,
          StandardOpenOption.WRITE, LinkOption.NOFOLLOW_LINKS);
      ownership = channel.tryLock();
      if (ownership == null) throw new IOException("Cache is already owned by another process.");
      try (Stream<Path> files = Files.list(root)) {
        for (Path file : (Iterable<Path>) files::iterator) {
          if (file.getFileName().toString().startsWith(".download-")
              && file.getFileName().toString().endsWith(".part")) Files.delete(file);
        }
      }
      lockChannel = channel;
      processLock = ownership;
      checkCapacity(0, 0);
    } catch (IOException | RuntimeException e) {
      try { if (ownership != null) ownership.release(); } catch (IOException ignored) {}
      try { if (channel != null) channel.close(); } catch (IOException ignored) {}
      if (e instanceof PluginStorageException) throw (PluginStorageException) e;
      throw new PluginStorageException("PLUGIN_CACHE_UNAVAILABLE", "The plugin cache must be writable and exclusive to this backend process.");
    }
  }

  public Path resolve(PluginArtifact artifact) {
    artifact.validate();
    if (artifact.getState() != PluginArtifact.State.READY) {
      throw new PluginStorageException("PLUGIN_ARTIFACT_NOT_READY", "This plugin artifact is not ready to load.");
    }
    synchronized (stripes[(artifact.getId().hashCode() & Integer.MAX_VALUE) % stripes.length]) {
      if (closed) throw new PluginStorageException("PLUGIN_CACHE_UNAVAILABLE", "The plugin cache is closed.");
      Path target = root.resolve(artifact.getId() + ".jar");
      Path staging = null;
      boolean reserved = false;
      try {
        if (Files.exists(target, LinkOption.NOFOLLOW_LINKS)) {
          if (Files.isSymbolicLink(target) || !Files.isRegularFile(target, LinkOption.NOFOLLOW_LINKS)) {
            throw new PluginStorageException("PLUGIN_CACHE_UNAVAILABLE", "The plugin cache contains an unsafe entry.");
          }
          BasicFileAttributes attributes = Files.readAttributes(target, BasicFileAttributes.class);
          BasicFileAttributes known;
          synchronized (this) { known = verified.get(artifact.getId()); }
          if (known == null || !sameFile(known, attributes)) {
            ArtifactIntegrity.verify(target, artifact);
            PluginJarFiles.validate(target);
            synchronized (this) { verified.put(artifact.getId(), attributes); }
          }
          return target;
        }
        reserve(artifact.getSizeBytes());
        reserved = true;
        staging = Files.createTempFile(root, ".download-", ".part");
        try (InputStream input = store.open(artifact); OutputStream output = Files.newOutputStream(staging)) {
          ArtifactIntegrity.copyVerified(input, output, artifact);
        }
        PluginJarFiles.validate(staging);
        synchronized (this) {
          Files.move(staging, target, StandardCopyOption.ATOMIC_MOVE);
          staging = null;
          verified.put(artifact.getId(), Files.readAttributes(target, BasicFileAttributes.class));
          reservedBytes -= artifact.getSizeBytes();
          reservedEntries--;
          reserved = false;
          notifyAll();
        }
        return target;
      } catch (IOException e) {
        throw new PluginStorageException("PLUGIN_CACHE_UNAVAILABLE", "The plugin JAR could not be cached. Check local storage and retry.");
      } finally {
        if (staging != null) {
          try { Files.deleteIfExists(staging); } catch (IOException ignored) {}
        }
        if (reserved) synchronized (this) {
          reservedBytes -= artifact.getSizeBytes();
          reservedEntries--;
          notifyAll();
        }
      }
    }
  }

  private synchronized void reserve(long bytes) throws IOException {
    if (closed) throw new PluginStorageException("PLUGIN_CACHE_UNAVAILABLE", "The plugin cache is closed.");
    checkCapacity(bytes, 1);
    reservedBytes += bytes;
    reservedEntries++;
  }

  private void checkCapacity(long bytes, int additions) throws IOException {
    long used = 0;
    int entries = 0;
    try (Stream<Path> files = Files.list(root)) {
      for (Path file : (Iterable<Path>) files::iterator) {
        if (file.getFileName().toString().endsWith(".jar")) {
          if (!Files.isRegularFile(file, LinkOption.NOFOLLOW_LINKS)) {
            throw new IOException("Unsafe cache entry.");
          }
          used = Math.addExact(used, Files.size(file));
          entries++;
        }
      }
    }
    if (bytes > maxBytes - used - reservedBytes || entries + reservedEntries + additions > maxEntries) {
      throw new PluginStorageException("PLUGIN_CACHE_CAPACITY", "The plugin cache is full. Increase its limits or clear it while this backend is stopped.");
    }
  }

  private static boolean sameFile(BasicFileAttributes a, BasicFileAttributes b) {
    return a.size() == b.size() && a.lastModifiedTime().equals(b.lastModifiedTime())
        && java.util.Objects.equals(a.fileKey(), b.fileKey());
  }

  @Override public synchronized void close() throws IOException {
    if (closed) return;
    closed = true;
    boolean interrupted = false;
    while (reservedEntries > 0) {
      try { wait(); }
      catch (InterruptedException e) { interrupted = true; }
    }
    processLock.release();
    lockChannel.close();
    if (interrupted) Thread.currentThread().interrupt();
  }
}
