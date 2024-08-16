package com.openlap.analytics_module.services;

import com.openlap.analytics_module.dto.requests.indicator.IndicatorAnalysisRequest;
import com.openlap.analytics_module.dto.requests.indicator.IndicatorBasicPreviewRequest;
import com.openlap.analytics_module.dto.requests.indicator.IndicatorBasicRequest;
import com.openlap.analytics_statements.dtos.request.LrsStoresStatementRequest;
import com.openlap.dataset.OpenLAPDataSet;
import com.openlap.user.entities.User;

import java.util.List;
import javax.servlet.http.HttpServletRequest;

public interface IndicatorBasicService {
  OpenLAPDataSet analyzeIndicator(IndicatorAnalysisRequest indicatorAnalysisRequest);

  void validateUserRequest(HttpServletRequest request, List<LrsStoresStatementRequest> lrsStores);

  OpenLAPDataSet analyzeIndicatorByIndicatorId(String indicatorId);

  String previewIndicator(IndicatorBasicPreviewRequest indicatorRequest);

  void createBasicIndicator(
      HttpServletRequest request, IndicatorBasicRequest indicatorBasicRequest);

  void updateBasicIndicator(
      HttpServletRequest request, IndicatorBasicRequest indicatorBasicRequest, String indicatorId);
}
