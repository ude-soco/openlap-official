package com.openlap.analytics_engine.services.impl;

import com.openlap.analytics_engine.services.EngineService;
import com.openlap.analytics_module.services.AnalyticsGoalsService;
import com.openlap.analytics_technique.services.AnalyticsTechniqueService;
import com.openlap.visualization_methods.services.VisualizationMethodUtilityService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EngineServiceImpl implements EngineService {
  private final AnalyticsGoalsService analyticsGoalsService;
  private final AnalyticsTechniqueService analyticsTechniqueService;
  private final VisualizationMethodUtilityService visualizationMethodService;

  @Override
  public boolean initializeDatabase() {
    analyticsGoalsService.populateAnalyticsGoal();
    analyticsTechniqueService.populateAnalyticsTechniques();
    visualizationMethodService.populateVisualizationMethods();
    return true;
  }
}
