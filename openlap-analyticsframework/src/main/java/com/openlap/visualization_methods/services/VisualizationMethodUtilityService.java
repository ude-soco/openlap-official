package com.openlap.visualization_methods.services;

import com.openlap.dataset.OpenLAPDataSetConfigValidationResult;
import com.openlap.dataset.OpenLAPPortConfig;
import com.openlap.template.VisualizationCodeGenerator;
import com.openlap.visualization_methods.dto.VisualizationLibraryResponse;
import com.openlap.visualization_methods.dto.VisualizationMethodFileNameResponse;
import com.openlap.visualization_methods.entities.VisLibrary;
import com.openlap.visualization_methods.entities.VisType;
import java.util.List;
import org.springframework.web.multipart.MultipartFile;

public interface VisualizationMethodUtilityService {
  void populateVisualizationMethods();

  VisType fetchVisualizationTypeMethod(String typeId);

  VisLibrary fetchVisualizationLibraryMethod(String libraryId);

  VisualizationCodeGenerator loadVisTypeInstance(String visTypeId);

  OpenLAPDataSetConfigValidationResult validateAnalyticsTechniqueToVisualizationMapping(
      String typeId, OpenLAPPortConfig analyticsTechniqueToVisualizationMapping);

  void uploadVisualizationMethodFile(MultipartFile file);

  void deleteVisualizationMethodFile(String fileName);

  void reloadVisualizationMethodFile(String fileName);

  List<VisualizationMethodFileNameResponse> getAllVisualizationMethodFileNames();

  List<VisualizationLibraryResponse> getAllVisualizationLibrariesByFilename(String fileName);
}
