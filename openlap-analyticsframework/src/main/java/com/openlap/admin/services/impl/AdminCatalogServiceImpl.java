package com.openlap.admin.services.impl;

import com.openlap.admin.dto.AdminAnalyticsMethodResponse;
import com.openlap.admin.dto.AdminVisLibraryResponse;
import com.openlap.admin.dto.AdminVisTypeResponse;
import com.openlap.admin.services.AdminCatalogService;
import com.openlap.analytics_technique.entities.AnalyticsTechnique;
import com.openlap.analytics_technique.repositories.AnalyticsTechniqueRepository;
import com.openlap.analytics_technique.services.AnalyticsTechniqueService;
import com.openlap.visualization_methods.entities.VisLibrary;
import com.openlap.visualization_methods.entities.VisType;
import com.openlap.visualization_methods.repositories.VisualizationLibraryRepository;
import com.openlap.visualization_methods.repositories.VisualizationTypeRepository;
import com.openlap.visualization_methods.services.VisualizationMethodUtilityService;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Admin catalog management. Lists return ALL items (including disabled), and status toggles flip the
 * soft-disable flag via the existing {@code fetch*} resolvers (findById) — so a disabled item is
 * never deleted and existing indicators that reference it keep resolving.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AdminCatalogServiceImpl implements AdminCatalogService {

  private final VisualizationLibraryRepository visualizationLibraryRepository;
  private final VisualizationTypeRepository visualizationTypeRepository;
  private final AnalyticsTechniqueRepository analyticsTechniqueRepository;
  private final VisualizationMethodUtilityService visualizationMethodUtilityService;
  private final AnalyticsTechniqueService analyticsTechniqueService;

  @Override
  public List<AdminVisLibraryResponse> getVisualizationLibraries() {
    List<AdminVisLibraryResponse> result = new ArrayList<>();
    for (VisLibrary library : visualizationLibraryRepository.findAll()) {
      result.add(toLibraryResponse(library));
    }
    return result;
  }

  @Override
  public List<AdminVisTypeResponse> getVisualizationTypes() {
    List<AdminVisTypeResponse> result = new ArrayList<>();
    for (VisType type : visualizationTypeRepository.findAll()) {
      result.add(toTypeResponse(type));
    }
    return result;
  }

  @Override
  public List<AdminAnalyticsMethodResponse> getAnalyticsMethods() {
    List<AdminAnalyticsMethodResponse> result = new ArrayList<>();
    for (AnalyticsTechnique technique : analyticsTechniqueRepository.findAll()) {
      result.add(toMethodResponse(technique));
    }
    return result;
  }

  @Override
  public AdminVisLibraryResponse getVisualizationLibraryById(String id) {
    return toLibraryResponse(visualizationMethodUtilityService.fetchVisualizationLibraryMethod(id));
  }

  @Override
  public AdminVisTypeResponse getVisualizationTypeById(String id) {
    return toTypeResponse(visualizationMethodUtilityService.fetchVisualizationTypeMethod(id));
  }

  @Override
  public AdminAnalyticsMethodResponse getAnalyticsMethodById(String id) {
    return toMethodResponse(analyticsTechniqueService.fetchAnalyticsTechniqueMethod(id));
  }

  @Override
  public AdminVisLibraryResponse setVisualizationLibraryEnabled(String id, boolean enabled) {
    VisLibrary library = visualizationMethodUtilityService.fetchVisualizationLibraryMethod(id);
    library.setEnabled(enabled);
    log.info("Admin set visualization library '{}' enabled={}", id, enabled);
    return toLibraryResponse(visualizationLibraryRepository.save(library));
  }

  @Override
  public AdminVisTypeResponse setVisualizationTypeEnabled(String id, boolean enabled) {
    VisType type = visualizationMethodUtilityService.fetchVisualizationTypeMethod(id);
    type.setEnabled(enabled);
    log.info("Admin set visualization type '{}' enabled={}", id, enabled);
    return toTypeResponse(visualizationTypeRepository.save(type));
  }

  @Override
  public AdminAnalyticsMethodResponse setAnalyticsMethodEnabled(String id, boolean enabled) {
    AnalyticsTechnique technique = analyticsTechniqueService.fetchAnalyticsTechniqueMethod(id);
    technique.setEnabled(enabled);
    log.info("Admin set analytics method '{}' enabled={}", id, enabled);
    return toMethodResponse(analyticsTechniqueRepository.save(technique));
  }

  private AdminVisLibraryResponse toLibraryResponse(VisLibrary library) {
    return new AdminVisLibraryResponse(
        library.getId(),
        library.getCreator(),
        library.getName(),
        library.getDescription(),
        library.isEnabled());
  }

  private AdminVisTypeResponse toTypeResponse(VisType type) {
    String library =
        type.getVisualizationLib() == null ? null : type.getVisualizationLib().getName();
    String imageCode = null;
    if (type.getImplementingClass() != null) {
      String[] parts = type.getImplementingClass().split("\\.");
      imageCode = parts[parts.length - 1];
    }
    return new AdminVisTypeResponse(
        type.getId(), library, type.getName(), imageCode, type.isEnabled());
  }

  private AdminAnalyticsMethodResponse toMethodResponse(AnalyticsTechnique technique) {
    return new AdminAnalyticsMethodResponse(
        technique.getId(), technique.getName(), technique.getDescription(), technique.isEnabled());
  }
}
