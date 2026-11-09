package com.openlap.visualization_methods.services.impl;

import com.openlap.plugins.management.PluginCatalogVisibility;

import com.openlap.configurations.Utils;
import com.openlap.dataset.OpenLAPDataSetConfigValidationResult;
import com.openlap.dataset.OpenLAPPortConfig;
import com.openlap.infrastructure.exception.DatabaseOperationException;
import com.openlap.plugins.LegacyPluginDeletionException;
import com.openlap.infrastructure.exception.ServiceException;
import com.openlap.template.VisualizationCodeGenerator;
import com.openlap.plugins.PluginJarFiles;
import com.openlap.plugins.artifacts.PluginArtifactResolver;
import com.openlap.plugins.artifacts.PluginKind;
import javax.annotation.PreDestroy;
import com.openlap.template.VisualizationLibraryInfo;
import com.openlap.visualization_methods.dto.VisualizationLibraryResponse;
import com.openlap.visualization_methods.dto.VisualizationMethodFileNameResponse;
import com.openlap.visualization_methods.entities.VisLibrary;
import com.openlap.visualization_methods.entities.VisType;
import com.openlap.visualization_methods.exceptions.VisualizationClassLoaderException;
import com.openlap.visualization_methods.exceptions.library.InvalidVisualizationInputsException;
import com.openlap.visualization_methods.exceptions.library.VisualizationLibraryNotFoundException;
import com.openlap.visualization_methods.exceptions.type.VisualizationTypeNotFoundException;
import com.openlap.visualization_methods.repositories.VisualizationLibraryRepository;
import com.openlap.visualization_methods.repositories.VisualizationTypeRepository;
import com.openlap.visualization_methods.services.VisualizationMethodUtilityService;
import com.openlap.visualization_methods.utilities.VisualizerClassPathLoader;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
@Slf4j
public class VisualizationMethodUtilityServiceImpl implements VisualizationMethodUtilityService {
  private final VisualizationTypeRepository visualizationTypeRepository;
  private final VisualizationLibraryRepository visualizationLibraryRepository;
  private final PluginArtifactResolver pluginArtifactResolver;
  private final PluginCatalogVisibility pluginVisibility;

  @Value("${visualizer.jars.folder}")
  String visualizerJarsFolder;

  @Value("${visualizer.class.directory}")
  String visualizerClassDirectory;

  @Override
  public VisType fetchVisualizationTypeMethod(String typeId) {
    try {
      Optional<VisType> foundVisType = visualizationTypeRepository.findById(typeId);
      if (foundVisType.isEmpty()) {
        throw new VisualizationTypeNotFoundException(
            "Visualization type with id" + typeId + " not found");
      }
      pluginVisibility.requireInstalled(foundVisType.get().getInstallationId());
      if (foundVisType.get().getVisualizationLib() != null) {
        pluginVisibility.requireInstalled(foundVisType.get().getVisualizationLib().getInstallationId());
      }
      return foundVisType.get();
    } catch (com.openlap.infrastructure.exception.ConflictException e) {
      throw e;
    } catch (VisualizationTypeNotFoundException e) {
      throw e;
    } catch (Exception e) {
      throw new DatabaseOperationException(
          "Could not access database to get visualization library", e);
    }
  }

  @Override
  public VisLibrary fetchVisualizationLibraryMethod(String libraryId) {
    try {
      Optional<VisLibrary> foundVisLibrary = visualizationLibraryRepository.findById(libraryId);
      if (foundVisLibrary.isEmpty()) {
        throw new VisualizationLibraryNotFoundException(
            "Visualization library with id" + libraryId + " not found");
      }
      pluginVisibility.requireInstalled(foundVisLibrary.get().getInstallationId());
      return foundVisLibrary.get();
    } catch (com.openlap.infrastructure.exception.ConflictException e) {
      throw e;
    } catch (VisualizationLibraryNotFoundException e) {
      throw e;
    } catch (Exception e) {
      throw new DatabaseOperationException(
          "Could not access database to get visualization library", e);
    }
  }

  private final Map<String, VisualizerClassPathLoader> loaderCache = new ConcurrentHashMap<>();

