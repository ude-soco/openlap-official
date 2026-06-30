package com.openlap.visualization_methods.services.impl;

import com.google.gson.Gson;
import com.openlap.dataset.OpenLAPColumnConfigData;
import com.openlap.dataset.OpenLAPDataSet;
import com.openlap.infrastructure.exception.DatabaseOperationException;
import com.openlap.infrastructure.exception.ServiceException;
import com.openlap.template.VisualizationCodeGenerator;
import com.openlap.visualization_methods.dto.VisualizationTypeResponse;
import com.openlap.visualization_methods.entities.VisLibrary;
import com.openlap.visualization_methods.entities.VisType;
import com.openlap.visualization_methods.entities.utility_entities.VisualizationTypeConfiguration;
import com.openlap.visualization_methods.repositories.VisualizationLibraryRepository;
import com.openlap.visualization_methods.repositories.VisualizationTypeRepository;
import com.openlap.visualization_methods.services.VisualizationMethodUtilityService;
import com.openlap.visualization_methods.services.VisualizationTypeService;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import javax.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class VisualizationTypeServiceImpl implements VisualizationTypeService {
  private final VisualizationTypeRepository visualizationTypeRepository;
  private final VisualizationMethodUtilityService visualizationMethodUtilityService;
  private final VisualizationLibraryRepository visualizationLibraryRepository;

  @Override
  public List<VisualizationTypeResponse> getAllVisualizationTypes() {
    try {
      List<VisType> foundAllVisualizationTypes = visualizationTypeRepository.findAll();
      return generateVisTypeResponseList(filterSelectableTypes(foundAllVisualizationTypes));
    } catch (Exception e) {
      throw new DatabaseOperationException(
          "Could not access database to get visualization libraries", e);
    }
  }

  /**
   * Editor list: a type is selectable only if it AND its parent library are enabled. Filtering
   * before {@code generateVisTypeResponseList} also avoids loading the JAR class of a disabled type.
   */
  static boolean isTypeSelectable(VisType visType) {
    return visType.isEnabled()
        && visType.getVisualizationLib() != null
        && visType.getVisualizationLib().isEnabled();
  }

  private static List<VisType> filterSelectableTypes(List<VisType> types) {
    return types.stream()
        .filter(VisualizationTypeServiceImpl::isTypeSelectable)
        .collect(Collectors.toList());
  }

  @Override
  public VisualizationTypeResponse getVisualizationType(String typeId) {
    return generateVisTypeResponse(
        visualizationMethodUtilityService.fetchVisualizationTypeMethod(typeId));
  }

  @Override
  public List<OpenLAPColumnConfigData> getVisTypeInputs(String typeId) {
    try {
      VisType foundVisType = visualizationMethodUtilityService.fetchVisualizationTypeMethod(typeId);
      VisualizationCodeGenerator codeGenerator =
          visualizationMethodUtilityService.loadVisTypeInstance(foundVisType.getId());
      OpenLAPDataSet inputDataSet;
      Gson gson = new Gson();
      try {
        inputDataSet = gson.fromJson(codeGenerator.getInputAsJsonString(), OpenLAPDataSet.class);
      } catch (Exception ex) {
        throw new ServiceException("Error in deserializing code generator input config.", ex);
      }
      VisualizationTypeConfiguration visualizationTypeConfiguration =
          new VisualizationTypeConfiguration();
      visualizationTypeConfiguration.setInput(inputDataSet);
      return visualizationTypeConfiguration.getInput().getColumnsConfigurationData();
    } catch (Exception ex) {
      throw new ServiceException("Error in getting visualization inputs.", ex);
    }
  }

  // ? The output of the visualization type is always null, this may not be needed
  @Override
  public List<OpenLAPColumnConfigData> getVisTypeOutputs(String typeId) {
    try {
      VisType foundVisType = visualizationMethodUtilityService.fetchVisualizationTypeMethod(typeId);
      VisualizationCodeGenerator codeGenerator =
          visualizationMethodUtilityService.loadVisTypeInstance(foundVisType.getId());
      OpenLAPDataSet outputDataSet;
      Gson gson = new Gson();
      try {
        outputDataSet = gson.fromJson(codeGenerator.getOutputAsJsonString(), OpenLAPDataSet.class);
      } catch (Exception ex) {
        throw new ServiceException("Error in deserializing code generator input config.", ex);
      }
      VisualizationTypeConfiguration visualizationTypeConfiguration =
          new VisualizationTypeConfiguration();
      visualizationTypeConfiguration.setOutput(outputDataSet);
      return visualizationTypeConfiguration.getOutput().getColumnsConfigurationData();
    } catch (Exception ex) {
      throw new ServiceException("Error in getting visualization outputs.", ex);
    }
  }

  @Override
  public List<VisualizationTypeResponse> getAllVisualizationTypesByVisualizationLibraryId(
      String libraryId) {
    try {
      List<VisType> foundAllVisualizationTypes =
          visualizationTypeRepository.findByVisualizationLib_id(libraryId);
      return generateVisTypeResponseList(filterSelectableTypes(foundAllVisualizationTypes));
    } catch (Exception e) {
      throw new DatabaseOperationException(
          "Could not access database to get visualization libraries", e);
    }
  }

  @Override
  public void deleteVisualizationType(String typeId) {
    VisType visType = visualizationMethodUtilityService.fetchVisualizationTypeMethod(typeId);
    VisLibrary visLibrary = visType.getVisualizationLib();
    if (visLibrary != null) {
      visLibrary.getVisualizationTypes().removeIf(vt -> vt.getId().equals(typeId));
      visualizationLibraryRepository.save(visLibrary);
    }
    visualizationTypeRepository.delete(visType);
  }

  private List<VisualizationTypeResponse> generateVisTypeResponseList(
      List<VisType> foundAllVisualizationTypes) {
    if (foundAllVisualizationTypes.isEmpty()) {
      return new ArrayList<>();
    }
    try {
      List<VisualizationTypeResponse> visualizationTypeResponses = new ArrayList<>();
      for (VisType visType : foundAllVisualizationTypes) {
        VisualizationTypeResponse visualizationTypeResponse = generateVisTypeResponse(visType);
        visualizationTypeResponses.add(visualizationTypeResponse);
      }
      return visualizationTypeResponses;
    } catch (Exception e) {
      throw new ServiceException("Error in generating vis type response list.", e);
    }
  }

  private VisualizationTypeResponse generateVisTypeResponse(VisType visType) {
    try {
      VisualizationCodeGenerator codeGenerator =
          visualizationMethodUtilityService.loadVisTypeInstance(visType.getId());
      OpenLAPDataSet inputDataSet;
      Gson gson = new Gson();
      try {
        inputDataSet = gson.fromJson(codeGenerator.getInputAsJsonString(), OpenLAPDataSet.class);
      } catch (Exception ex) {
        throw new ServiceException("Error in deserializing code generator input config.", ex);
      }
      VisualizationTypeConfiguration visualizationTypeConfiguration =
          new VisualizationTypeConfiguration();
      visualizationTypeConfiguration.setInput(inputDataSet);

      VisualizationTypeResponse visualizationTypeResponse = new VisualizationTypeResponse();
      visualizationTypeResponse.setId(visType.getId());
      visualizationTypeResponse.setLibrary(visType.getVisualizationLib().getName());
      visualizationTypeResponse.setName(visType.getName());
      String[] imageCodeStringList = visType.getImplementingClass().split("\\.");
      visualizationTypeResponse.setImageCode(imageCodeStringList[imageCodeStringList.length - 1]);
      visualizationTypeResponse.setChartConfiguration(visType.getChartConfiguration());
      visualizationTypeResponse.setChartInputs(
          visualizationTypeConfiguration.getInput().getColumnsConfigurationData());
      return visualizationTypeResponse;
    } catch (Exception e) {
      throw new ServiceException("Error in generating vis type response.", e);
    }
  }
}
