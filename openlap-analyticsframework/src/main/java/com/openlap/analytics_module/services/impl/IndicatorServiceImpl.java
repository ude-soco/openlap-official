package com.openlap.analytics_module.services.impl;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.openlap.analytics_module.dto.requests.indicator.*;
import com.openlap.analytics_module.dto.response.indicator.*;
import com.openlap.analytics_module.dto.response.indicator.utility_response.AnalyticsTechniqueStatementResponse;
import com.openlap.analytics_module.entities.AnalyticsQuestion;
import com.openlap.analytics_module.entities.Indicator;
import com.openlap.analytics_module.entities.IndicatorCache;
import com.openlap.analytics_module.entities.IndicatorDrafts;
import com.openlap.analytics_module.entities.utility_entities.IndicatorType;
import com.openlap.analytics_module.entities.utility_entities.IndicatorsToMerge;
import com.openlap.analytics_module.entities.utility_entities.VisualizationTechniqueReference;
import com.openlap.analytics_module.exceptions.indicator.IndicatorManipulationNotAllowed;
import com.openlap.analytics_module.exceptions.indicator.IndicatorNotFoundException;
import com.openlap.analytics_module.exceptions.indicator.PreviewNotPossibleException;
import com.openlap.analytics_module.repositories.IndicatorAnalysisCacheRepository;
import com.openlap.analytics_module.repositories.IndicatorCacheRepository;
import com.openlap.analytics_module.repositories.IndicatorDraftsRepository;
import com.openlap.analytics_module.repositories.IndicatorRepository;
import com.openlap.analytics_module.services.*;
import com.openlap.analytics_statements.dtos.request.LrsConsumerRequest;
import com.openlap.analytics_statements.dtos.request.LrsStoresStatementRequest;
import com.openlap.analytics_statements.dtos.request.StatementsRequest;
import com.openlap.analytics_statements.services.StatementService;
import com.openlap.analytics_technique.dto.response.AnalyticsTechniqueResponse;
import com.openlap.analytics_technique.services.AnalyticsTechniqueService;
import com.openlap.configurations.Utils;
import com.openlap.dataset.OpenLAPColumnConfigData;
import com.openlap.dataset.OpenLAPColumnDataType;
import com.openlap.dataset.OpenLAPDataSet;
import com.openlap.dataset.OpenLAPPortConfig;
import com.openlap.dynamicparam.OpenLAPDynamicParam;
import com.openlap.exception.DatabaseOperationException;
import com.openlap.exception.ServiceException;
import com.openlap.user.entities.User;
import com.openlap.user.entities.utility_entities.LrsConsumer;
import com.openlap.user.services.TokenService;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import javax.servlet.http.HttpServletRequest;
import javax.transaction.Transactional;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bson.types.ObjectId;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.ui.Model;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class IndicatorServiceImpl implements IndicatorService {
  private final IndicatorRepository indicatorRepository;
  private final IndicatorDraftsRepository indicatorDraftsRepository;
  private final IndicatorCacheRepository indicatorCacheRepository;
  private final TokenService tokenService;
  private final IndicatorMultiLevelService indicatorMultiLevelService;
  private final IndicatorCompositeService indicatorCompositeService;
  private final IndicatorBasicService indicatorBasicService;
  private final IndicatorUtilityService indicatorUtilityService;
  private final QuestionService questionService;
  private final StatementService statementService;
  private final AnalyticsTechniqueService analyticsTechniqueService;
  private final IndicatorAnalysisCacheRepository indicatorAnalysisCacheRepository;

  @Override
  public Page<IndicatorResponse> getAllMyIndicators(
      HttpServletRequest request, int page, int size, String sortBy, String sortDirection) {
    User createdBy = tokenService.getUserFromToken(request);
    log.info("Looking up indicators for user '{}'", createdBy.getName());
    Sort sort =
        sortDirection.equalsIgnoreCase(Sort.Direction.ASC.name())
            ? Sort.by(sortBy).ascending()
            : Sort.by(sortBy).descending();
    Pageable pageable = PageRequest.of(page, size, sort);
    try {
      Page<Indicator> foundIndicatorPage =
          indicatorRepository.findByCreatedBy_Id(new ObjectId(createdBy.getId()), pageable);
      return new PageImpl<>(
          getIndicatorResponses(foundIndicatorPage),
          pageable,
          foundIndicatorPage.getTotalElements());
    } catch (Exception e) {
      throw new DatabaseOperationException("Could not access database to access indicators", e);
    }
  }

  @Override
  public PageImpl<IndicatorWithCodeResponse> getAllMyIndicatorsForCompositeSelection(
      HttpServletRequest request, int page, String searchTerm) {

    User createdBy = tokenService.getUserFromToken(request);
    log.info("Looking up indicators for composite selection, searchTerm={}", searchTerm);

    Pageable pageable = PageRequest.of(page, 2);
    try {
      Page<Indicator> foundIndicatorPage;
      if (searchTerm != null && !searchTerm.trim().isEmpty()) {
        foundIndicatorPage =
            indicatorRepository.findBasicIndicatorByCreatedBy_IdAndNameLike(
                new ObjectId(createdBy.getId()), searchTerm, pageable);
      } else {
        foundIndicatorPage =
            indicatorRepository.findBasicIndicatorByCreatedBy_Id(
                new ObjectId(createdBy.getId()), pageable);
      }

      return new PageImpl<>(
          getIndicatorWithCodeResponses(foundIndicatorPage, false),
          pageable,
          foundIndicatorPage.getTotalElements());
    } catch (Exception e) {
      throw new DatabaseOperationException("Could not access database to access indicators", e);
    }
  }

  @Override
  public IndicatorFullDetailResponse getIndicatorById(String indicatorId) {
    Indicator foundIndicator = indicatorUtilityService.fetchIndicatorMethod(indicatorId);
    return generateIndicatorFullDetailResponse(foundIndicator);
  }

  @Override
  public List<IndicatorWithCodeResponse> getIndicatorDetailResponseList(
      List<Indicator> indicators) {
    if (indicators.isEmpty()) {
      log.warn("Indicator list is empty");
      return new ArrayList<>();
    }
    try {
      List<IndicatorWithCodeResponse> indicatorResponses = new ArrayList<>();
      for (Indicator indicator : indicators) {
        indicatorResponses.add(
            new IndicatorWithCodeResponse(
                indicator.getId(),
                indicator.getIndicatorType(),
                indicator.getCreatedBy().getName(),
                indicator.getName(),
                indicator.getCreatedOn(),
                indicator.getAnalyticsTechniqueReference().getAnalyticsTechnique(),
                generateIndicatorCode(indicator.getId(), false)));
      }
      return indicatorResponses;
    } catch (IndicatorNotFoundException e) {
      throw e;
    } catch (Exception e) {
      throw new DatabaseOperationException(
          "Error accessing database to create an analytics question", e);
    }
  }

  private IndicatorFullDetailResponse generateIndicatorFullDetailResponse(
      Indicator foundIndicator) {
    Gson gson = new Gson();
    IndicatorType indicatorType = foundIndicator.getIndicatorType();
    IndicatorFullDetailResponse indicatorFullDetailResponse = new IndicatorFullDetailResponse();
    indicatorFullDetailResponse.setId(foundIndicator.getId());
    indicatorFullDetailResponse.setName(foundIndicator.getName());
    indicatorFullDetailResponse.setType(indicatorType);
    indicatorFullDetailResponse.setCreatedBy(foundIndicator.getCreatedBy().getName());
    indicatorFullDetailResponse.setIndicatorCode(
        generateIndicatorCode(foundIndicator.getId(), true));
    //    indicatorFullDetailResponse.setPlatforms(foundIndicator.getPlatforms());
    indicatorFullDetailResponse.setConfiguration(foundIndicator.getConfigurationRequest());

    // Visualization
    indicatorFullDetailResponse.setVisualizationLibrary(
        foundIndicator.getVisualizationTechniqueReference().getVisLibrary().getName());
    indicatorFullDetailResponse.setVisualizationType(
        foundIndicator.getVisualizationTechniqueReference().getVisType().getName());
    indicatorFullDetailResponse.setCreatedOn(foundIndicator.getCreatedOn());
    indicatorFullDetailResponse.setVisualizationParams(
        gson.fromJson(
            foundIndicator.getVisualizationTechniqueReference().getAdditionalParams(),
            Object.class));
    indicatorFullDetailResponse.setVisualizationMapping(
        gson.fromJson(
            foundIndicator
                .getVisualizationTechniqueReference()
                .getAnalyticsTechniqueToVisualizationMapping(),
            OpenLAPPortConfig.class));

    if (indicatorType == IndicatorType.BASIC) {
      StatementsRequest statementsRequest =
          gson.fromJson(foundIndicator.getIndicatorQuery(), StatementsRequest.class);
      AnalyticsTechniqueStatementResponse statementResponse =
          new AnalyticsTechniqueStatementResponse();

      // Statement: Platforms
      //      statementResponse.setPlatforms(statementsRequest.getPlatforms());

      // Statement: Activity Types
      List<String> activityTypes = new ArrayList<>();
      for (String activityType : statementsRequest.getActivityTypes()) {
        String[] activityTypeSplit = activityType.split("\\/");
        activityTypes.add(
            Utils.capitalizeFirstLetter(activityTypeSplit[activityTypeSplit.length - 1]));
      }
      statementResponse.setActivityTypes(activityTypes);

      // Statement: Action on Activities
      List<String> actionOnActivities = new ArrayList<>();
      for (String actionOnActivity : statementsRequest.getActionOnActivities()) {
        String[] actionOnActivitySplit = actionOnActivity.split("\\/");
        actionOnActivities.add(
            Utils.capitalizeFirstLetter(actionOnActivitySplit[actionOnActivitySplit.length - 1]));
      }
      statementResponse.setActionOnActivities(actionOnActivities);

      // Statement: Activities
      List<String> activities = new ArrayList<>();
      for (Map.Entry<String, ArrayList<String>> entry :
          statementsRequest.getActivities().entrySet()) {
        activities.addAll(entry.getValue());
      }
      statementResponse.setActivities(activities);

      // Statement: Duration
      statementResponse.setDurationFrom(statementsRequest.getDuration().getFrom());
      statementResponse.setDurationUntil(statementsRequest.getDuration().getUntil());

      indicatorFullDetailResponse.setStatementResponse(statementResponse);
    }

    // Analytics Technique
    if (indicatorType == IndicatorType.BASIC || indicatorType == IndicatorType.MULTI_LEVEL) {
      indicatorFullDetailResponse.setAnalyticsTechnique(
          foundIndicator.getAnalyticsTechniqueReference().getAnalyticsTechnique().getName());
      indicatorFullDetailResponse.setAnalyticsTechniqueParams(
          gson.fromJson(
              foundIndicator.getAnalyticsTechniqueReference().getAdditionalParams(),
              new TypeToken<List<OpenLAPDynamicParam>>() {}.getType()));
      indicatorFullDetailResponse.setAnalyticsTechniqueMapping(
          gson.fromJson(
              foundIndicator.getAnalyticsTechniqueReference().getQueryToAnalyticsTechniqueMapping(),
              OpenLAPPortConfig.class));
    }

    if (indicatorType == IndicatorType.COMPOSITE) {
      indicatorFullDetailResponse.setColumnToMerge(
          gson.fromJson(foundIndicator.getColumnToMerge(), OpenLAPColumnConfigData.class));
    }

    if (indicatorType == IndicatorType.COMPOSITE || indicatorType == IndicatorType.MULTI_LEVEL) {
      List<String> indicatorList = new ArrayList<>();
      for (IndicatorsToMerge indicator : foundIndicator.getIndicators()) {
        indicatorList.add(indicator.getIndicator().getName());
      }
      indicatorFullDetailResponse.setIndicators(indicatorList);
    }
    return indicatorFullDetailResponse;
  }

  @Override
  public String requestInteractiveIndicatorCode(String indicatorId, HttpServletRequest request) {
    Indicator foundIndicator = indicatorUtilityService.fetchIndicatorMethod(indicatorId);
    String baseUrl = String.format("%s://%s", request.getScheme(), request.getServerName());
    String apiUrl = "/api/v1/code/indicators?indicatorId=";
    String metaDataUrl = "' frameborder='0' height='500px' width='500px'";

    return "<iframe src='" + baseUrl + apiUrl + foundIndicator.getId() + metaDataUrl + " />";
  }

  @Override
  public void copyMyExistingIndicator(HttpServletRequest request, String indicatorId) {
    Indicator foundIndicator = indicatorUtilityService.fetchIndicatorMethod(indicatorId);
    Indicator indicator = new Indicator();
    User createdBy = tokenService.getUserFromToken(request);
    String indicatorName =
        indicatorUtilityService.fetchUserIndicatorForCopyMethod(
            createdBy.getId(), foundIndicator.getName());
    indicator.setName(indicatorName);
    indicator.setIndicatorType(foundIndicator.getIndicatorType());
    indicator.setCreatedBy(createdBy);
    indicator.setVisualizationTechniqueReference(
        foundIndicator.getVisualizationTechniqueReference());
    indicator.setCreatedOn(LocalDateTime.now());
    indicator.setTimesExecuted(0);
    indicator.setIndicatorQuery(foundIndicator.getIndicatorQuery());
    indicator.setConfigurationRequest(foundIndicator.getConfigurationRequest());
    try {
      switch (foundIndicator.getIndicatorType()) {
        case BASIC:
          indicator.setIndicatorQuery(foundIndicator.getIndicatorQuery());
          indicator.setAnalyticsTechniqueReference(foundIndicator.getAnalyticsTechniqueReference());
          break;
        case COMPOSITE:
        case MULTI_LEVEL:
          indicator.setColumnToMerge(foundIndicator.getColumnToMerge());
          indicator.setIndicators(foundIndicator.getIndicators());
          if (foundIndicator.getIndicatorType() == IndicatorType.MULTI_LEVEL) {
            indicator.setAnalyticsTechniqueReference(
                foundIndicator.getAnalyticsTechniqueReference());
          }
          break;
        default:
          throw new ServiceException(
              "Unknown Indicator Type: " + foundIndicator.getIndicatorType());
      }
      indicatorRepository.save(indicator);
      log.info("Copied a new indicator with name '{}'", indicator.getName());
    } catch (Exception e) {
      throw new DatabaseOperationException("Could not access database to copy indicator", e);
    }
  }

  @Override
  public void deleteExistingIndicator(HttpServletRequest request, String indicatorId) {
    log.info("Attempting to delete an indicator.");
    Indicator foundIndicator = indicatorUtilityService.fetchIndicatorMethod(indicatorId);
    User userFromToken = tokenService.getUserFromToken(request);
    try {
      if (!foundIndicator.getCreatedBy().getId().equals(userFromToken.getId())) {
        throw new IndicatorManipulationNotAllowed(
            "You do not have the permission to delete the indicator");
      }
      indicatorRepository.delete(foundIndicator);

      indicatorCacheRepository
          .findById(foundIndicator.getId())
          .ifPresent(indicatorCacheRepository::delete);

      indicatorAnalysisCacheRepository
          .findById(foundIndicator.getId())
          .ifPresent(indicatorAnalysisCacheRepository::delete);
      log.info("Successfully deleted an indicator");
    } catch (IndicatorManipulationNotAllowed e) {
      throw e;
    } catch (Exception e) {
      throw new DatabaseOperationException("Could not access database to delete the indicator", e);
    }
  }

  @Override
  public String getInteractiveIndicatorTemplate(String indicatorId, Model model) {
    Indicator foundIndicator = indicatorUtilityService.fetchIndicatorMethod(indicatorId);
    String indicatorCode = generateIndicatorCode(foundIndicator.getId(), false);
    model.addAttribute("indicatorCode", Utils.decodeURIComponent(indicatorCode));
    model.addAttribute("indicatorName", foundIndicator.getName());
    return "indicator";
  }

  @Override
  public String getInteractiveQuestionCode(String questionId, Model model) {
    AnalyticsQuestion analyticsQuestion = questionService.fetchQuestionMethod(questionId);
    StringBuilder stringBuilder = new StringBuilder();
    List<Indicator> indicators = analyticsQuestion.getIndicators();
    for (int i = 0; i < indicators.size(); i++) {
      int count = i + 1;
      Indicator indicator = indicators.get(i);
      if (count % 2 == 1)
        stringBuilder.append("<div class=\"row justify-content-sm-center padTopBottom\">");
      stringBuilder.append(
          "<div class=\"col col-lg-6\" align=\"center\">\n"
              + "\t\t\t\t<div class=\"row justify-content-sm-center padTopBottom\">\n"
              + "\t\t\t\t\t<div class=\"col col-lg-6\" align=\"center\">\n"
              + "\t\t\t\t\t\t<h6>"
              + indicator.getName()
              + "</h6>\n"
              + "\t\t\t\t\t</div>\n"
              + "\t\t\t\t</div>\n"
              + "\t\t\t\t<div class=\"row padTopBottom\" align=\"center\">");
      stringBuilder.append(generateIndicatorCode(indicator.getId(), false));
      stringBuilder.append("\t\t\t\t</div>\n" + "\t\t\t</div>");
      if (indicators.size() == 1 || count % 2 == 0) {
        stringBuilder.append("</div>");
      }
      if (indicators.size() == count) {
        stringBuilder.append("</div>");
      }
    }
    model.addAttribute("questionName", analyticsQuestion.getName());
    model.addAttribute("questionCode", stringBuilder);

    return "question";
  }

  @Override
  public Page<IndicatorResponse> getAllIndicators(
      int page, int size, String sortBy, String sortDirection) {
    log.info("Looking up for indicators");
    Sort sort =
        sortDirection.equalsIgnoreCase(Sort.Direction.ASC.name())
            ? Sort.by(sortBy).ascending()
            : Sort.by(sortBy).descending();
    Pageable pageable = PageRequest.of(page, size, sort);
    Page<Indicator> foundIndicatorPage = indicatorRepository.findAll(pageable);
    return new PageImpl<>(
        getIndicatorResponses(foundIndicatorPage), pageable, foundIndicatorPage.getTotalElements());
  }

  @Override
  public PageImpl<CompatibleIndicatorsCompositeResponse> findCompatibleIndicators(
      HttpServletRequest request, String indicatorId, int page) {
    Pageable pageable = PageRequest.of(page, 2);
    Page<Indicator> compatibleIndicators =
        indicatorUtilityService.fetchAllCompatibleIndicatorsByUserIdAndAnalyticsTechniqueIdMethod(
            request, indicatorId, page);

    AnalyticsTechniqueResponse analyticsTechnique =
        indicatorUtilityService.fetchAnalyticsTechniqueByIndicatorIdMethod(indicatorId);

    List<OpenLAPColumnConfigData> techniqueOutputs = new ArrayList<>();
    for (OpenLAPColumnConfigData output :
        analyticsTechniqueService.getAnalyticsTechniqueOutputs(analyticsTechnique.getId())) {
      if (output.getType().equals(OpenLAPColumnDataType.Text)) {
        techniqueOutputs.add(output);
      }
    }

    List<CompatibleIndicatorsCompositeResponse> compatibleIndicatorsCompositeResponseList =
        new ArrayList<>();
    compatibleIndicatorsCompositeResponseList.add(
        new CompatibleIndicatorsCompositeResponse(
            getIndicatorWithCodeResponses(compatibleIndicators, true),
            analyticsTechnique,
            techniqueOutputs));
    return new PageImpl<>(
        compatibleIndicatorsCompositeResponseList,
        pageable,
        compatibleIndicators.getTotalElements());
  }

  private List<IndicatorResponse> getIndicatorResponses(Page<Indicator> foundIndicatorPage) {
    List<IndicatorResponse> indicatorResponse = new ArrayList<>();
    for (Indicator indicator : foundIndicatorPage.getContent()) {
      indicatorResponse.add(
          new IndicatorResponse(
              indicator.getId(),
              indicator.getIndicatorType(),
              indicator.getCreatedBy().getName(),
              indicator.getName(),
              indicator.getCreatedOn()));
    }
    return indicatorResponse;
  }

  private List<IndicatorWithCodeResponse> getIndicatorWithCodeResponses(
      Page<Indicator> foundIndicatorPage, Boolean code) {
    List<IndicatorWithCodeResponse> indicatorWithCodeResponses = new ArrayList<>();
    for (Indicator indicator : foundIndicatorPage.getContent()) {
      indicatorWithCodeResponses.add(
          new IndicatorWithCodeResponse(
              indicator.getId(),
              indicator.getIndicatorType(),
              indicator.getCreatedBy().getName(),
              indicator.getName(),
              indicator.getCreatedOn(),
              indicator.getAnalyticsTechniqueReference().getAnalyticsTechnique(),
              generateIndicatorCode(indicator.getId(), true)));
    }
    return indicatorWithCodeResponses;
  }

  @Override
  public String generateIndicatorCode(String indicatorId, Boolean uriCode) {
    // ! TODO: Cache is causing the problem of showing an updated indicator.
    Indicator foundIndicator = indicatorUtilityService.fetchIndicatorMethod(indicatorId);
    Optional<IndicatorCache> indicatorCache = indicatorCacheRepository.findById(indicatorId);
    LocalDateTime indicatorCreatedOn = foundIndicator.getCreatedOn();
    // * This is checking, whether the indicator has been updated in the meantime. If yes, then the
    // cache will be overwritten.
    if (indicatorCache.isPresent()
        && indicatorCreatedOn.isEqual(indicatorCache.get().getIndicatorCreatedOn())) {
      IndicatorCache cache = indicatorCache.get();
      LocalDateTime generatedOn = cache.getGeneratedOn();

      // Check if the indicator code is 8 hours old
      if (generatedOn != null
          && Duration.between(generatedOn, LocalDateTime.now()).toMinutes() < (60 * 8)) {
        return cache.getIndicatorCode();
      }
    }
    Gson gson = new Gson();
    OpenLAPDataSet analyzedDataSet = null;
    if (foundIndicator.getIndicatorType() == IndicatorType.BASIC) {
      analyzedDataSet = indicatorBasicService.analyzeIndicatorByIndicatorId(indicatorId);
    }
    if (foundIndicator.getIndicatorType() == IndicatorType.COMPOSITE
        || foundIndicator.getIndicatorType() == IndicatorType.MULTI_LEVEL) {
      List<IndicatorsToMerge> indicatorsToCombine = foundIndicator.getIndicators();

      if (foundIndicator.getIndicatorType() == IndicatorType.COMPOSITE) {
        analyzedDataSet = getAnalyzedDataForCompositeIndicator(indicatorsToCombine, foundIndicator);
      }

      if (foundIndicator.getIndicatorType() == IndicatorType.MULTI_LEVEL) {
        analyzedDataSet =
            getAnalyzedDataSetForMultiLevelIndicator(indicatorsToCombine, foundIndicator);
      }
    }

    VisualizationTechniqueReference visualizationTechniqueReference =
        foundIndicator.getVisualizationTechniqueReference();
    OpenLAPPortConfig mappingPort =
        gson.fromJson(
            visualizationTechniqueReference.getAnalyticsTechniqueToVisualizationMapping(),
            OpenLAPPortConfig.class);
    Object mappingParams =
        gson.fromJson(visualizationTechniqueReference.getAdditionalParams(), Object.class);
    String indicatorCode =
        indicatorUtilityService.getIndicatorCodeMethod(
            analyzedDataSet,
            visualizationTechniqueReference.getVisLibrary().getId(),
            visualizationTechniqueReference.getVisType().getId(),
            mappingPort,
            mappingParams,
            uriCode);

    indicatorCacheRepository.save(
        new IndicatorCache(
            indicatorId,
            indicatorCode,
            gson.toJson(analyzedDataSet),
            indicatorCreatedOn,
            LocalDateTime.now()));
    return indicatorCode;
  }

  @Override
  public String validatePreviewBeforeDuplicationBasicIndicator(
      HttpServletRequest request, String indicatorId) {
    User foundUser = tokenService.getUserFromToken(request);
    Gson gson = new Gson();
    Indicator foundIndicator = indicatorUtilityService.fetchIndicatorMethod(indicatorId);
    String indicatorQuery = foundIndicator.getIndicatorQuery();
    String foundAnalyticsTechniqueId = null;
    OpenLAPPortConfig foundAnalyticsTechniqueMapping = null;
    List<OpenLAPDynamicParam> foundAnalyticsTechniqueParams = null;
    if (foundIndicator.getAnalyticsTechniqueReference() != null) {
      foundAnalyticsTechniqueId =
          foundIndicator.getAnalyticsTechniqueReference().getAnalyticsTechnique().getId();
      foundAnalyticsTechniqueMapping =
          gson.fromJson(
              foundIndicator.getAnalyticsTechniqueReference().getQueryToAnalyticsTechniqueMapping(),
              OpenLAPPortConfig.class);
      foundAnalyticsTechniqueParams =
          gson.fromJson(
              foundIndicator.getAnalyticsTechniqueReference().getAdditionalParams(),
              new TypeToken<List<OpenLAPDynamicParam>>() {}.getType());
    }
    IndicatorType foundIndicatorIndicatorType = foundIndicator.getIndicatorType();
    if (foundIndicatorIndicatorType == IndicatorType.BASIC) {
      StatementsRequest foundStatementRequest =
          gson.fromJson(indicatorQuery, StatementsRequest.class);
      StatementsRequest statementsRequest =
          new StatementsRequest(
              validateUserLrsStoresWithIndicatorLrsStores(
                  foundUser, gson.fromJson(indicatorQuery, StatementsRequest.class).getLrsStores()),
              foundStatementRequest.getActivityTypes(),
              foundStatementRequest.getActionOnActivities(),
              foundStatementRequest.getActivities(),
              foundStatementRequest.getDuration(),
              foundStatementRequest.getOutputs(),
              foundStatementRequest.getUserQueryCondition());
      IndicatorBasicPreviewRequest indicatorBasicPreviewRequest =
          new IndicatorBasicPreviewRequest(
              foundIndicator.getVisualizationTechniqueReference().getVisLibrary().getId(),
              foundIndicator.getVisualizationTechniqueReference().getVisType().getId(),
              gson.fromJson(
                  foundIndicator.getVisualizationTechniqueReference().getAdditionalParams(),
                  Object.class),
              gson.fromJson(
                  foundIndicator
                      .getVisualizationTechniqueReference()
                      .getAnalyticsTechniqueToVisualizationMapping(),
                  OpenLAPPortConfig.class),
              statementsRequest,
              foundAnalyticsTechniqueId,
              foundAnalyticsTechniqueMapping,
              foundAnalyticsTechniqueParams);

      return indicatorBasicService.previewIndicator(indicatorBasicPreviewRequest);
    }

    if (foundIndicatorIndicatorType == IndicatorType.COMPOSITE
        || foundIndicatorIndicatorType == IndicatorType.MULTI_LEVEL) {
      Object visualizationParams =
          gson.fromJson(
              foundIndicator.getVisualizationTechniqueReference().getAdditionalParams(),
              Object.class);
      OpenLAPPortConfig visualizationMapping =
          gson.fromJson(
              foundIndicator
                  .getVisualizationTechniqueReference()
                  .getAnalyticsTechniqueToVisualizationMapping(),
              OpenLAPPortConfig.class);

      List<IndicatorsToMergeRequest> indicatorsToMergeRequests = new ArrayList<>();
      for (IndicatorsToMerge indicatorsToMerge : foundIndicator.getIndicators()) {
        List<LrsStoresStatementRequest> lrsStoresStatementRequests =
            validateUserLrsStoresWithIndicatorLrsStores(
                foundUser,
                gson.fromJson(
                        indicatorsToMerge.getIndicator().getIndicatorQuery(),
                        StatementsRequest.class)
                    .getLrsStores());
        if (lrsStoresStatementRequests.isEmpty()) {
          throw new PreviewNotPossibleException(
              "Duplication not possible. User do not belong to the same LRS of the basic indicator");
        }

        OpenLAPColumnConfigData columnToMerge =
            gson.fromJson(indicatorsToMerge.getColumnToMerge(), OpenLAPColumnConfigData.class);
        indicatorsToMergeRequests.add(
            new IndicatorsToMergeRequest(indicatorsToMerge.getIndicator().getId(), columnToMerge));
      }

      if (foundIndicatorIndicatorType == IndicatorType.COMPOSITE) {
        OpenLAPColumnConfigData columnToMerge =
            gson.fromJson(foundIndicator.getColumnToMerge(), OpenLAPColumnConfigData.class);
        return indicatorCompositeService.previewIndicatorComposite(
            new IndicatorCompositePreviewRequest(
                foundIndicator.getVisualizationTechniqueReference().getVisLibrary().getId(),
                foundIndicator.getVisualizationTechniqueReference().getVisType().getId(),
                visualizationParams,
                visualizationMapping,
                columnToMerge,
                indicatorsToMergeRequests));
      }
      return indicatorMultiLevelService.previewBasicIndicatorsForMultiLevelIndicator(
          new IndicatorMultiLevelPreviewRequest(
              indicatorsToMergeRequests,
              foundAnalyticsTechniqueId,
              foundAnalyticsTechniqueMapping,
              foundAnalyticsTechniqueParams,
              foundIndicator.getVisualizationTechniqueReference().getVisLibrary().getId(),
              foundIndicator.getVisualizationTechniqueReference().getVisType().getId(),
              visualizationParams,
              visualizationMapping));
    }
    return null;
  }

  @Override
  public void duplicateIndicator(HttpServletRequest request, String indicatorId) {
    Gson gson = new Gson();
    User foundUser = tokenService.getUserFromToken(request);
    Indicator foundIndicator = indicatorUtilityService.fetchIndicatorMethod(indicatorId);
    String statementRequestStringify = "";
    List<IndicatorsToMerge> indicatorsToMergeList = new ArrayList<>();
    if (foundIndicator.getIndicatorType() == IndicatorType.BASIC) {
      statementRequestStringify = getStatementRequestStringify(foundIndicator, foundUser);
    } else {
      List<Indicator> indicatorList = new ArrayList<>();
      for (IndicatorsToMerge indicatorsToMerge : foundIndicator.getIndicators()) {
        Indicator indicator = indicatorsToMerge.getIndicator();
        String tempStatementRequestStringify = getStatementRequestStringify(indicator, foundUser);
        String columnToMergeStringify = gson.toJson(indicator.getColumnToMerge());
        // TODO: Validate if the indicator exists by user id
        Indicator newIndicator =
            new Indicator(
                null,
                indicatorUtilityService.fetchUserIndicatorForCopyMethod(
                    foundUser.getId(), indicator.getName()),
                indicator.getIndicatorType(),
                foundUser,
                indicator.getVisualizationTechniqueReference(),
                LocalDateTime.now(),
                0,
                indicator.getGoalRef(),
                indicator.getConfigurationRequest(),
                tempStatementRequestStringify.isEmpty() ? null : tempStatementRequestStringify,
                indicator.getAnalyticsTechniqueReference(),
                columnToMergeStringify,
                indicator.getIndicators());
        indicatorList.add(newIndicator);
        indicatorsToMergeList.add(
            new IndicatorsToMerge(newIndicator, indicatorsToMerge.getColumnToMerge()));
      }
      // Saving the basic indicators required to create the composite & multi-level indicator
      indicatorRepository.saveAll(indicatorList);
    }

    // Saving the indicator
    Indicator indicator =
        new Indicator(
            null,
            indicatorUtilityService.fetchUserIndicatorForCopyMethod(
                foundUser.getId(), foundIndicator.getName()),
            foundIndicator.getIndicatorType(),
            foundUser,
            foundIndicator.getVisualizationTechniqueReference(),
            LocalDateTime.now(),
            0,
            foundIndicator.getGoalRef(),
            foundIndicator.getConfigurationRequest(),
            statementRequestStringify.isEmpty() ? null : statementRequestStringify,
            foundIndicator.getAnalyticsTechniqueReference(),
            foundIndicator.getColumnToMerge(),
            indicatorsToMergeList.isEmpty() ? null : indicatorsToMergeList);
    indicatorRepository.save(indicator);
  }

  @Override
  public void saveIndicatorDraft(
      HttpServletRequest request, IndicatorDraftRequest indicatorDraftRequest) {
    User createdBy = tokenService.getUserFromToken(request);
    indicatorDraftsRepository.save(
        new IndicatorDrafts(
            null,
            indicatorDraftRequest.getSession(),
            indicatorDraftRequest.getIndicatorType(),
            createdBy,
            LocalDateTime.now(),
            indicatorDraftRequest.getRoute()));
  }

  @Override
  public IndicatorsAnalyzedResponse getAnalyzedIndicators(
      IndicatorsToAnalyzeRequest indicatorList) {
    List<IndicatorsAnalyzed> indicatorsAnalyzedList = new ArrayList<>();
    for (IndicatorToAnalyze indicatorId : indicatorList.getIndicators()) {
      Indicator foundIndicator =
          indicatorUtilityService.fetchIndicatorMethod(indicatorId.getIndicatorId());
      indicatorsAnalyzedList.add(
          new IndicatorsAnalyzed(
              foundIndicator.getId(),
              foundIndicator.getName(),
              indicatorBasicService.analyzeIndicatorByIndicatorId(foundIndicator.getId())));
    }
    AnalyticsTechniqueResponse analyticsTechnique =
        indicatorUtilityService.fetchAnalyticsTechniqueByIndicatorIdMethod(
            indicatorList.getIndicators().get(0).getIndicatorId());

    List<OpenLAPColumnConfigData> techniqueOutputs = new ArrayList<>();
    for (OpenLAPColumnConfigData output :
        analyticsTechniqueService.getAnalyticsTechniqueOutputs(analyticsTechnique.getId())) {
      if (output.getType().equals(OpenLAPColumnDataType.Text)) {
        techniqueOutputs.add(output);
      }
    }

    return new IndicatorsAnalyzedResponse(indicatorsAnalyzedList, techniqueOutputs);
  }

  private String getStatementRequestStringify(Indicator foundIndicator, User foundUser) {
    Gson gson = new Gson();
    String statementRequestStringify;
    String indicatorQuery = foundIndicator.getIndicatorQuery();
    StatementsRequest foundStatementRequest =
        gson.fromJson(indicatorQuery, StatementsRequest.class);
    StatementsRequest statementsRequest =
        new StatementsRequest(
            validateUserLrsStoresWithIndicatorLrsStores(
                foundUser, gson.fromJson(indicatorQuery, StatementsRequest.class).getLrsStores()),
            foundStatementRequest.getActivityTypes(),
            foundStatementRequest.getActionOnActivities(),
            foundStatementRequest.getActivities(),
            foundStatementRequest.getDuration(),
            foundStatementRequest.getOutputs(),
            foundStatementRequest.getUserQueryCondition());
    statementRequestStringify = gson.toJson(statementsRequest);
    return statementRequestStringify;
  }

  private List<LrsStoresStatementRequest> validateUserLrsStoresWithIndicatorLrsStores(
      User foundUser, List<LrsStoresStatementRequest> lrsStores) {
    List<LrsStoresStatementRequest> userLrsStores = new ArrayList<>();
    for (LrsStoresStatementRequest lrsStore : lrsStores) {
      if (lrsStore == null) continue;
      for (LrsConsumer lrsConsumer : foundUser.getLrsConsumerList()) {
        if (lrsConsumer == null) continue;
        if (Objects.equals(lrsConsumer.getLrsId(), lrsStore.getLrsId())) {
          Boolean validateLrsUser =
              statementService.validateLrsUser(
                  new LrsConsumerRequest(lrsStore.getLrsId(), lrsConsumer.getUniqueIdentifier()));
          if (validateLrsUser) {
            userLrsStores.add(
                new LrsStoresStatementRequest(
                    lrsStore.getLrsId(), lrsConsumer.getUniqueIdentifier()));
          }
        }
      }
    }
    if (userLrsStores.isEmpty()) {
      throw new PreviewNotPossibleException(
          "Duplication not possible. User do not belong to the same LRS");
    }
    return userLrsStores;
  }

  private OpenLAPDataSet getAnalyzedDataForCompositeIndicator(
      List<IndicatorsToMerge> indicatorsToCombine, Indicator compositeIndicator) {
    Gson gson = new Gson();
    log.info("Analyzing data for composite indicator");
    List<IndicatorsToMergeRequest> indicatorsList = new ArrayList<>();
    for (IndicatorsToMerge entry : indicatorsToCombine) {
      IndicatorsToMergeRequest indicatorsToMergeRequest = new IndicatorsToMergeRequest();
      indicatorsToMergeRequest.setIndicatorId(entry.getIndicator().getId());
      if (entry.getColumnToMerge() != null) {
        indicatorsToMergeRequest.setColumnToMerge(
            gson.fromJson(entry.getColumnToMerge(), OpenLAPColumnConfigData.class));
      }
      indicatorsList.add(indicatorsToMergeRequest);
    }
    OpenLAPColumnConfigData columnToMerge =
        gson.fromJson(compositeIndicator.getColumnToMerge(), OpenLAPColumnConfigData.class);
    IndicatorCompositeMergeRequest indicatorCompositeMergeRequest =
        new IndicatorCompositeMergeRequest(columnToMerge, indicatorsList);
    return indicatorCompositeService.mergeIndicatorsForCompositeIndicator(
        indicatorCompositeMergeRequest);
  }

  private OpenLAPDataSet getAnalyzedDataSetForMultiLevelIndicator(
      List<IndicatorsToMerge> indicatorsToCombine, Indicator multiLevelIndicator) {
    Gson gson = new Gson();
    log.info("Analyzing data for multi-level analysis indicator");
    List<IndicatorsToMergeRequest> indicatorsList = new ArrayList<>();
    for (IndicatorsToMerge entry : indicatorsToCombine) {
      indicatorsList.add(
          new IndicatorsToMergeRequest(
              entry.getIndicator().getId(),
              gson.fromJson(entry.getColumnToMerge(), OpenLAPColumnConfigData.class)));
    }

    List<OpenLAPDynamicParam> paramList =
        gson.fromJson(
            multiLevelIndicator.getAnalyticsTechniqueReference().getAdditionalParams(),
            new TypeToken<List<OpenLAPDynamicParam>>() {}.getType());

    IndicatorMultiLevelAnalysisRequest analyzeIndicators =
        new IndicatorMultiLevelAnalysisRequest(
            indicatorsList,
            multiLevelIndicator.getAnalyticsTechniqueReference().getAnalyticsTechnique().getId(),
            gson.fromJson(
                multiLevelIndicator
                    .getAnalyticsTechniqueReference()
                    .getQueryToAnalyticsTechniqueMapping(),
                OpenLAPPortConfig.class),
            paramList);

    return indicatorMultiLevelService.analyzeBasicIndicatorsForMultiLevelIndicator(
        analyzeIndicators);
  }
}
