package com.openlap.visualization_methods.services;

import com.openlap.visualization_methods.dto.VisualizationLibraryResponse;
import java.util.List;

public interface VisualizationLibraryService {
  VisualizationLibraryResponse getVisualizationLibrary(String libraryId);

  List<VisualizationLibraryResponse> getAllVisualizationLibraries();
}
