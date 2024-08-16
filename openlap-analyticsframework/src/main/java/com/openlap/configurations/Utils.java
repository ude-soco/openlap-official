package com.openlap.configurations;

import com.openlap.exception.ServiceException;
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
import java.util.stream.Stream;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
public class Utils {
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
    byte[] bytes;
    try {
      bytes = fileToSave.getBytes();
      BufferedOutputStream stream =
          new BufferedOutputStream(new FileOutputStream(new File(savingFolder + fileName)));

      stream.write(bytes);
      stream.close();
    } catch (IOException e) {
      e.printStackTrace();
    }
    log.info("File '{}' saved in '{}'", fileName, savingFolder);
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
