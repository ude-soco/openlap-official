package com.openlap.analytics_technique.services.impl;

import com.openlap.plugins.management.PluginCatalogVisibility;
import com.openlap.plugins.management.PluginInspector;

import com.openlap.analytics_module.entities.utility_entities.IndicatorType;
import com.openlap.analytics_technique.dto.request.AnalyticsTechniqueRequest;
import com.openlap.analytics_module.services.impl.AnalyticsInputPreparation;
import com.openlap.analytics_technique.dto.response.AnalyticsTechniqueFileNameResponse;
import com.openlap.analytics_technique.dto.response.AnalyticsTechniqueInputParamResponse;
import com.openlap.analytics_technique.dto.response.AnalyticsTechniqueResponse;
import com.openlap.analytics_technique.dto.response.AnalyticsTechniqueResponse.BasicInputRequirement;
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
import com.openlap.infrastructure.exception.DatabaseOperationException;
import com.openlap.plugins.LegacyPluginDeletionException;
import com.openlap.infrastructure.exception.ServiceException;
import com.openlap.template.AnalyticsMethod;
import com.openlap.plugins.PluginJarFiles;
import com.openlap.plugins.artifacts.PluginArtifactResolver;
import com.openlap.plugins.artifacts.PluginKind;
import java.util.concurrent.ConcurrentHashMap;
import jakarta.annotation.PreDestroy;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.bson.Document;
import org.springframework.transaction.annotation.Transactional;

