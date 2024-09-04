package com.openlap.analytics_module.services.impl;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.openlap.analytics_module.dto.requests.indicator.IndicatorAnalysisRequest;
import com.openlap.analytics_module.dto.requests.indicator.IndicatorBasicPreviewRequest;
import com.openlap.analytics_module.dto.requests.indicator.IndicatorBasicRequest;
import com.openlap.analytics_module.entities.Indicator;
import com.openlap.analytics_module.entities.IndicatorAnalysisCache;
import com.openlap.analytics_module.entities.IndicatorCache;
import com.openlap.analytics_module.entities.utility_entities.AnalyticsTechniqueReference;
import com.openlap.analytics_module.entities.utility_entities.IndicatorAnalysisTechnique;
import com.openlap.analytics_module.entities.utility_entities.IndicatorReference;
import com.openlap.analytics_module.exceptions.indicator.PreviewNotPossibleException;
import com.openlap.analytics_module.repositories.IndicatorAnalysisCacheRepository;
import com.openlap.analytics_module.repositories.IndicatorCacheRepository;
import com.openlap.analytics_module.services.IndicatorBasicService;
import com.openlap.analytics_module.services.IndicatorUtilityService;
import com.openlap.analytics_statements.dtos.request.LrsStoresStatementRequest;
import com.openlap.analytics_statements.dtos.request.StatementsRequest;
import com.openlap.analytics_statements.exception.LrsNotFoundException;
import com.openlap.analytics_statements.services.StatementService;
import com.openlap.analytics_technique.entities.AnalyticsTechnique;
import com.openlap.analytics_technique.services.AnalyticsTechniqueService;
import com.openlap.dataset.OpenLAPDataSet;
import com.openlap.dataset.OpenLAPPortConfig;
import com.openlap.dynamicparam.OpenLAPDynamicParam;
import com.openlap.exception.ServiceException;
import com.openlap.exceptions.AnalyticsMethodInitializationException;
import com.openlap.template.AnalyticsMethod;
import com.openlap.user.entities.User;
import com.openlap.user.entities.utility_entities.LrsConsumer;
import com.openlap.user.services.TokenService;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import javax.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class IndicatorBasicServiceImpl implements IndicatorBasicService {
  private final AnalyticsTechniqueService analyticsTechniqueService;
  private final StatementService statementService;
  private final IndicatorUtilityService indicatorUtilityService;
  private final TokenService tokenService;
  private final IndicatorCacheRepository indicatorCacheRepository;

  @Override
  public OpenLAPDataSet analyzeIndicator(IndicatorAnalysisRequest indicatorAnalysisRequest) {
    try {
      OpenLAPDataSet statements =
          statementService.findStatements(indicatorAnalysisRequest.getIndicatorQuery());
      IndicatorAnalysisTechnique indicatorAnalysisTechnique = new IndicatorAnalysisTechnique();
      indicatorAnalysisTechnique.setAnalyticsTechniqueId(
          indicatorAnalysisRequest.getAnalyticsTechniqueId());
      indicatorAnalysisTechnique.setAnalyticsTechniqueMapping(
          indicatorAnalysisRequest.getAnalyticsTechniqueMapping());
      indicatorAnalysisTechnique.setAnalyticsTechniqueParams(
          indicatorAnalysisRequest.getAnalyticsTechniqueParams());
      return indicatorUtilityService.getAnalyzedDataSetMethod(
          indicatorAnalysisTechnique, statements);
    } catch (Exception e) {
      throw new ServiceException("Could not analyze indicator", e);
    }
  }

  @Override
  public void validateUserRequest(
      HttpServletRequest request, List<LrsStoresStatementRequest> lrsStores) {
    User foundUser = tokenService.getUserFromToken(request);
    boolean invalidRequest = true;
    if (foundUser == null || foundUser.getLrsConsumerList() == null) {
      throw new LrsNotFoundException("Invalid LRS id and/or unique identifier provided");
    }
    for (LrsStoresStatementRequest lrsStore : lrsStores) {
      if (lrsStore == null) continue;
      for (LrsConsumer lrsConsumer : foundUser.getLrsConsumerList()) {
        if (lrsConsumer == null) continue;
        if (Objects.equals(lrsConsumer.getLrsId(), lrsStore.getLrsId())
            && Objects.equals(lrsConsumer.getUniqueIdentifier(), lrsStore.getUniqueIdentifier())) {
          log.info("Valid LRS id and unique identifier provided");
          invalidRequest = false;
          break;
        }
      }
    }
    if (invalidRequest) {
      throw new LrsNotFoundException("Invalid LRS id and/or unique identifier provided");
    }
  }

  @Override
  public OpenLAPDataSet analyzeIndicatorByIndicatorId(String indicatorId) {
    Gson gson = new Gson();
    Optional<IndicatorCache> indicatorCache = indicatorCacheRepository.findById(indicatorId);
    if (indicatorCache.isPresent()) {
      IndicatorCache cache = indicatorCache.get();
      LocalDateTime createdOn = cache.getCreatedOn();
      // Check if the indicator code is 8 hours old
      if (createdOn != null
          && Duration.between(createdOn, LocalDateTime.now()).toMinutes() < (60 * 8)) {
        return gson.fromJson(cache.getAnalyzedDataset(), OpenLAPDataSet.class);
      }
    }

    log.info("Attempting to analyze the data of a basic indicator with id '{}'...", indicatorId);
    Indicator foundIndicator = indicatorUtilityService.fetchIndicatorMethod(indicatorId);

    // Query statement
    String queryJson = foundIndicator.getIndicatorQuery();
    StatementsRequest statementsRequest = gson.fromJson(queryJson, StatementsRequest.class);
    OpenLAPDataSet statements = statementService.findStatements(statementsRequest);

    // Analytics Method
    OpenLAPDataSet analyzedDataSet;
    AnalyticsTechniqueReference analyticsTechniqueReference =
        foundIndicator.getAnalyticsTechniqueReference();
    AnalyticsTechnique analyticsTechnique = analyticsTechniqueReference.getAnalyticsTechnique();
    OpenLAPPortConfig analyticsTechniquePortMapping =
        gson.fromJson(
            analyticsTechniqueReference.getQueryToAnalyticsTechniqueMapping(),
            OpenLAPPortConfig.class);

    List<OpenLAPDynamicParam> paramList =
        gson.fromJson(
            analyticsTechniqueReference.getAdditionalParams(),
            new TypeToken<List<OpenLAPDynamicParam>>() {}.getType());

    Map<String, String> transformedParams = getTransformedParams(paramList);

    AnalyticsMethod analyticsMethod =
        analyticsTechniqueService.loadAnalyticsMethodInstance(analyticsTechnique.getId());
    try {
      analyticsMethod.initialize(statements, analyticsTechniquePortMapping, transformedParams);
      analyzedDataSet = analyticsMethod.execute();
      //      indicatorAnalysisCacheRepository.save(
      //          new IndicatorAnalysisCache(
      //              foundIndicator.getId(), gson.toJson(analyzedDataSet), LocalDateTime.now()));
    } catch (AnalyticsMethodInitializationException e) {
      throw new ServiceException("Could not initialize analytics method");
    }
    log.info("Data analysis of indicator with id '{}' completed.", indicatorId);

    return analyzedDataSet;
  }

  private static Map<String, String> getTransformedParams(List<OpenLAPDynamicParam> paramList) {
    Map<String, String> transformedParams = new HashMap<>();
    for (OpenLAPDynamicParam param : paramList) {
      Object value = param.getValue();
      String stringValue;
      if (value instanceof Double) {
        // Convert Double to Integer and then to String
        stringValue = Integer.toString(((Double) value).intValue());
      } else {
        // Directly convert to String for non-Double values
        stringValue = value.toString();
      }
      transformedParams.put(param.getId(), stringValue);
    }
    return transformedParams;
  }

  @Override
  public String previewIndicator(IndicatorBasicPreviewRequest indicatorRequest) {
    IndicatorAnalysisRequest indicatorAnalysisRequest =
        new IndicatorAnalysisRequest(
            indicatorRequest.getIndicatorQuery(),
            indicatorRequest.getAnalyticsTechniqueId(),
            indicatorRequest.getAnalyticsTechniqueMapping(),
            indicatorRequest.getAnalyticsTechniqueParams());
    OpenLAPDataSet analyzedDataSet = analyzeIndicator(indicatorAnalysisRequest);
    String indicatorCodeMethod;
    try {
      indicatorCodeMethod =
          indicatorUtilityService.getIndicatorCodeMethod(
              analyzedDataSet,
              indicatorRequest.getVisualizationLibraryId(),
              indicatorRequest.getVisualizationTypeId(),
              indicatorRequest.getVisualizationMapping(),
              indicatorRequest.getVisualizationParams(),
              true);
    } catch (Exception e) {
      throw new PreviewNotPossibleException("Could not create indicator code", e);
    }
    return indicatorCodeMethod;
  }

  @Override
  public void createBasicIndicator(
      HttpServletRequest request, IndicatorBasicRequest indicatorBasicRequest) {
    IndicatorReference indicatorReference =
        getIndicatorReferenceForBasicIndicator(indicatorBasicRequest);
    indicatorUtilityService.createIndicator(request, indicatorReference);
  }

  @Override
  public void updateBasicIndicator(
      HttpServletRequest request, IndicatorBasicRequest indicatorBasicRequest, String indicatorId) {
    IndicatorReference indicatorReference =
        getIndicatorReferenceForBasicIndicator(indicatorBasicRequest);
    indicatorUtilityService.updateIndicator(request, indicatorReference, indicatorId);
  }

  private static IndicatorReference getIndicatorReferenceForBasicIndicator(
      IndicatorBasicRequest indicatorBasicRequest) {
    IndicatorReference indicatorReference = new IndicatorReference();
    indicatorReference.setName(indicatorBasicRequest.getName());
    indicatorReference.setIndicatorType(indicatorBasicRequest.getIndicatorType());
    indicatorReference.setVisualizationLibraryId(indicatorBasicRequest.getVisualizationLibraryId());
    indicatorReference.setVisualizationTypeId(indicatorBasicRequest.getVisualizationTypeId());
    indicatorReference.setVisualizationParams(indicatorBasicRequest.getVisualizationParams());
    indicatorReference.setVisualizationMapping(indicatorBasicRequest.getVisualizationMapping());
    indicatorReference.setIndicatorQuery(indicatorBasicRequest.getIndicatorQuery());
    indicatorReference.setAnalyticsTechniqueId(indicatorBasicRequest.getAnalyticsTechniqueId());
    indicatorReference.setAnalyticsTechniqueMapping(
        indicatorBasicRequest.getAnalyticsTechniqueMapping());
    indicatorReference.setAnalyticsTechniqueParams(
        indicatorBasicRequest.getAnalyticsTechniqueParams());
    return indicatorReference;
  }
}
