package com.openlap.plugins;

import com.openlap.infrastructure.exception.ConflictException;
import com.openlap.infrastructure.exception.ServiceException;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.FileAlreadyExistsException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Enumeration;
import java.util.HashSet;
import java.util.Set;
import java.util.jar.JarEntry;
import java.util.jar.JarFile;
import java.util.Locale;
import java.util.zip.CRC32;
import org.springframework.web.multipart.MultipartFile;

/** Static archive inspection only. This does not execute or establish trust in plugin code. */
public final class PluginJarFiles {
  static final long MAX_UPLOAD_BYTES = 100L * 1024 * 1024;
  static final long MAX_EXPANDED_BYTES = 256L * 1024 * 1024;
  static final int MAX_ENTRIES = 10000;

  private PluginJarFiles() {}

  /** Resolves the recorded JAR only; never substitute another JAR containing the same class. */
  public static Path installedPath(String folder, String recordedPath) {
    if (recordedPath == null || recordedPath.trim().isEmpty()) {
      throw new ServiceException("The installed plugin has no recorded JAR file.");
    }
    try {
      Path base = java.nio.file.Paths.get(folder).toAbsolutePath().normalize();
      Path recorded = java.nio.file.Paths.get(recordedPath);
      Path candidate = recorded.getNameCount() == 1 ? base.resolve(recorded) : recorded;
      candidate = candidate.toAbsolutePath().normalize();
      if (!candidate.startsWith(base)
          || !candidate.getFileName().toString().toLowerCase(Locale.ROOT).endsWith(".jar")) {
        throw new ServiceException("The recorded plugin JAR is outside its configured directory.");
      }
      Path real = candidate.toRealPath();
      if (!real.startsWith(base.toRealPath()) || !Files.isRegularFile(real)) {
        throw new ServiceException("The recorded plugin JAR is outside its configured directory.");
      }
      return real;
    } catch (IOException | java.nio.file.InvalidPathException e) {
      throw new ServiceException("The recorded plugin JAR is unavailable. Restore this plugin version.", e);
    }
  }

  /**
   * Publishes a complete, validated JAR without replacing any existing file, including symlinks.
   * A hard link in the same directory provides atomic create-if-absent semantics. Atomic move
   * cannot guarantee no replacement when its destination exists on every Java filesystem.
   */
  public static void saveNew(MultipartFile upload, Path target) {
    if (upload == null || upload.isEmpty()) {
      throw new InvalidPluginJarException("Choose a nonempty JAR file.");
    }
    if (upload.getSize() > MAX_UPLOAD_BYTES) {
      throw new InvalidPluginJarException("JAR files must be no larger than 100 MiB.");
    }
    Path staging = null;
    try {
      Files.createDirectories(target.getParent());
      staging = Files.createTempFile(target.getParent(), ".plugin-upload-", ".part");
      try (InputStream input = upload.getInputStream();
          OutputStream output = Files.newOutputStream(staging)) {
        byte[] buffer = new byte[8192];
        long count = 0;
        int read;
        while ((read = input.read(buffer)) != -1) {
          count += read;
          if (count > MAX_UPLOAD_BYTES) {
            throw new InvalidPluginJarException("JAR files must be no larger than 100 MiB.");
          }
          output.write(buffer, 0, read);
        }
      }
      validate(staging);
      Files.createLink(target, staging);
    } catch (FileAlreadyExistsException e) {
      throw new ConflictException(
          "PLUGIN_FILE_EXISTS",
          "A plugin with this file name already exists. Upload a new version instead.");
    } catch (IOException | UnsupportedOperationException e) {
      throw new ServiceException("Could not store the plugin JAR. No existing file was replaced.", e);
    } finally {
      if (staging != null) {
        try {
          Files.deleteIfExists(staging);
        } catch (IOException e) {
          // Do not hide the actual upload result. Staging files cannot be loaded as JARs.
          org.slf4j.LoggerFactory.getLogger(PluginJarFiles.class)
              .warn("Could not remove plugin upload staging file", e);
        }
      }
    }
  }

  public static void validate(Path path) {
    boolean hasClass = false;
    long expanded = 0;
    int entries = 0;
    Set<String> names = new HashSet<>();
    try (JarFile jar = new JarFile(path.toFile(), true)) {
      Enumeration<JarEntry> contents = jar.entries();
      byte[] buffer = new byte[8192];
      while (contents.hasMoreElements()) {
        JarEntry entry = contents.nextElement();
        String name = entry.getName();
        if (++entries > MAX_ENTRIES || !names.add(name)) {
          throw new InvalidPluginJarException("The JAR has too many entries or duplicate entries.");
        }
        if (name.startsWith("/") || name.contains("\\") || name.indexOf('\0') >= 0
            || name.matches("(^|.*/)\\.\\.(/.*|$)") || name.matches("^[A-Za-z]:.*")) {
          throw new InvalidPluginJarException("The JAR contains an unsafe entry path.");
        }
        if (entry.isDirectory()) continue;
        long entryBytes = 0;
        CRC32 checksum = new CRC32();
        try (InputStream input = jar.getInputStream(entry)) {
          int read;
          while ((read = input.read(buffer)) != -1) {
            expanded += read;
            entryBytes += read;
            if (expanded > MAX_EXPANDED_BYTES) {
              throw new InvalidPluginJarException("The expanded JAR exceeds 256 MiB.");
            }
            checksum.update(buffer, 0, read);
          }
        }
        if (entry.getSize() != entryBytes || entry.getCrc() != checksum.getValue()) {
          throw new InvalidPluginJarException("The JAR contains a damaged entry.");
        }
        if (name.endsWith(".class") && entryBytes > 0) hasClass = true;
      }
    } catch (IOException | SecurityException e) {
      throw new InvalidPluginJarException("The file is not a readable, valid JAR archive.");
    }
    if (!hasClass) {
      throw new InvalidPluginJarException("The JAR does not contain any classes.");
    }
  }
}
