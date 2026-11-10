package com.openlap.analytics_engine.services.impl;

import com.openlap.analytics_engine.services.EngineService;
import com.openlap.analytics_module.services.AnalyticsGoalsService;
import com.openlap.analytics_technique.services.AnalyticsTechniqueService;
import com.openlap.visualization_methods.services.VisualizationMethodUtilityService;
import com.openlap.plugins.artifacts.PluginArtifactResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EngineServiceImpl implements EngineService {
  private final AnalyticsGoalsService analyticsGoalsService;
  private final AnalyticsTechniqueService analyticsTechniqueService;
  private final VisualizationMethodUtilityService visualizationMethodService;
  private final PluginArtifactResolver pluginArtifactResolver;

  @Override
  public boolean initializeDatabase() {
    analyticsGoalsService.populateAnalyticsGoal();
    if (!pluginArtifactResolver.usesObjectStorage()) {
      analyticsTechniqueService.populateAnalyticsTechniques();
      visualizationMethodService.populateVisualizationMethods();
    }
    return true;
  }
}
