package com.openlap.analytics_module.services;

import com.openlap.analytics_module.entities.Indicator;
import com.openlap.analytics_module.entities.utility_entities.IndicatorAnalysisTechnique;
import com.openlap.analytics_module.entities.utility_entities.IndicatorReference;
import com.openlap.analytics_technique.dto.response.AnalyticsTechniqueResponse;
import com.openlap.dataset.OpenLAPColumnConfigData;
import com.openlap.dataset.OpenLAPDataSet;
import com.openlap.dataset.OpenLAPPortConfig;
import com.openlap.visualization_methods.entities.VisType;
import org.springframework.data.domain.Page;

import java.util.List;
import javax.servlet.http.HttpServletRequest;

public interface IndicatorUtilityService {

  Indicator fetchIndicatorMethod(String indicatorId);

  String fetchUserIndicatorForCopyMethod(String userId, String indicatorName);

  void createIndicator(HttpServletRequest request, IndicatorReference indicatorReference);

  void updateIndicator(
      HttpServletRequest request, IndicatorReference indicatorReference, String indicatorId);

  OpenLAPDataSet getAnalyzedDataSetMethod(
      IndicatorAnalysisTechnique indicatorAnalysisRequest, OpenLAPDataSet dataSet);

  String getIndicatorCodeMethod(
      OpenLAPDataSet analyzedDataSet,
      String visLibrayId,
      String visTypeId,
      OpenLAPPortConfig visMapping,
      Object visParams,
      Boolean encodeURI);

  String generateIndicatorCodeEncodeURIMethod(
      VisType visType,
      OpenLAPDataSet analyzedDataSet,
      OpenLAPPortConfig visualizationMappings,
      Object visualizationParams,
      Boolean encodeURI);

  List<OpenLAPColumnConfigData> fetchAnalyticsTechniqueOutputsByIndicatorIdMethod(
      String indicatorId);

  AnalyticsTechniqueResponse fetchAnalyticsTechniqueByIndicatorIdMethod(String indicatorId);

  Page<Indicator> fetchAllCompatibleIndicatorsByUserIdAndAnalyticsTechniqueIdMethod(
      HttpServletRequest request, String indicatorId, int page);
}
