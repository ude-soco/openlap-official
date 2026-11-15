package com.openlap.analytics_module.services.impl;

import com.openlap.analytics_module.dto.requests.indicator.*;
import com.openlap.analytics_module.dto.response.indicator.CompatibleIndicatorsColumnsMergeForMultiLevel;
import com.openlap.analytics_module.dto.response.indicator.ComplexIndicatorMergeResult;
import com.openlap.analytics_module.dto.response.indicator.IndicatorMultiLevelMergeResponse;
import com.openlap.analytics_module.entities.Indicator;
import com.openlap.analytics_module.entities.utility_entities.IndicatorAnalysisTechnique;
import com.openlap.analytics_module.entities.utility_entities.IndicatorReference;
import com.openlap.analytics_module.services.IndicatorBasicService;
import com.openlap.analytics_module.services.IndicatorMultiLevelService;
import com.openlap.analytics_module.services.IndicatorUtilityService;
import com.openlap.dataset.*;
import com.openlap.infrastructure.exception.ValidationException;
import java.util.*;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class IndicatorMultiLevelServiceImpl implements IndicatorMultiLevelService {
  private final ComplexIndicatorDataService combinations;
  private final IndicatorBasicService basic;
  private final IndicatorUtilityService indicatorUtilityService;

  @Override
  public IndicatorMultiLevelMergeResponse mergeBasicIndicatorsForMultiLevelIndicator(IndicatorMultiLevelMergeRequest request) {
    return new IndicatorMultiLevelMergeResponse(combinations.combine(request.getIndicators(), null, true));
  }

  @Override
  public List<CompatibleIndicatorsColumnsMergeForMultiLevel> getCompatibleIndicatorsOutputsMergeForMultiLevels(IndicatorMultiLevelMergeRequest request) {
    List<CompatibleIndicatorsColumnsMergeForMultiLevel> results = new ArrayList<>();
    for (IndicatorsToMergeRequest item : request.getIndicators()) {
      Indicator source = indicatorUtilityService.fetchIndicatorMethod(item.getIndicatorId());
      OpenLAPDataSet data = basic.analyzeIndicatorByIndicatorId(source.getId());
      List<OpenLAPColumnConfigData> keys = data.getColumnsConfigurationData().stream()
          .filter(column -> column.getType() == OpenLAPColumnDataType.Text || column.getType() == OpenLAPColumnDataType.Numeric).toList();
      results.add(new CompatibleIndicatorsColumnsMergeForMultiLevel(source.getId(), source.getName(), keys, data));
    }
    return results;
  }

  @Override
  public OpenLAPDataSet analyzeBasicIndicatorsForMultiLevelIndicator(IndicatorMultiLevelAnalysisRequest request) {
    ComplexIndicatorMergeResult merged = combinations.combine(request.getIndicators(), null, true);
    ComplexIndicatorDataService.requireNonempty(merged);
    ComplexIndicatorDataService.requireMapping(merged, request.getAnalyticsTechniqueMapping());
    OpenLAPDataSet selected = new OpenLAPDataSet();
    for (OpenLAPPortMapping mapping : request.getAnalyticsTechniqueMapping().getMapping()) {
      String id = mapping.getOutputPort().getId();
      selected.getColumns().put(id, merged.getColumns().get(id));
    }
    IndicatorAnalysisTechnique analysis = new IndicatorAnalysisTechnique(request.getAnalyticsTechniqueId(),
        request.getAnalyticsTechniqueMapping(), request.getAnalyticsTechniqueParams() == null ? List.of() : request.getAnalyticsTechniqueParams());
    OpenLAPDataSet result = indicatorUtilityService.getAnalyzedDataSetMethod(analysis, selected);
    if (result == null || result.getColumns().isEmpty()) {
      throw new ValidationException("INVALID_INDICATOR_ANALYSIS", "The analytics method returned no output. Review its required inputs and parameters.");
    }
    return result;
  }

  @Override
  public String previewBasicIndicatorsForMultiLevelIndicator(IndicatorMultiLevelPreviewRequest request) {
    OpenLAPDataSet analyzed = analyzeBasicIndicatorsForMultiLevelIndicator(new IndicatorMultiLevelAnalysisRequest(
        request.getIndicators(), request.getAnalyticsTechniqueId(), request.getAnalyticsTechniqueMapping(), request.getAnalyticsTechniqueParams()));
    ComplexIndicatorDataService.requireMapping(analyzed, request.getVisualizationMapping());
    return indicatorUtilityService.getIndicatorCodeMethod(analyzed, request.getVisualizationLibraryId(),
        request.getVisualizationTypeId(), request.getVisualizationMapping(), request.getVisualizationParams(), true);
  }

  @Override
  public void createMultiLevelIndicator(HttpServletRequest request, IndicatorMultiLevelRequest body) {
    validateSavedDefinition(body);
    indicatorUtilityService.createIndicator(request, reference(body));
  }

  @Override
  public void updateMultiLevelIndicator(HttpServletRequest request, IndicatorMultiLevelRequest body, String indicatorId) {
    validateSavedDefinition(body);
    indicatorUtilityService.updateIndicator(request, reference(body), indicatorId);
  }

  private void validateSavedDefinition(IndicatorMultiLevelRequest body) {
    ComplexIndicatorConfiguration.validate(body.getConfiguration(), body.getIndicatorType());
    OpenLAPDataSet analyzed = analyzeBasicIndicatorsForMultiLevelIndicator(new IndicatorMultiLevelAnalysisRequest(
        body.getIndicators(), body.getAnalyticsTechniqueId(), body.getAnalyticsTechniqueMapping(), body.getAnalyticsTechniqueParams()));
    ComplexIndicatorDataService.requireMapping(analyzed, body.getVisualizationMapping());
  }

  private static IndicatorReference reference(IndicatorMultiLevelRequest body) {
    IndicatorReference reference = new IndicatorReference();
    reference.setName(body.getName());
    reference.setIndicatorType(body.getIndicatorType());
    reference.setVisualizationLibraryId(body.getVisualizationLibraryId());
    reference.setVisualizationTypeId(body.getVisualizationTypeId());
    reference.setVisualizationParams(body.getVisualizationParams());
    reference.setVisualizationMapping(body.getVisualizationMapping());
    reference.setAnalyticsTechniqueId(body.getAnalyticsTechniqueId());
    reference.setAnalyticsTechniqueMapping(body.getAnalyticsTechniqueMapping());
    reference.setAnalyticsTechniqueParams(body.getAnalyticsTechniqueParams());
    reference.setIndicators(body.getIndicators());
    reference.setConfigurationRequest(body.getConfiguration());
    return reference;
  }
}
