package com.openlap.analytics_module.services;

import com.openlap.analytics_module.dto.requests.indicator.IndicatorCompositeMergeRequest;
import com.openlap.analytics_module.dto.requests.indicator.IndicatorCompositePreviewRequest;
import com.openlap.analytics_module.dto.requests.indicator.IndicatorCompositeRequest;
import com.openlap.dataset.OpenLAPDataSet;
import javax.servlet.http.HttpServletRequest;

public interface IndicatorCompositeService {
  OpenLAPDataSet mergeIndicatorsForCompositeIndicator(
      IndicatorCompositeMergeRequest indicatorCompositeRequest);

  String previewIndicatorComposite(IndicatorCompositePreviewRequest indicatorCompositeRequest);

  void createCompositeIndicator(
      HttpServletRequest request, IndicatorCompositeRequest indicatorCompositeRequest);

  void updateCompositeIndicator(
      HttpServletRequest request,
      IndicatorCompositeRequest indicatorCompositeRequest,
      String indicatorId);
}