import com.openlap.visualization_methods.exceptions.VisualizationClassLoaderException;
import com.openlap.visualization_methods.utilities.VisualizerClassPathLoader;
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

  private static final String SHIPPED_METHOD_PACKAGE = "com.openlap.analytics.methods.";
  private static final Set<String> RETIRED_EDITOR_METHODS = Set.of(
      SHIPPED_METHOD_PACKAGE + "PearsonCorrelation",
      SHIPPED_METHOD_PACKAGE + "SpearmanCorrelation");

  @Value("${analytics.jars.folder}")
  private String analyticsMethodsJarsFolder;

  private final AnalyticsTechniqueRepository analyticsTechniqueRepository;
  private final PluginArtifactResolver pluginArtifactResolver;
  private final PluginCatalogVisibility pluginVisibility;

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

  private final Map<String, AnalyticsMethodsClassPathLoader> loaderCache = new ConcurrentHashMap<>();

  @Override
  public AnalyticsMethod loadAnalyticsMethodInstance(String techniqueId) {
    AnalyticsTechnique technique = fetchAnalyticsTechniqueMethod(techniqueId);
    String jarPath = pluginArtifactResolver.resolve(PluginKind.ANALYTICS, technique.getArtifactId(),
        analyticsMethodsJarsFolder, technique.getFileName())
        .toString();
    AnalyticsMethodsClassPathLoader loader = loaderCache.computeIfAbsent(
        jarPath, AnalyticsMethodsClassPathLoader::new);
    return loader.loadClass(technique.getImplementingClass());
  }

  @PreDestroy
  public void closePluginLoaders() {
    loaderCache.values().forEach(AnalyticsMethodsClassPathLoader::close);
    loaderCache.clear();
  }

  @Override
  public void createAnalyticsTechnique(AnalyticsTechniqueRequest analyticsTechnique) {
    pluginArtifactResolver.requireLocalMutation();
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
              analyticsTechnique.getOutputs(),
              true,
              null,
              null,
              null));
      log.info("Successfully created analytics technique {}", analyticsTechnique);
    } catch (Exception e) {
      log.error("Could not create analytics technique {}", analyticsTechnique, e);
      throw new DatabaseOperationException("Failed to save analytics technique to the database", e);
    }
  }

  @Override
  public AnalyticsTechniqueResponse getAnalyticsTechniquesById(String techniqueId) {
    return catalogResponse(fetchAnalyticsTechniqueMethod(techniqueId));
  }

  private static AnalyticsTechniqueResponse catalogResponse(AnalyticsTechnique technique) {
    Document metadata = technique.getAnalyticsMetadata();
    if (metadata == null) return new AnalyticsTechniqueResponse(technique.getId(), technique.getName(), technique.getDescription());
    List<IndicatorType> recommendedFor = metadata.getList("recommendedFor", String.class, List.of())
        .stream().map(IndicatorType::valueOf).toList();
    String requirement = metadata.getString("basicInputRequirement");
    return new AnalyticsTechniqueResponse(
        technique.getId(), technique.getName(), technique.getDescription(), recommendedFor,
        requirement == null ? null : BasicInputRequirement.valueOf(requirement), metadata);
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
      pluginVisibility.requireExecutable(foundTechnique.get().getInstallationId(), "analytics-technique", foundTechnique.get().getId());
      return foundTechnique.get();
    } catch (com.openlap.infrastructure.exception.ConflictException e) {
      throw e;
    } catch (Exception e) {
      throw new DatabaseOperationException(
          "Could not access database to find the analytics technique", e);
    }
  }

  @Override
  public List<AnalyticsTechniqueResponse> getAllAnalyticsTechniques() {
    List<AnalyticsTechniqueResponse> analyticsTechniqueResponses = new ArrayList<>();
    for (AnalyticsTechnique analyticsTechnique : fetchAllAnalyticsTechniquesMethod()) {
      // Keep installed methods executable by ID even when they are unavailable for selection.
      if (!analyticsTechnique.isEnabled() || RETIRED_EDITOR_METHODS.contains(
          Objects.toString(analyticsTechnique.getImplementingClass(), ""))) {
        continue;
      }
      analyticsTechniqueResponses.add(catalogResponse(analyticsTechnique));
    }
    return analyticsTechniqueResponses;
  }

  @Override
  public List<AnalyticsTechnique> fetchAllAnalyticsTechniquesMethod() {
    log.info("Getting all analytics techniques");
    try {
      List<AnalyticsTechnique> foundAllTechniques = analyticsTechniqueRepository.findAll();
      log.info("Successfully retrieved all analytics techniques");
      return foundAllTechniques.stream().filter(item -> pluginVisibility.isVisible(item.getInstallationId(), "analytics-technique", item.getId()))
          .collect(Collectors.toList());
    } catch (Exception e) {
      log.error("Could not retrieve all analytics techniques", e);
      throw new DatabaseOperationException("Failed to retrieve all analytics techniques", e);
    }
  }

  // Populate Analytics Technique
  @Override
  public boolean populateAnalyticsTechniques() {
    pluginArtifactResolver.requireLocalMutation();
    List<AnalyticsTechnique> existingAnalyticsMethods = fetchAllAnalyticsTechniquesMethod();

    try (Stream<Path> paths = Files.walk(Paths.get(analyticsMethodsJarsFolder))) {
      List<String> jarFiles =
          paths.filter(Files::isRegularFile)
              .filter(path -> path.getFileName().toString().toLowerCase(Locale.ROOT).endsWith(".jar"))
              .sorted().map(Path::toString).collect(Collectors.toList());

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
    Path installedPath = PluginJarFiles.installedPath(analyticsMethodsJarsFolder, jarFile);
    var inspection = new PluginInspector().discover(PluginKind.ANALYTICS, installedPath);
    var manifest = inspection.getAnalyticsManifest();
    List<AnalyticsTechnique> newMethods = new ArrayList<>();
    Map<AnalyticsTechnique, Document> metadataUpdates = new LinkedHashMap<>();
    try (AnalyticsMethodsClassPathLoader classPathLoader =
        getFolderNameFromResourcesFromJarFile(installedPath.toString())) {
      for (String className : inspection.getClasses()) {
        var existing = existingAnalyticsMethods.stream()
            .filter(method -> className.equals(method.getImplementingClass())).toList();
        if (existing.isEmpty()) {
          AnalyticsMethod method = classPathLoader.loadClass(className);
          var technique = addNewAnalyticsTechnique(method, jarFile, className);
          technique.setAnalyticsMetadata(manifest.metadata(className, method));
          newMethods.add(technique);
          continue;
        }
        if (loaderCache.containsKey(installedPath.toString())) continue; // A running binary remains paired with its existing metadata until restart.
        for (AnalyticsTechnique method : existing) {
          if (!isSameLocalInstallation(method, installedPath)) continue;
          Document metadata = manifest.hasMetadata(className)
              ? manifest.metadata(className, classPathLoader.loadClass(className)) : null;
          if (!Objects.equals(metadata, method.getAnalyticsMetadata())) metadataUpdates.put(method, metadata);
        }
      }
    }
    if (!newMethods.isEmpty()) analyticsTechniqueRepository.saveAll(newMethods);
    existingAnalyticsMethods.addAll(newMethods);
    metadataUpdates.forEach((method, metadata) -> {
      analyticsTechniqueRepository.refreshLocalMetadata(method.getId(), method.getFileName(), method.getImplementingClass(), metadata);
      method.setAnalyticsMetadata(metadata);
    });
  }

  private boolean isSameLocalInstallation(AnalyticsTechnique method, Path installedPath) {
    if (method.getArtifactId() != null || method.getInstallationId() != null || method.getFileName() == null) return false;
    try {
      return installedPath.equals(PluginJarFiles.installedPath(analyticsMethodsJarsFolder, method.getFileName()));
    } catch (ServiceException unavailable) {
      return false;
    }
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
            null,
            true,
            null,
            null,
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
          method.getInput().validateConfiguration(AnalyticsInputPreparation.normalizeMapping(
              method.getInput(), indicatorToAnalyticsTechniqueMapping));
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
    pluginArtifactResolver.requireLocalMutation();
    String fileName = Utils.requireSafeJarFileName(file.getOriginalFilename());
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
    throw new LegacyPluginDeletionException();
  }

  @Override
  public void reloadAnalyticsTechniqueFile(String fileName) {
    pluginArtifactResolver.requireLocalMutation();
    String safeFileName = Utils.requireSafeJarFileName(fileName);
    String frameworkLocation = analyticsMethodsJarsFolder + safeFileName;
    List<AnalyticsTechnique> existingAnalyticsMethods =
        analyticsTechniqueRepository.findAllByFileName(frameworkLocation);
    findJarAndAddMethod(safeFileName, existingAnalyticsMethods);
  }

  @Override
  public List<AnalyticsTechniqueFileNameResponse> getAllAnalyticsTechniqueFileNames() {
    List<AnalyticsTechnique> foundAllAnalyticsTechniques = analyticsTechniqueRepository.findAll();
    Set<String> uniqueFileNames = new HashSet<>();
    List<AnalyticsTechniqueFileNameResponse> responses = new ArrayList<>();
    for (AnalyticsTechnique analyticsTechnique : foundAllAnalyticsTechniques) {
      if (!pluginVisibility.isVisible(analyticsTechnique.getInstallationId(), "analytics-technique", analyticsTechnique.getId())) continue;
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
      if (!pluginVisibility.isVisible(analyticsTechnique.getInstallationId(), "analytics-technique", analyticsTechnique.getId())) continue;
      responses.add(catalogResponse(analyticsTechnique));
    }
    return responses;
  }

  @Override
  public void deleteAnalyticsMethod(String analyticsId) {
    throw new LegacyPluginDeletionException();
  }

  @Override
  public AnalyticsTechniqueInputParamResponse getAnalyticsTechniqueInputsAndParams(
      String methodId) {
    AnalyticsMethod method = loadAnalyticsMethodInstance(methodId);
    List<OpenLAPColumnConfigData> ports = method.getInputPorts();
    ports.sort(Comparator.comparing(OpenLAPColumnConfigData::getTitle));
    List<OpenLAPDynamicParam> paramsAsList = method.getParams().getParamsAsList(false);
    return new AnalyticsTechniqueInputParamResponse(ports, paramsAsList);
  }
}
