package com.openlap.analytics_module.services;

import com.openlap.analytics_module.dto.requests.indicator.IndicatorMultiLevelAnalysisRequest;
import com.openlap.analytics_module.dto.requests.indicator.IndicatorMultiLevelMergeRequest;
import com.openlap.analytics_module.dto.requests.indicator.IndicatorMultiLevelPreviewRequest;
import com.openlap.analytics_module.dto.requests.indicator.IndicatorMultiLevelRequest;
import com.openlap.analytics_module.dto.response.indicator.CompatibleIndicatorsColumnsMergeForMultiLevel;
import com.openlap.analytics_module.dto.response.indicator.IndicatorMultiLevelMergeResponse;
import com.openlap.dataset.OpenLAPDataSet;
import javax.servlet.http.HttpServletRequest;
import java.util.List;

public interface IndicatorMultiLevelService {
  IndicatorMultiLevelMergeResponse mergeBasicIndicatorsForMultiLevelIndicator(
      IndicatorMultiLevelMergeRequest indicatorMultiLevelMergeRequest);

  List<CompatibleIndicatorsColumnsMergeForMultiLevel>
      getCompatibleIndicatorsOutputsMergeForMultiLevels(
          IndicatorMultiLevelMergeRequest indicatorMultiLevelMergeRequest);

  OpenLAPDataSet analyzeBasicIndicatorsForMultiLevelIndicator(
      IndicatorMultiLevelAnalysisRequest indicatorMultiLevelAnalysisRequest);

  String previewBasicIndicatorsForMultiLevelIndicator(
      IndicatorMultiLevelPreviewRequest indicatorMultiLevelPreviewRequest);

  void createMultiLevelIndicator(
      HttpServletRequest request, IndicatorMultiLevelRequest indicatorMultiLevelCreateRequest);

  void updateMultiLevelIndicator(
      HttpServletRequest request,
      IndicatorMultiLevelRequest indicatorMultiLevelCreateRequest,
      String indicatorId);
}