  @Override
  public VisualizationCodeGenerator loadVisTypeInstance(String visTypeId) {
    VisType type = fetchVisualizationTypeMethod(visTypeId);
    VisLibrary library = type.getVisualizationLib();
    if (library == null) {
      throw new VisualizationClassLoaderException("The visualization type has no installed library.");
    }
    String jarPath = pluginArtifactResolver.resolve(PluginKind.VISUALIZATION, library.getArtifactId(),
        visualizerJarsFolder, library.getFrameworkLocation())
        .toString();
    VisualizerClassPathLoader loader = loaderCache.computeIfAbsent(
        jarPath, VisualizerClassPathLoader::new);
    return loader.loadTypeClass(type.getImplementingClass());
  }

  @PreDestroy
  public void closePluginLoaders() {
    loaderCache.values().forEach(VisualizerClassPathLoader::close);
    loaderCache.clear();
  }

  @Override
  public void populateVisualizationMethods() {
    pluginArtifactResolver.requireLocalMutation();
    List<VisLibrary> existingVisualizationLibraries = visualizationLibraryRepository.findAll();
    List<VisType> existingVisualizationTypes = visualizationTypeRepository.findAll();

    try (Stream<Path> walk = Files.walk(Paths.get(visualizerJarsFolder))) {
      List<String> jarFiles =
          walk.filter(Files::isRegularFile)
              .filter(path -> path.toString().endsWith(".jar"))
              .map(Path::toString)
              .collect(Collectors.toList());

      for (String jarFile : jarFiles) {
        processVisualizerJarFile(
            jarFile, existingVisualizationLibraries, existingVisualizationTypes);
      }
    } catch (IOException e) {
      throw new ServiceException("Error loading visualization libraries", e);
    }
  }

  private void processVisualizerJarFile(
      String jarFile,
      List<VisLibrary> existingLibraries,
      List<VisType> existingVisualizationTypes) {
    List<String> classNames = Utils.getClassNamesFromJar(jarFile, visualizerClassDirectory);

    VisualizerClassPathLoader classPathLoader = new VisualizerClassPathLoader(jarFile);
    VisLibrary visualizationLibrary = null;
    List<VisType> newTypes = new ArrayList<>();

    for (String className : classNames) {
      try {
        VisualizationLibraryInfo libraryInfo = classPathLoader.loadLibraryInfo(className);
        visualizationLibrary = findOrCreateLibrary(libraryInfo, existingLibraries, jarFile);
      } catch (Exception e) {
        log.warn(
            "Class {} is not a visualization library or could not be loaded: {}",
            className,
            e.getMessage());
      }

      try {
        VisualizationCodeGenerator visualizationType = classPathLoader.loadTypeClass(className);
        if (visualizationType != null
            && !isTypeAlreadyAdded(existingVisualizationTypes, className)) {
          VisType newVizType = createNewVisType(visualizationType, className, visualizationLibrary);
          newTypes.add(newVizType);
        }
      } catch (Exception e) {
        log.warn(
            "Class {} does not inherit 'VisualizationCodeGenerator' or could not be loaded: {}",
            className,
            e.getMessage());
      }
    }

    if (visualizationLibrary != null) {
      saveVisualizationLibrary(visualizationLibrary, newTypes);
    } else {
      log.warn(
          "No implementation of 'VisualizationLibraryInfo' abstract class found in JAR file: {}",
          jarFile);
    }
  }

  private VisLibrary findOrCreateLibrary(
      VisualizationLibraryInfo libraryInfo, List<VisLibrary> existingLibraries, String jarFile) {
    return existingLibraries.stream()
        .filter(vizLib -> vizLib.getName().equals(libraryInfo.getName()))
        .findAny()
        .orElse(
            new VisLibrary(
                null,
                libraryInfo.getDeveloperName(),
                libraryInfo.getName(),
                libraryInfo.getDescription(),
                jarFile,
                null,
                true,
                null,
                null));
  }

  private boolean isTypeAlreadyAdded(List<VisType> existingVisualizationTypes, String className) {
    return existingVisualizationTypes.stream()
        .anyMatch(vizType -> vizType.getImplementingClass().equals(className));
  }

  private VisType createNewVisType(
      VisualizationCodeGenerator visualizationType, String className, VisLibrary library) {
    VisType newVizType = new VisType();
    newVizType.setName(visualizationType.getName());
    newVizType.setImplementingClass(className);
    newVizType.setVisualizationLib(library);
    newVizType.setChartConfiguration(visualizationType.getConfiguration());
    return newVizType;
  }

