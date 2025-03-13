package com.openlap.visualization_methods.services.impl;

import com.openlap.configurations.Utils;
import com.openlap.dataset.OpenLAPDataSetConfigValidationResult;
import com.openlap.dataset.OpenLAPPortConfig;
import com.openlap.exception.DatabaseOperationException;
import com.openlap.exception.ServiceException;
import com.openlap.template.VisualizationCodeGenerator;
import com.openlap.template.VisualizationLibraryInfo;
import com.openlap.visualization_methods.dto.VisualizationLibraryResponse;
import com.openlap.visualization_methods.dto.VisualizationMethodFileNameResponse;
import com.openlap.visualization_methods.entities.VisLibrary;
import com.openlap.visualization_methods.entities.VisType;
import com.openlap.visualization_methods.exceptions.library.InvalidVisualizationInputsException;
import com.openlap.visualization_methods.exceptions.library.VisualizationLibraryNotFoundException;
import com.openlap.visualization_methods.exceptions.type.VisualizationTypeNotFoundException;
import com.openlap.visualization_methods.repositories.VisualizationLibraryRepository;
import com.openlap.visualization_methods.repositories.VisualizationTypeRepository;
import com.openlap.visualization_methods.services.VisualizationMethodUtilityService;
import com.openlap.visualization_methods.utilities.VisualizerClassPathLoader;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
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
      return foundVisType.get();
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
      return foundVisLibrary.get();
    } catch (VisualizationLibraryNotFoundException e) {
      throw e;
    } catch (Exception e) {
      throw new DatabaseOperationException(
          "Could not access database to get visualization library", e);
    }
  }

  public VisualizerClassPathLoader getFolderNameFromResourceFromJarFile() {
    return new VisualizerClassPathLoader(visualizerJarsFolder);
  }

  @Override
  public VisualizationCodeGenerator loadVisTypeInstance(String visTypeId) {
    VisType foundVisType = fetchVisualizationTypeMethod(visTypeId);
    return this.getFolderNameFromResourceFromJarFile()
        .loadTypeClass(foundVisType.getImplementingClass());
  }

  @Override
  public void populateVisualizationMethods() {
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
    if (file.isEmpty()) {
      throw new ServiceException("File is empty");
    }
    String fileName = file.getOriginalFilename();
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
    Utils.deleteFile(visualizerJarsFolder, fileName);
    String frameworkLocation = visualizerJarsFolder + fileName;
    VisLibrary foundVisLibrary =
        visualizationLibraryRepository.findByFrameworkLocation(frameworkLocation);
    if (foundVisLibrary != null) {
      List<String> visTypeIds =
          foundVisLibrary.getVisualizationTypes().stream()
              .map(VisType::getId)
              .collect(Collectors.toList());

      visTypeIds.forEach(visualizationTypeRepository::deleteById);

      visualizationLibraryRepository.delete(foundVisLibrary);
      log.info("Deleted VisLibrary and associated VisTypes");
    } else {
      log.warn("VisLibrary not found");
    }
  }

  @Override
  public void reloadVisualizationMethodFile(String fileName) {
    findJarAndAddVisualizerMethod(fileName);
  }

  @Override
  public List<VisualizationMethodFileNameResponse> getAllVisualizationMethodFileNames() {
    List<VisLibrary> foundAllVisualizationLibraries = visualizationLibraryRepository.findAll();
    Set<String> uniqueFileNames = new HashSet<>();
    List<VisualizationMethodFileNameResponse> responses = new ArrayList<>();
    for (VisLibrary visLibrary : foundAllVisualizationLibraries) {
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
