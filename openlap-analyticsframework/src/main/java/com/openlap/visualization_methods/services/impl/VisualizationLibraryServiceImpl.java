package com.openlap.visualization_methods.services.impl;

import com.openlap.plugins.management.PluginCatalogVisibility;

import com.openlap.infrastructure.exception.DatabaseOperationException;
import com.openlap.plugins.LegacyPluginDeletionException;
import com.openlap.visualization_methods.dto.VisualizationLibraryResponse;
import com.openlap.visualization_methods.entities.VisLibrary;
import com.openlap.visualization_methods.entities.VisType;
import com.openlap.visualization_methods.repositories.VisualizationLibraryRepository;
import com.openlap.visualization_methods.repositories.VisualizationTypeRepository;
import com.openlap.visualization_methods.services.VisualizationLibraryService;
import com.openlap.visualization_methods.services.VisualizationMethodUtilityService;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class VisualizationLibraryServiceImpl implements VisualizationLibraryService {
  private final VisualizationLibraryRepository visualizationLibraryRepository;
  private final VisualizationMethodUtilityService visualizationMethodUtilityService;
  private final VisualizationTypeRepository visualizationTypeRepository;
  private final PluginCatalogVisibility pluginVisibility;

  @Override
  public List<VisualizationLibraryResponse> getAllVisualizationLibraries() {
    try {
      List<VisLibrary> foundAllVisualizationLibraries = visualizationLibraryRepository.findAll();
      if (foundAllVisualizationLibraries.isEmpty()) {
        return new ArrayList<>();
      }
      List<VisualizationLibraryResponse> visualizationLibraryResponses = new ArrayList<>();
      for (VisLibrary visLibrary : foundAllVisualizationLibraries) {
        // Editor list: hide soft-disabled libraries from new indicator selection.
        if (!visLibrary.isEnabled() || !pluginVisibility.isVisible(visLibrary.getInstallationId(), "visualization-library", visLibrary.getId())) {
          continue;
        }
        visualizationLibraryResponses.add(
            new VisualizationLibraryResponse(
                visLibrary.getId(),
                visLibrary.getCreator(),
                visLibrary.getName(),
                visLibrary.getDescription()));
      }
      return visualizationLibraryResponses;
    } catch (Exception e) {
      throw new DatabaseOperationException(
          "Could not access database to get visualization libraries", e);
    }
  }

  @Override
  public void deleteVisualizationLibrary(String libraryId) {
    throw new LegacyPluginDeletionException();
  }

  @Override
  public VisualizationLibraryResponse getVisualizationLibrary(String libraryId) {
    VisLibrary foundVisLibrary =
        visualizationMethodUtilityService.fetchVisualizationLibraryMethod(libraryId);
    return new VisualizationLibraryResponse(
        foundVisLibrary.getId(),
        foundVisLibrary.getCreator(),
        foundVisLibrary.getName(),
        foundVisLibrary.getDescription());
  }
}