  private void saveVisualizationLibrary(VisLibrary library, List<VisType> types) {
    VisLibrary visLibrary;
    if (library.getId() == null) {
      visLibrary = visualizationLibraryRepository.save(library);
      // ? Assuming it's a new library, and it has found some types
      for (VisType visType : types) {
        visType.setVisualizationLib(visLibrary);
      }
      visualizationTypeRepository.saveAll(types);
      visLibrary.setVisualizationTypes(types);
      visualizationLibraryRepository.save(visLibrary);
    } else {
      if (!types.isEmpty()) {
        for (VisType visType : types) {
          visType.setVisualizationLib(library);
        }
        visualizationTypeRepository.saveAll(types);
        library.getVisualizationTypes().addAll(types);
        visualizationLibraryRepository.save(library);
      }
    }
  }

  @Override
  public OpenLAPDataSetConfigValidationResult validateAnalyticsTechniqueToVisualizationMapping(
      String typeId, OpenLAPPortConfig analyticsTechniqueToVisualizationMapping) {
    try {
      VisualizationCodeGenerator visualizationType = loadVisTypeInstance(typeId);
      OpenLAPDataSetConfigValidationResult validationResult =
          visualizationType
              .getInput()
              .validateConfiguration(analyticsTechniqueToVisualizationMapping);
      boolean resultValid = validationResult.isValid();
      log.info("Validated visualization method inputs mapping with query is: {}.", resultValid);
      if (resultValid) {
        return validationResult;
      } else
        throw new InvalidVisualizationInputsException(
            "The mapping between the visualization inputs and analytics technique output is invalid.");

    } catch (Exception e) {
      throw new InvalidVisualizationInputsException(
          "The mapping between the visualization inputs and analytics technique output is invalid.");
    }
  }

  @Override
  public void uploadVisualizationMethodFile(MultipartFile file) {
    pluginArtifactResolver.requireLocalMutation();
    String fileName = Utils.requireSafeJarFileName(file.getOriginalFilename());
    Utils.saveFile(file, visualizerJarsFolder, fileName);

    findJarAndAddVisualizerMethod(fileName);
  }

  private void findJarAndAddVisualizerMethod(String fileName) {
    List<VisLibrary> existingVisualizationLibraries = visualizationLibraryRepository.findAll();
    List<VisType> existingVisualizationTypes = visualizationTypeRepository.findAll();
    try {
      Optional<String> jarFilePath = Utils.findJarFile(fileName, visualizerJarsFolder);
      jarFilePath.ifPresent(
          jarFile ->
              processVisualizerJarFile(
                  jarFile, existingVisualizationLibraries, existingVisualizationTypes));
    } catch (IOException e) {
      throw new DatabaseOperationException("Error populating visualization techniques", e);
    }
  }

  @Override
  public void deleteVisualizationMethodFile(String fileName) {
    throw new LegacyPluginDeletionException();
  }

  @Override
  public void reloadVisualizationMethodFile(String fileName) {
    pluginArtifactResolver.requireLocalMutation();
    findJarAndAddVisualizerMethod(Utils.requireSafeJarFileName(fileName));
  }

  @Override
  public List<VisualizationMethodFileNameResponse> getAllVisualizationMethodFileNames() {
    List<VisLibrary> foundAllVisualizationLibraries = visualizationLibraryRepository.findAll();
    Set<String> uniqueFileNames = new HashSet<>();
    List<VisualizationMethodFileNameResponse> responses = new ArrayList<>();
    for (VisLibrary visLibrary : foundAllVisualizationLibraries) {
      if (!pluginVisibility.isInstalled(visLibrary.getInstallationId())) continue;
      String fileName = visLibrary.getFrameworkLocation();
      if (uniqueFileNames.add(fileName)) {
        String modifiedFileName = fileName.replace(visualizerJarsFolder, "");
        responses.add(new VisualizationMethodFileNameResponse(modifiedFileName));
      }
    }
    return responses;
  }

  @Override
  public List<VisualizationLibraryResponse> getAllVisualizationLibrariesByFilename(
      String fileName) {
    String frameworkLocation = visualizerJarsFolder + fileName;
    List<VisLibrary> foundVisLibrary =
        visualizationLibraryRepository.findAllByFrameworkLocation(frameworkLocation);
    List<VisualizationLibraryResponse> responses = new ArrayList<>();
    for (VisLibrary visLibrary : foundVisLibrary) {
      if (!pluginVisibility.isInstalled(visLibrary.getInstallationId())) continue;
      responses.add(
          new VisualizationLibraryResponse(
              visLibrary.getId(),
              visLibrary.getCreator(),
              visLibrary.getName(),
              visLibrary.getDescription()));
    }
    return responses;
  }
}
