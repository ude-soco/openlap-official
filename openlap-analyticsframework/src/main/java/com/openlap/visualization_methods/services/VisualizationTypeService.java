package com.openlap.visualization_methods.services;

import com.openlap.dataset.OpenLAPColumnConfigData;
import com.openlap.visualization_methods.dto.VisualizationTypeResponse;
import java.util.List;

public interface VisualizationTypeService {
  List<VisualizationTypeResponse> getAllVisualizationTypes();

  VisualizationTypeResponse getVisualizationType(String typeId);

  List<OpenLAPColumnConfigData> getVisTypeInputs(String typeId);

  // TODO: The output of the visualization type is always null, this may not be needed
  List<OpenLAPColumnConfigData> getVisTypeOutputs(String typeId);

  List<VisualizationTypeResponse> getAllVisualizationTypesByVisualizationLibraryId(
      String libraryId);
}
