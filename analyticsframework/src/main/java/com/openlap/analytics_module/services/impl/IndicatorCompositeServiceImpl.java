package com.openlap.analytics_module.services.impl;

import com.openlap.analytics_module.dto.requests.indicator.IndicatorCompositeMergeRequest;
import com.openlap.analytics_module.dto.requests.indicator.IndicatorCompositePreviewRequest;
import com.openlap.analytics_module.dto.requests.indicator.IndicatorCompositeRequest;
import com.openlap.analytics_module.entities.utility_entities.IndicatorReference;
import com.openlap.analytics_module.services.IndicatorCompositeService;
import com.openlap.analytics_module.services.IndicatorUtilityService;
import com.openlap.dataset.OpenLAPDataSet;
import com.openlap.dataset.OpenLAPPortConfig;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class IndicatorCompositeServiceImpl implements IndicatorCompositeService {
  private final ComplexIndicatorDataService combinations;
  private final IndicatorUtilityService indicatorUtilityService;

  @Override
  public OpenLAPDataSet mergeIndicatorsForCompositeIndicator(IndicatorCompositeMergeRequest request) {
    return combinations.combine(request.getIndicators(), request.getColumnToMerge(), false);
  }

  @Override
  public OpenLAPDataSet visualizationData(IndicatorCompositeMergeRequest request, OpenLAPPortConfig mapping) {
    return ComplexIndicatorDataService.visualizationData(
        combinations.combine(request.getIndicators(), request.getColumnToMerge(), false), mapping);
  }

  @Override
  public String previewIndicatorComposite(IndicatorCompositePreviewRequest request) {
    OpenLAPDataSet data = visualizationData(
        new IndicatorCompositeMergeRequest(request.getColumnToMerge(), request.getIndicators()), request.getVisualizationMapping());
    return indicatorUtilityService.getIndicatorCodeMethod(data, request.getVisualizationLibraryId(),
        request.getVisualizationTypeId(), request.getVisualizationMapping(), request.getVisualizationParams(), true);
  }

  @Override
  public void createCompositeIndicator(HttpServletRequest request, IndicatorCompositeRequest body) {
    validateSavedDefinition(body);
    indicatorUtilityService.createIndicator(request, reference(body));
  }

  @Override
  public void updateCompositeIndicator(HttpServletRequest request, IndicatorCompositeRequest body, String indicatorId) {
    validateSavedDefinition(body);
    indicatorUtilityService.updateIndicator(request, reference(body), indicatorId);
  }

  private void validateSavedDefinition(IndicatorCompositeRequest body) {
    ComplexIndicatorConfiguration.validate(body.getConfiguration(), body.getIndicatorType());
    visualizationData(new IndicatorCompositeMergeRequest(body.getColumnToMerge(), body.getIndicators()), body.getVisualizationMapping());
  }

  private static IndicatorReference reference(IndicatorCompositeRequest body) {
    IndicatorReference reference = new IndicatorReference();
    reference.setName(body.getName());
    reference.setIndicatorType(body.getIndicatorType());
    reference.setVisualizationLibraryId(body.getVisualizationLibraryId());
    reference.setVisualizationTypeId(body.getVisualizationTypeId());
    reference.setVisualizationParams(body.getVisualizationParams());
    reference.setVisualizationMapping(body.getVisualizationMapping());
    reference.setColumnToMerge(body.getColumnToMerge());
    reference.setIndicators(body.getIndicators());
    reference.setConfigurationRequest(body.getConfiguration());
    return reference;
  }
}
