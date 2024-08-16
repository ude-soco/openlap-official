package com.openlap.analytics_technique.services.impl;

import com.openlap.analytics_technique.dto.request.AnalyticsTechniqueRequest;
import com.openlap.analytics_technique.dto.response.AnalyticsTechniqueFileNameResponse;
import com.openlap.analytics_technique.dto.response.AnalyticsTechniqueResponse;
import com.openlap.analytics_technique.entities.AnalyticsTechnique;
import com.openlap.analytics_technique.exceptions.AnalyticsMethodClassLoaderException;
import com.openlap.analytics_technique.exceptions.AnalyticsTechniqueNotFoundException;
import com.openlap.analytics_technique.exceptions.InvalidAnalyticsTechniqueInputsException;
import com.openlap.analytics_technique.repositories.AnalyticsTechniqueRepository;
import com.openlap.analytics_technique.services.AnalyticsTechniqueService;
import com.openlap.analytics_technique.utilities.AnalyticsMethodsClassPathLoader;
import com.openlap.configurations.Utils;
import com.openlap.dataset.OpenLAPColumnConfigData;
import com.openlap.dataset.OpenLAPColumnDataType;
import com.openlap.dataset.OpenLAPDataSetConfigValidationResult;
import com.openlap.dataset.OpenLAPPortConfig;
import com.openlap.dynamicparam.OpenLAPDynamicParam;
import com.openlap.exception.DatabaseOperationException;
import com.openlap.exception.ServiceException;
import com.openlap.template.AnalyticsMethod;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import javax.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class AnalyticsTechniqueServiceImpl implements AnalyticsTechniqueService {

  @Value("${analytics.jars.folder}")
  private String analyticsMethodsJarsFolder;

  @Value("${analytics.class.directory}")
  private String analyticsMethodsClassDirectory;

  private final AnalyticsTechniqueRepository analyticsTechniqueRepository;

  private AnalyticsMethodsClassPathLoader getFolderNameFromResourcesFromJarFile(
      String jarFileName) {
    try {
      AnalyticsMethodsClassPathLoader analyticsMethodsClassPathLoader;
      if (jarFileName != null) {
        analyticsMethodsClassPathLoader = new AnalyticsMethodsClassPathLoader(jarFileName);
      } else {
        analyticsMethodsClassPathLoader =
            new AnalyticsMethodsClassPathLoader(analyticsMethodsJarsFolder);
      }
      log.info(
          "Using jar file: {}", jarFileName == null ? analyticsMethodsJarsFolder : jarFileName);
      return analyticsMethodsClassPathLoader;
    } catch (Exception e) {
      throw new AnalyticsMethodClassLoaderException(
          "Could not load analytics methods folder and jar files.", e);
    }
  }

  @Override
  public AnalyticsMethod loadAnalyticsMethodInstance(String techniqueId) {
    log.info("Loading analytics technique instance with id: {}", techniqueId);
    AnalyticsTechnique foundTechnique = fetchAnalyticsTechniqueMethod(techniqueId);
    AnalyticsMethod analyticsMethod =
        this.getFolderNameFromResourcesFromJarFile(null)
            .loadClass(foundTechnique.getImplementingClass());
    log.info("Found analytics technique {}", foundTechnique);
    return analyticsMethod;
  }

  @Override
  public void createAnalyticsTechnique(AnalyticsTechniqueRequest analyticsTechnique) {
    log.info("Creating a new analytics technique...");
    try {
      analyticsTechniqueRepository.save(
          new AnalyticsTechnique(
              null,
              analyticsTechnique.getName(),
              analyticsTechnique.getDescription(),
              analyticsTechnique.getType(),
              analyticsTechnique.getCreator(),
              analyticsTechnique.getFileName(),
              analyticsTechnique.getImplementingClass(),
              analyticsTechnique.getOutputs()));
      log.info("Successfully created analytics technique {}", analyticsTechnique);
    } catch (Exception e) {
      log.error("Could not create analytics technique {}", analyticsTechnique, e);
      throw new DatabaseOperationException("Failed to save analytics technique to the database", e);
    }
  }

  @Override
  public AnalyticsTechniqueResponse getAnalyticsTechniquesById(String techniqueId) {
    AnalyticsTechnique foundTechnique = fetchAnalyticsTechniqueMethod(techniqueId);
    return new AnalyticsTechniqueResponse(
        foundTechnique.getId(), foundTechnique.getName(), foundTechnique.getDescription());
  }

  @Override
  public AnalyticsTechnique fetchAnalyticsTechniqueMethod(String techniqueId) {
    try {
      log.info("Getting analytics technique {}", techniqueId);
      Optional<AnalyticsTechnique> foundTechnique =
          analyticsTechniqueRepository.findById(techniqueId);
      if (foundTechnique.isEmpty()) {
        throw new AnalyticsTechniqueNotFoundException(
            "Analytics Technique with id '" + techniqueId + "' not found: ");
      }
      log.info("Analytics technique found '{}'", foundTechnique.get().getName());
      return foundTechnique.get();
    } catch (Exception e) {
      throw new DatabaseOperationException(
          "Could not access database to find the analytics technique", e);
    }
  }

  @Override
  public List<AnalyticsTechniqueResponse> getAllAnalyticsTechniques() {
    List<AnalyticsTechniqueResponse> analyticsTechniqueResponses = new ArrayList<>();
    for (AnalyticsTechnique analyticsTechnique : fetchAllAnalyticsTechniquesMethod()) {
      analyticsTechniqueResponses.add(
          new AnalyticsTechniqueResponse(
              analyticsTechnique.getId(),
              analyticsTechnique.getName(),
              analyticsTechnique.getDescription()));
    }
    return analyticsTechniqueResponses;
  }

  @Override
  public List<AnalyticsTechnique> fetchAllAnalyticsTechniquesMethod() {
    log.info("Getting all analytics techniques");
    try {
      List<AnalyticsTechnique> foundAllTechniques = analyticsTechniqueRepository.findAll();
      log.info("Successfully retrieved all analytics techniques");
      return foundAllTechniques;
    } catch (Exception e) {
      log.error("Could not retrieve all analytics techniques", e);
      throw new DatabaseOperationException("Failed to retrieve all analytics techniques", e);
    }
  }

  // Populate Analytics Technique
  @Override
  public boolean populateAnalyticsTechniques() {
    List<AnalyticsTechnique> existingAnalyticsMethods = fetchAllAnalyticsTechniquesMethod();

    try (Stream<Path> paths = Files.walk(Paths.get(analyticsMethodsJarsFolder))) {
      List<String> jarFiles =
          paths.filter(Files::isRegularFile).map(Path::toString).collect(Collectors.toList());

      for (String jarFile : jarFiles) {
        processAnalyticsTechniqueJarFile(jarFile, existingAnalyticsMethods);
      }
    } catch (IOException e) {
      throw new DatabaseOperationException("Error populating analytics techniques", e);
    }

    return true;
  }

  private void processAnalyticsTechniqueJarFile(
      String jarFile, List<AnalyticsTechnique> existingAnalyticsMethods) {
    List<String> classNames = Utils.getClassNamesFromJar(jarFile, analyticsMethodsClassDirectory);
    AnalyticsMethodsClassPathLoader classPathLoader =
        getFolderNameFromResourcesFromJarFile(jarFile);
    List<AnalyticsTechnique> newMethods = new ArrayList<>();

    for (String className : classNames) {
      try {
        // validation required
        com.openlap.template.AnalyticsMethod method = classPathLoader.loadClass(className);
        if (isClassAlreadyProcessed(className, existingAnalyticsMethods)) {
          continue;
        }
        AnalyticsTechnique analyticsMethod = addNewAnalyticsTechnique(method, jarFile, className);
        newMethods.add(analyticsMethod);
      } catch (Exception e) {
        // Log the exception instead of ignoring it
        e.printStackTrace();
      }
    }
    analyticsTechniqueRepository.saveAll(newMethods);
  }

  private boolean isClassAlreadyProcessed(
      String className, List<AnalyticsTechnique> existingAnalyticsMethods) {
    return existingAnalyticsMethods.stream()
        .anyMatch(c -> c.getImplementingClass().equals(className));
  }

  private AnalyticsTechnique addNewAnalyticsTechnique(
      com.openlap.template.AnalyticsMethod method, String jarFile, String className) {
    AnalyticsTechnique analyticsMethod =
        new AnalyticsTechnique(
            null,
            method.getAnalyticsMethodName(),
            method.getAnalyticsMethodDescription(),
            method.getType(),
            method.getAnalyticsMethodCreator(),
            jarFile,
            className,
            null);

    String outputs =
        method.getOutputPorts().stream()
            .filter(port -> port.getType().equals(OpenLAPColumnDataType.Numeric))
            .map(port -> port.getId())
            .collect(Collectors.joining(","));

    analyticsMethod.setOutputs(outputs);

    return analyticsMethod;
  }

  @Override
  public List<OpenLAPColumnConfigData> getAnalyticsTechniqueInputs(String techniqueId) {
    AnalyticsMethod method = loadAnalyticsMethodInstance(techniqueId);
    List<OpenLAPColumnConfigData> ports = method.getInputPorts();
    ports.sort(Comparator.comparing(OpenLAPColumnConfigData::getTitle));
    log.info("Found analytics technique input ports");
    return ports;
  }

  @Override
  public List<OpenLAPColumnConfigData> getAnalyticsTechniqueOutputs(String techniqueId) {
    AnalyticsMethod method = loadAnalyticsMethodInstance(techniqueId);
    List<OpenLAPColumnConfigData> ports = method.getOutputPorts();
    ports.sort(Comparator.comparing(OpenLAPColumnConfigData::getTitle));
    log.info("Found analytics technique output ports");
    return ports;
  }

  @Override
  public List<OpenLAPDynamicParam> getAnalyticsTechniqueParams(String techniqueId) {
    AnalyticsMethod method = loadAnalyticsMethodInstance(techniqueId);
    List<OpenLAPDynamicParam> paramsAsList = method.getParams().getParamsAsList(false);
    log.info("Found analytics technique parameter");
    return paramsAsList;
  }

  @Override
  public OpenLAPDataSetConfigValidationResult validateAnalyticsTechniqueMapping(
      String techniqueId, OpenLAPPortConfig indicatorToAnalyticsTechniqueMapping) {
    try {
      AnalyticsMethod method = loadAnalyticsMethodInstance(techniqueId);
      OpenLAPDataSetConfigValidationResult validationResult =
          method.getInput().validateConfiguration(indicatorToAnalyticsTechniqueMapping);
      boolean resultValid = validationResult.isValid();
      log.info("Validated analytics technique input mapping with query is: {}.", resultValid);
      if (resultValid) {
        return validationResult;
      } else
        throw new InvalidAnalyticsTechniqueInputsException(
            "The mapping between the analytics technique mapping and query is invalid");
    } catch (Exception e) {
      throw new InvalidAnalyticsTechniqueInputsException(
          "The mapping between the analytics technique mapping and query is invalid");
    }
  }

  @Override
  public void uploadAnalyticsTechniqueFile(MultipartFile file) {
    if (file.isEmpty()) {
      throw new ServiceException("File is empty");
    }
    String fileName = file.getOriginalFilename();
    Utils.saveFile(file, analyticsMethodsJarsFolder, fileName);
    List<AnalyticsTechnique> existingAnalyticsMethods = fetchAllAnalyticsTechniquesMethod();
    findJarAndAddMethod(fileName, existingAnalyticsMethods);
  }

  private void findJarAndAddMethod(
      String fileName, List<AnalyticsTechnique> existingAnalyticsMethods) {
    try {
      Optional<String> jarFilePath = Utils.findJarFile(fileName, analyticsMethodsJarsFolder);
      jarFilePath.ifPresent(
          jarFile -> processAnalyticsTechniqueJarFile(jarFile, existingAnalyticsMethods));
    } catch (IOException e) {
      throw new DatabaseOperationException("Error populating analytics techniques", e);
    }
  }

  @Override
  public void deleteAnalyticsTechniqueFile(String fileName) {
    Utils.deleteFile(analyticsMethodsJarsFolder, fileName);
    String frameworkLocation = analyticsMethodsJarsFolder + fileName;
    List<AnalyticsTechnique> allByFileName =
        analyticsTechniqueRepository.findAllByFileName(frameworkLocation);
    if (!allByFileName.isEmpty()) {
      analyticsTechniqueRepository.deleteAll(allByFileName);
      log.info("Deleted all analytics technique from database");
    } else {
      log.warn("No analytics techniques found");
    }
  }

  @Override
  public void reloadAnalyticsTechniqueFile(String fileName) {
    String frameworkLocation = analyticsMethodsJarsFolder + fileName;
    List<AnalyticsTechnique> existingAnalyticsMethods =
        analyticsTechniqueRepository.findAllByFileName(frameworkLocation);
    findJarAndAddMethod(fileName, existingAnalyticsMethods);
  }

  @Override
  public List<AnalyticsTechniqueFileNameResponse> getAllAnalyticsTechniqueFileNames() {
    List<AnalyticsTechnique> foundAllAnalyticsTechniques = analyticsTechniqueRepository.findAll();
    Set<String> uniqueFileNames = new HashSet<>();
    List<AnalyticsTechniqueFileNameResponse> responses = new ArrayList<>();
    for (AnalyticsTechnique analyticsTechnique : foundAllAnalyticsTechniques) {
      String fileName = analyticsTechnique.getFileName();
      if (uniqueFileNames.add(fileName)) {
        String modifiedFileName = fileName.replace(analyticsMethodsJarsFolder, "");
        responses.add(new AnalyticsTechniqueFileNameResponse(modifiedFileName));
      }
    }
    return responses;
  }

  @Override
  public List<AnalyticsTechniqueResponse> getAllAnalyticsTechniqueByFileName(String fileName) {
    String frameworkLocation = analyticsMethodsJarsFolder + fileName;
    List<AnalyticsTechnique> allByFileName =
        analyticsTechniqueRepository.findAllByFileName(frameworkLocation);
    List<AnalyticsTechniqueResponse> responses = new ArrayList<>();
    for (AnalyticsTechnique analyticsTechnique : allByFileName) {
      responses.add(
          new AnalyticsTechniqueResponse(
              analyticsTechnique.getId(),
              analyticsTechnique.getName(),
              analyticsTechnique.getDescription()));
    }
    return responses;
  }
}
