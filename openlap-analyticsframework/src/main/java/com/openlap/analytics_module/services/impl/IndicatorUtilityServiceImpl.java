package com.openlap.analytics_module.services.impl;

import com.google.gson.Gson;
import com.openlap.analytics_module.dto.requests.indicator.IndicatorsToMergeRequest;
import com.openlap.analytics_module.entities.Indicator;
import com.openlap.analytics_module.entities.utility_entities.*;
import com.openlap.analytics_module.exceptions.indicator.IndicatorManipulationNotAllowed;
import com.openlap.analytics_module.exceptions.indicator.IndicatorNotFoundException;
import com.openlap.analytics_module.repositories.IndicatorRepository;
import com.openlap.analytics_module.services.IndicatorUtilityService;
import com.openlap.analytics_statements.dtos.request.StatementsRequest;
import com.openlap.analytics_technique.dto.response.AnalyticsTechniqueResponse;
import com.openlap.analytics_technique.entities.AnalyticsTechnique;
import com.openlap.analytics_technique.services.AnalyticsTechniqueService;
import com.openlap.configurations.Utils;
import com.openlap.dataset.OpenLAPColumnConfigData;
import com.openlap.dataset.OpenLAPDataSet;
import com.openlap.dataset.OpenLAPDataSetConfigValidationResult;
import com.openlap.dataset.OpenLAPPortConfig;
import com.openlap.dynamicparam.OpenLAPDynamicParam;
import com.openlap.exception.DatabaseOperationException;
import com.openlap.exception.ServiceException;
import com.openlap.exceptions.AnalyticsMethodInitializationException;
import com.openlap.template.AnalyticsMethod;
import com.openlap.template.VisualizationCodeGenerator;
import com.openlap.user.dto.request.TokenRequest;
import com.openlap.user.entities.User;
import com.openlap.user.services.TokenService;
import com.openlap.user.services.UserService;
import com.openlap.visualization_methods.entities.VisLibrary;
import com.openlap.visualization_methods.entities.VisType;
import com.openlap.visualization_methods.services.VisualizationMethodUtilityService;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Pattern;
import javax.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bson.types.ObjectId;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class IndicatorUtilityServiceImpl implements IndicatorUtilityService {
  private final TokenService tokenService;
  private final UserService userService;
  private final VisualizationMethodUtilityService visualizationMethodUtilityService;
  private final AnalyticsTechniqueService analyticsTechniqueService;
  private final IndicatorRepository indicatorRepository;

  @Override
  public Indicator fetchIndicatorMethod(String indicatorId) {
    try {
      Optional<Indicator> foundIndicator = indicatorRepository.findById(indicatorId);
      if (foundIndicator.isEmpty()) {
        throw new IndicatorNotFoundException("Indicator with id '" + indicatorId + "' not found");
      }
      return foundIndicator.get();
    } catch (IndicatorNotFoundException e) {
      throw e;
    } catch (Exception e) {
      throw new DatabaseOperationException(
          "Could not access database to find the indicator with id '" + indicatorId + "'", e);
    }
  }

  @Override
  public String fetchUserIndicatorForCopyMethod(String userId, String indicatorName) {
    String copyPrefix = Pattern.quote(indicatorName + " (Copy");
    String regex = "^" + copyPrefix + ".*";
    try {
      List<Indicator> existingCopies =
          indicatorRepository.findByCreatedByAndNameStartingWith(new ObjectId(userId), regex);
      if (!existingCopies.isEmpty()) {
        log.info("Found existing indicator copies for the user");
        int maxCopyNumber =
            existingCopies.stream()
                .map(Indicator::getName)
                .map(
                    name -> {
                      String[] parts = name.split("\\(Copy ");
                      if (parts.length > 1) {
                        String copyNumberPart = parts[1].replaceAll("\\)", "").trim();
                        try {
                          return Integer.parseInt(copyNumberPart);
                        } catch (NumberFormatException e) {
                          return 0; // If parsing fails, treat it as 0
                        }
                      }
                      return 0;
                    })
                .max(Integer::compare)
                .orElse(0);
        return indicatorName + " (Copy " + (maxCopyNumber + 1) + ")";
      } else {
        log.info(
            "Existing indicator copies for the user '{}' not found. Creating a new indicator name.",
            userId);
        return indicatorName + " (Copy)";
      }
    } catch (IndicatorNotFoundException e) {
      throw e;
    } catch (Exception e) {
      throw new DatabaseOperationException("Could not access database to access the indicator", e);
    }
  }

  @Override
  public void createIndicator(HttpServletRequest request, IndicatorReference indicatorReference) {
    log.info("Attempting to create a new indicator.");
    Indicator indicator = new Indicator();
    prepareIndicator(request, indicatorReference, indicator);
    try {
      indicatorRepository.save(indicator);
      log.info("Successfully created an indicator");
    } catch (Exception e) {
      throw new DatabaseOperationException("Could not access database to update the indicator", e);
    }
  }

  @Override
  public void updateIndicator(
      HttpServletRequest request, IndicatorReference indicatorReference, String indicatorId) {
    log.info("Attempting to update an indicator.");
    Indicator foundIndicator = fetchIndicatorMethod(indicatorId);
    User userFromToken = tokenService.getUserFromToken(request);
    try {
      if (!foundIndicator.getCreatedBy().getId().equals(userFromToken.getId())) {
        throw new IndicatorManipulationNotAllowed(
            "You do not have the permission to update the indicator");
      }
      Indicator indicator = new Indicator();
      indicator.setId(foundIndicator.getId());
      prepareIndicator(request, indicatorReference, indicator);
      indicatorRepository.save(indicator);
      log.info("Successfully updated an indicator");
    } catch (IndicatorManipulationNotAllowed e) {
      throw e;
    } catch (Exception e) {
      throw new DatabaseOperationException("Could not access database to update the indicator", e);
    }
  }

  private void prepareIndicator(
      HttpServletRequest request, IndicatorReference indicatorReference, Indicator indicator) {
    log.info("Preparing indicator '{}'.", indicatorReference.getName());
    Gson gson = new Gson();
    try {
      // Indicator Metadata
      indicator.setName(indicatorReference.getName());
      indicator.setIndicatorType(indicatorReference.getIndicatorType());
      indicator.setCreatedOn(LocalDateTime.now());
      Set<String> uniquePlatforms = new HashSet<>();
      // Indicator creator validation
      indicator.setCreatedBy(tokenService.getUserFromToken(request));

      if (indicatorReference.getIndicatorType() == IndicatorType.BASIC) {
        // TODO: Extract platform information and add it to an attribute
        indicator.setIndicatorQuery(gson.toJson(indicatorReference.getIndicatorQuery()));
        uniquePlatforms.addAll(indicatorReference.getIndicatorQuery().getPlatforms());
      }

      // Analytics Technique
      if (indicatorReference.getIndicatorType() == IndicatorType.BASIC
          || indicatorReference.getIndicatorType() == IndicatorType.MULTI_LEVEL) {

        AnalyticsTechnique foundAnalyticsTechniquesById =
            analyticsTechniqueService.fetchAnalyticsTechniqueMethod(
                indicatorReference.getAnalyticsTechniqueId());

        AnalyticsTechniqueReference analyticsTechniqueReference = new AnalyticsTechniqueReference();

        // // Metadata
        analyticsTechniqueReference.setAnalyticsTechnique(foundAnalyticsTechniquesById);

        // // Params TODO: No need to transform
        //        Map<String, String> transformedParams = new HashMap<>();
        //        for (OpenLAPDynamicParam param : indicatorRequest.getAnalyticsTechniqueParams()) {
        //          transformedParams.put(param.getId(), param.getValue().toString());
        //        }
        //        analyticsTechniqueReference.setAdditionalParams(gson.toJson(transformedParams));
        analyticsTechniqueReference.setAdditionalParams(
            gson.toJson(indicatorReference.getAnalyticsTechniqueParams()));

        // // Mapping
        OpenLAPDataSetConfigValidationResult validationResultAnalyticsTechniqueMapping =
            analyticsTechniqueService.validateAnalyticsTechniqueMapping(
                foundAnalyticsTechniquesById.getId(),
                indicatorReference.getAnalyticsTechniqueMapping());
        if (validationResultAnalyticsTechniqueMapping.isValid()) {
          analyticsTechniqueReference.setQueryToAnalyticsTechniqueMapping(
              gson.toJson(indicatorReference.getAnalyticsTechniqueMapping()));
        }
        indicator.setAnalyticsTechniqueReference(analyticsTechniqueReference);
      }
      // Visualization Method
      VisLibrary foundVisualizationLibrary =
          visualizationMethodUtilityService.fetchVisualizationLibraryMethod(
              indicatorReference.getVisualizationLibraryId());
      VisType foundVisualizationType =
          visualizationMethodUtilityService.fetchVisualizationTypeMethod(
              indicatorReference.getVisualizationTypeId());

      VisualizationTechniqueReference visualizationTechniqueReference =
          new VisualizationTechniqueReference();

      // // Metadata
      visualizationTechniqueReference.setVisLibrary(foundVisualizationLibrary);
      visualizationTechniqueReference.setVisType(foundVisualizationType);

      visualizationTechniqueReference.setAdditionalParams(
          gson.toJson(indicatorReference.getVisualizationParams()));

      // // Mapping
      OpenLAPDataSetConfigValidationResult validationResultVisualization =
          visualizationMethodUtilityService.validateAnalyticsTechniqueToVisualizationMapping(
              indicatorReference.getVisualizationTypeId(),
              indicatorReference.getVisualizationMapping());
      if (validationResultVisualization.isValid()) {
        visualizationTechniqueReference.setAnalyticsTechniqueToVisualizationMapping(
            gson.toJson(indicatorReference.getVisualizationMapping()));
      }
      indicator.setVisualizationTechniqueReference(visualizationTechniqueReference);

      if (indicatorReference.getIndicatorType() == IndicatorType.COMPOSITE) {
        indicator.setColumnToMerge(gson.toJson(indicatorReference.getColumnToMerge()));
      }

      if (indicatorReference.getIndicatorType() == IndicatorType.COMPOSITE
          || indicatorReference.getIndicatorType() == IndicatorType.MULTI_LEVEL) {
        List<IndicatorsToMergeRequest> indicatorsList = indicatorReference.getIndicators();
        for (IndicatorsToMergeRequest indicatorsToMergeRequest : indicatorsList) {
          indicatorsToMergeRequest.getIndicatorId();
          Indicator foundIndicator =
              fetchIndicatorMethod(indicatorsToMergeRequest.getIndicatorId());
          StatementsRequest statementsRequest =
              gson.fromJson(foundIndicator.getIndicatorQuery(), StatementsRequest.class);
          uniquePlatforms.addAll(statementsRequest.getPlatforms());
        }
        indicator.setIndicators(new ArrayList<>());
        for (int i = 0; i < indicatorsList.size(); i++) {
          // TODO: Extract the platform information and add it to the platform attribute
          IndicatorsToMergeRequest existingIndicator = indicatorsList.get(i);
          Indicator foundIndicator = fetchIndicatorMethod(existingIndicator.getIndicatorId());
          if (indicatorReference.getIndicatorType() == IndicatorType.MULTI_LEVEL) {
            indicator
                .getIndicators()
                .add(
                    new IndicatorsToMerge(
                        foundIndicator,
                        gson.toJson(indicatorReference.getIndicators().get(i).getColumnToMerge())));
          } else {
            indicator.getIndicators().add(new IndicatorsToMerge(foundIndicator, null));
          }
        }
      }
      indicator.setPlatforms(uniquePlatforms);
      log.info("An indicator with name '{}' was prepared.", indicator.getName());
    } catch (Exception e) {
      throw new DatabaseOperationException(
          "Could not access database to save/update the indicator");
    }
  }

  @Override
  public OpenLAPDataSet getAnalyzedDataSetMethod(
      IndicatorAnalysisTechnique indicatorAnalysisTechnique, OpenLAPDataSet dataSet) {
    log.info("Preparing to analyze data");
    OpenLAPDataSet analyzedDataSet = new OpenLAPDataSet();
    // Analytics Method
    // // Metadata
    AnalyticsTechnique foundAnalyticsTechniquesById =
        analyticsTechniqueService.fetchAnalyticsTechniqueMethod(
            indicatorAnalysisTechnique.getAnalyticsTechniqueId());
    AnalyticsMethod analyticsMethod =
        analyticsTechniqueService.loadAnalyticsMethodInstance(foundAnalyticsTechniquesById.getId());

    // // Params
    Map<String, String> transformedParams = new HashMap<>();
    for (OpenLAPDynamicParam param : indicatorAnalysisTechnique.getAnalyticsTechniqueParams()) {
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

    // // Mapping
    if (analyticsTechniqueService
        .validateAnalyticsTechniqueMapping(
            foundAnalyticsTechniquesById.getId(),
            indicatorAnalysisTechnique.getAnalyticsTechniqueMapping())
        .isValid()) {
      try {
        analyticsMethod.initialize(
            dataSet, indicatorAnalysisTechnique.getAnalyticsTechniqueMapping(), transformedParams);
        analyzedDataSet = analyticsMethod.execute();
      } catch (AnalyticsMethodInitializationException e) {
        throw new ServiceException("Could not initialize analytics method");
      }
    }
    log.info("Data analysis completed.");
    return analyzedDataSet;
  }

  @Override
  public String getIndicatorCodeMethod(
      OpenLAPDataSet analyzedDataSet,
      String visLibraryId,
      String visTypeId,
      OpenLAPPortConfig visMapping,
      Object visParams,
      Boolean encodeURI) {
    // Visualization Method
    // // Metadata
    VisLibrary foundVisualizationLibrary =
        visualizationMethodUtilityService.fetchVisualizationLibraryMethod(visLibraryId);
    VisType foundVisualizationType =
        visualizationMethodUtilityService.fetchVisualizationTypeMethod(visTypeId);

    String indicatorCode = "";
    if (foundVisualizationLibrary != null && foundVisualizationType != null) {
      indicatorCode =
          generateIndicatorCodeEncodeURIMethod(
              foundVisualizationType, analyzedDataSet, visMapping, visParams, encodeURI);
    }
    return indicatorCode;
  }

  @Override
  public String generateIndicatorCodeEncodeURIMethod(
      VisType visType,
      OpenLAPDataSet analyzedDataSet,
      OpenLAPPortConfig visualizationMappings,
      Object visualizationParams,
      Boolean encodeURI) {

    log.info("Preparing to create indicator code...");
    log.info("Visualization Params: {}", visualizationParams);
    String indicatorCode = "";
    VisualizationCodeGenerator visualizationCodeGenerator =
        visualizationMethodUtilityService.loadVisTypeInstance(visType.getId());

    // // Mapping
    OpenLAPDataSetConfigValidationResult validationResult =
        visualizationMethodUtilityService.validateAnalyticsTechniqueToVisualizationMapping(
            visType.getId(), visualizationMappings);
    if (validationResult.isValid()) {
      try {
        indicatorCode =
            visualizationCodeGenerator.generateVisualizationCode(
                analyzedDataSet, visualizationMappings, (Map<String, Object>) visualizationParams);
      } catch (IllegalAccessException | InstantiationException e) {
        throw new ServiceException("Error when generating indicator code", e);
      }
    }
    log.info("Indicator code created.");
    if (encodeURI) return Utils.encodeURIComponent(indicatorCode);
    else return indicatorCode;
  }

  @Override
  public List<OpenLAPColumnConfigData> fetchAnalyticsTechniqueOutputsByIndicatorIdMethod(
      String indicatorId) {
    Indicator foundIndicator = fetchIndicatorMethod(indicatorId);
    return analyticsTechniqueService.getAnalyticsTechniqueOutputs(
        foundIndicator.getAnalyticsTechniqueReference().getAnalyticsTechnique().getId());
  }

  @Override
  public AnalyticsTechniqueResponse fetchAnalyticsTechniqueByIndicatorIdMethod(String indicatorId) {
    Indicator foundIndicator = fetchIndicatorMethod(indicatorId);
    AnalyticsTechniqueResponse analyticsTechniqueResponse = new AnalyticsTechniqueResponse();
    analyticsTechniqueResponse.setId(
        foundIndicator.getAnalyticsTechniqueReference().getAnalyticsTechnique().getId());
    analyticsTechniqueResponse.setName(
        foundIndicator.getAnalyticsTechniqueReference().getAnalyticsTechnique().getName());
    analyticsTechniqueResponse.setDescription(
        foundIndicator.getAnalyticsTechniqueReference().getAnalyticsTechnique().getDescription());
    return analyticsTechniqueResponse;
  }

  // FOR COMPOSITE
  @Override
  public Page<Indicator> fetchAllCompatibleIndicatorsByUserIdAndAnalyticsTechniqueIdMethod(
      HttpServletRequest request, String indicatorId, int page) {
    TokenRequest tokenRequest = tokenService.verifyToken(request);
    User createdBy = userService.getUserByEmail(tokenRequest.getUserEmail());
    Pageable pageable = PageRequest.of(page, 2);
    try {
      return indicatorRepository.findByCreatedByAndAnalyticsTechniqueId(
          new ObjectId(createdBy.getId()),
          new ObjectId(fetchAnalyticsTechniqueByIndicatorIdMethod(indicatorId).getId()),
          new ObjectId(indicatorId),
          pageable);
    } catch (Exception e) {
      throw new DatabaseOperationException("The database could not find any compatible indicators");
    }
  }
}
