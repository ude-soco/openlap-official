package com.openlap.configurations;

import com.openlap.infrastructure.exception.InvalidFileNameException;
import com.openlap.infrastructure.exception.ServiceException;
import java.io.*;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.jar.JarEntry;
import java.util.jar.JarInputStream;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
public class Utils {
  // Plugin JAR file names: a single path segment of safe characters ending in ".jar".
  private static final Pattern SAFE_JAR_NAME =
      Pattern.compile("[A-Za-z0-9._-]+\\.jar", Pattern.CASE_INSENSITIVE);

  /**
   * Validates a plugin JAR file name and returns its safe base name. Rejects null/blank names,
   * names containing path separators or ".." traversal segments, names with characters outside
   * [A-Za-z0-9._-], and any non-".jar" file. This is the single guard for all plugin file
   * operations (upload/delete/reload) — it prevents escaping the JAR directory via the file name.
   */
  public static String requireSafeJarFileName(String fileName) {
    if (fileName == null || fileName.trim().isEmpty()) {
      throw new InvalidFileNameException("A plugin file name is required.");
    }
    String name = fileName.trim();
    if (name.contains("/")
        || name.contains("\\")
        || name.contains("..")
        || name.indexOf('\0') >= 0) {
      throw new InvalidFileNameException(
          "Plugin file name must not contain path separators or '..'.");
    }
    // Defense in depth: the base name must equal the input (no directory component).
    String baseName = Paths.get(name).getFileName().toString();
    if (!baseName.equals(name) || !SAFE_JAR_NAME.matcher(baseName).matches()) {
      throw new InvalidFileNameException(
          "Invalid plugin file name: only '.jar' files are allowed.");
    }
    return baseName;
  }

  /**
   * Validates the file name and resolves it against the base directory, verifying (via normalize +
   * startsWith) that the result stays inside that directory — a defense-in-depth backstop against
   * path traversal.
   */
  public static Path resolveSafeJarPath(String baseDir, String fileName) {
    String safeName = requireSafeJarFileName(fileName);
    Path base = Paths.get(baseDir).toAbsolutePath().normalize();
    Path resolved = base.resolve(safeName).normalize();
    if (!resolved.startsWith(base)) {
      throw new InvalidFileNameException("Resolved plugin path escapes the plugin directory.");
    }
    return resolved;
  }

  public static List<String> getClassNamesFromJar(String jarName, String directoryInJar) {
    List<String> listOfClasses = new ArrayList<>();
    try (JarInputStream jarFile = new JarInputStream(new FileInputStream(jarName))) {
      JarEntry jarEntry;

      while ((jarEntry = jarFile.getNextJarEntry()) != null) {
        if (jarEntry.getName().endsWith(".class")
            && jarEntry.getName().startsWith(directoryInJar.replace('.', '/'))) {
          String className = jarEntry.getName().replace("/", ".");
          String myClass = className.substring(0, className.lastIndexOf('.'));
          listOfClasses.add(myClass);
        }
      }
    } catch (IOException e) {
      // Log the exception instead of printing it to the console
      System.err.println("Encountered an issue while parsing jar: " + e.getMessage());
      e.printStackTrace();
    }
    return listOfClasses;
  }

  public static void saveFile(MultipartFile fileToSave, String savingFolder, String fileName) {
    createFolderIfNotExisting(savingFolder);
    // Resolve to a validated, contained path before writing (defense in depth against traversal).
    Path target = resolveSafeJarPath(savingFolder, fileName);
    try (BufferedOutputStream stream =
        new BufferedOutputStream(new FileOutputStream(target.toFile()))) {
      stream.write(fileToSave.getBytes());
    } catch (IOException e) {
      throw new ServiceException("Could not save plugin file '" + target.getFileName() + "'.", e);
    }
    log.info("File '{}' saved in '{}'", target.getFileName(), savingFolder);
  }

  private static void createFolderIfNotExisting(String savingFolder) throws SecurityException {
    File theDir = new File(savingFolder);
    if (!theDir.exists()) {
      theDir.mkdir();
      log.info("Folder created: {}", savingFolder);
    }
  }

  public static void deleteFolder(String deletionFolder) {
    deleteFile(deletionFolder, "");
  }

  public static String capitalizeFirstLetter(String str) {
    if (str == null || str.isEmpty()) {
      return str;
    }
    return str.substring(0, 1).toUpperCase() + str.substring(1).toLowerCase();
  }

  public static void deleteFile(String deletionFolder, String fileName) {
    File fileToDelete = new File(deletionFolder + fileName);
    boolean deleted = fileToDelete.delete();

    // Check if the file was successfully marked for deletion
    if (deleted) {
      log.info("File '{}' marked for deletion from '{}'", fileName, deletionFolder);
    } else {
      log.warn("Failed to mark file '{}' for deletion from '{}'", fileName, deletionFolder);
      throw new ServiceException("File do not exist");
    }

    // Verify if the file actually exists after attempting deletion
    if (!fileToDelete.exists()) {
      log.info("Confirmed: File '{}' deleted from '{}'", fileName, deletionFolder);
    } else {
      log.warn(
          "File '{}' still exists in '{}' even after deletion attempt", fileName, deletionFolder);
    }
  }

  public static void deleteJarFile(String fileName) {
    File fileToDelete = new File(fileName);
    boolean deleted = fileToDelete.delete();

    // Check if the file was successfully marked for deletion
    if (deleted) {
      log.info("File '{}' marked for deletion", fileName);
    } else {
      log.warn("Failed to mark file '{}' for deletion.", fileName);
      throw new ServiceException("File do not exist");
    }

    // Verify if the file actually exists after attempting deletion
    if (!fileToDelete.exists()) {
      log.info("Confirmed: File '{}' deleted.", fileName);
    } else {
      log.warn("File '{}' still exists even after deletion attempt", fileName);
    }
  }

  public static Optional<String> findJarFile(String fileName, String folderPath)
      throws IOException {
    try (Stream<Path> paths = Files.list(Paths.get(folderPath))) {
      return paths
          .filter(Files::isRegularFile)
          .map(Path::toString)
          .filter(path -> Paths.get(path).getFileName().toString().equals(fileName))
          .findFirst();
    }
  }

  public static String decodeURIComponent(String s) {
    if (s == null) {
      return null;
    }
    return URLDecoder.decode(s, StandardCharsets.UTF_8);
  }

  public static String encodeURIComponent(String s) {
    return URLEncoder.encode(s, StandardCharsets.UTF_8)
        .replaceAll("\\%28", "(")
        .replaceAll("\\%29", ")")
        .replaceAll("\\+", "%20")
        .replaceAll("\\%27", "'")
        .replaceAll("\\%21", "!")
        .replaceAll("\\%7E", "~");
  }
}
