package com.openlap.analytics_module.services.impl;

import com.openlap.analytics_module.dto.requests.indicator.*;
import com.openlap.analytics_module.dto.response.indicator.CompatibleIndicatorsColumnsMergeForMultiLevel;
import com.openlap.analytics_module.dto.response.indicator.IndicatorMultiLevelMergeResponse;
import com.openlap.analytics_module.entities.Indicator;
import com.openlap.analytics_module.entities.utility_entities.IndicatorAnalysisTechnique;
import com.openlap.analytics_module.entities.utility_entities.IndicatorReference;
import com.openlap.analytics_module.services.IndicatorBasicService;
import com.openlap.analytics_module.services.IndicatorMultiLevelService;
import com.openlap.analytics_module.services.IndicatorUtilityService;
import com.openlap.analytics_statements.dtos.OpenLapDataConverter;
import com.openlap.analytics_technique.dto.response.AnalyticsTechniqueResponse;
import com.openlap.analytics_technique.services.AnalyticsTechniqueService;
import com.openlap.dataset.*;
import com.openlap.exception.ServiceException;
import com.openlap.exceptions.OpenLAPDataColumnException;
import java.util.*;
import javax.servlet.http.HttpServletRequest;
import javax.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class IndicatorMultiLevelServiceImpl implements IndicatorMultiLevelService {
  private final IndicatorBasicService indicatorBasicService;
  private final IndicatorUtilityService indicatorUtilityService;
  private final AnalyticsTechniqueService analyticsTechniqueService;

  @Override
  public IndicatorMultiLevelMergeResponse mergeBasicIndicatorsForMultiLevelIndicator(
      IndicatorMultiLevelMergeRequest indicatorMultiLevelMergeRequest) {
    List<Map<String, List<?>>> analyticsHashMapList = new ArrayList<>();
    List<Map<String, Object>> analyticsTreeMaps = new ArrayList<>();

    processEachIndicatorMethod(indicatorMultiLevelMergeRequest, analyticsHashMapList);

    processMergedDataForMultiLevelIndicatorMethod(
        analyticsHashMapList, analyticsTreeMaps, indicatorMultiLevelMergeRequest);
    OpenLAPDataSet mergedDataset =
        buildCombinedDataSetForMultiLevelIndicatorMethod(analyticsTreeMaps);

    return new IndicatorMultiLevelMergeResponse(mergedDataset);
  }

  @Override
  public List<CompatibleIndicatorsColumnsMergeForMultiLevel>
      getCompatibleIndicatorsOutputsMergeForMultiLevels(
          IndicatorMultiLevelMergeRequest indicatorMultiLevelMergeRequest) {
    log.info("Getting compatible columns to merge for multi-level indicators...");
    List<CompatibleIndicatorsColumnsMergeForMultiLevel>
        compatibleIndicatorsColumnsMergeForMultiLevel = new ArrayList<>();
    for (IndicatorsToMergeRequest indicator : indicatorMultiLevelMergeRequest.getIndicators()) {
      Indicator foundIndicator =
          indicatorUtilityService.fetchIndicatorMethod(indicator.getIndicatorId());
      AnalyticsTechniqueResponse analyticsTechnique =
          indicatorUtilityService.fetchAnalyticsTechniqueByIndicatorIdMethod(
              foundIndicator.getId());
      List<OpenLAPColumnConfigData> techniqueOutputs = new ArrayList<>();
      for (OpenLAPColumnConfigData output :
          analyticsTechniqueService.getAnalyticsTechniqueOutputs(analyticsTechnique.getId())) {
        if (output.getType().equals(OpenLAPColumnDataType.Text)) {
          techniqueOutputs.add(output);
        }
      }
      CompatibleIndicatorsColumnsMergeForMultiLevel
          compatibleIndicatorsColumnsMergeForMultiLevelToAdd =
              new CompatibleIndicatorsColumnsMergeForMultiLevel();
      compatibleIndicatorsColumnsMergeForMultiLevelToAdd.setIndicatorId(foundIndicator.getId());
      compatibleIndicatorsColumnsMergeForMultiLevelToAdd.setName(foundIndicator.getName());
      compatibleIndicatorsColumnsMergeForMultiLevelToAdd.setColumnsToMerge(techniqueOutputs);
      compatibleIndicatorsColumnsMergeForMultiLevelToAdd.setAnalyzedDataset(
          indicatorBasicService.analyzeIndicatorByIndicatorId(foundIndicator.getId()));

      compatibleIndicatorsColumnsMergeForMultiLevel.add(
          compatibleIndicatorsColumnsMergeForMultiLevelToAdd);
    }
    log.info("Compatible indicators columns found for multi-level indicators completed.");
    return compatibleIndicatorsColumnsMergeForMultiLevel;
  }

  private void processEachIndicatorMethod(
      IndicatorMultiLevelMergeRequest indicatorMultiLevelMergeRequest,
      List<Map<String, List<?>>> analyticsHashMapList) {
    // Process each indicator
    log.info("Processing indicators...");
    for (IndicatorsToMergeRequest indicator : indicatorMultiLevelMergeRequest.getIndicators()) {
      OpenLAPDataSet analyzedDataSet =
          indicatorBasicService.analyzeIndicatorByIndicatorId(indicator.getIndicatorId());
      List<OpenLAPColumnConfigData> columnConfigDatas =
          analyzedDataSet.getColumnsConfigurationData();

      Map<String, List<?>> dataMap = new HashMap<>();
      for (OpenLAPColumnConfigData columnConfigData : columnConfigDatas) {
        dataMap.put(
            columnConfigData.getId(),
            analyzedDataSet.getColumns().get(columnConfigData.getId()).getData());
      }
      analyticsHashMapList.add(dataMap);
    }
    log.info("Process completed.");
  }

  private void processMergedDataForMultiLevelIndicatorMethod(
      List<Map<String, List<?>>> analyticsHashMapList,
      List<Map<String, Object>> analyticsTreeMaps,
      IndicatorMultiLevelMergeRequest indicatorMultiLevelMergeRequest) {
    log.info("Processing to merge indicators...");
    for (int i = 0; i < analyticsHashMapList.size(); i++) {
      Map<String, List<?>> dataMap = analyticsHashMapList.get(i);
      IndicatorsToMergeRequest indicatorMultiLevelRequest =
          indicatorMultiLevelMergeRequest.getIndicators().get(i);
      String columnToMergeId = indicatorMultiLevelRequest.getColumnToMerge().getId();
      Map<String, ArrayList<?>> outputHashMap = new HashMap<>();
      List<String> itemNames = (List<String>) dataMap.get(columnToMergeId);
      List<OpenLAPColumnConfigData> outputPorts =
          indicatorUtilityService.fetchAnalyticsTechniqueOutputsByIndicatorIdMethod(
              indicatorMultiLevelRequest.getIndicatorId());

      for (OpenLAPColumnConfigData port : outputPorts) {
        if (!port.getId().equals(columnToMergeId)) {
          outputHashMap.put(port.getId(), (ArrayList<?>) dataMap.get(port.getId()));
        }
      }

      for (Map.Entry<String, ArrayList<?>> entry : outputHashMap.entrySet()) {
        Map<String, Object> mergedMap = new TreeMap<>();
        if (entry.getKey().equals(columnToMergeId)) continue;
        for (int j = 0; j < itemNames.size(); j++) {
          Object value = entry.getValue().get(j);

          if (value instanceof String) {
            try {
              Integer intValue = Integer.parseInt((String) value);
              mergedMap.put(itemNames.get(j), intValue);
            } catch (NumberFormatException e) {
              mergedMap.put(itemNames.get(j), value);
            }
          } else if (value instanceof Integer) {
            mergedMap.put(itemNames.get(j), value);
          } else if (value instanceof Double) {
            Number number = (Number) entry.getValue().get(j);
            mergedMap.put(itemNames.get(j), number.intValue());
          } else {
            // Handle other data types if necessary
            mergedMap.put(itemNames.get(j), value.toString());
          }
        }
        analyticsTreeMaps.add(mergedMap);
      }
    }
    log.info("Merged indicators completed.");
  }

  private OpenLAPDataSet buildCombinedDataSetForMultiLevelIndicatorMethod(
      List<Map<String, Object>> analyticsTreeMaps) {
    Set<String> allKeys = new TreeSet<>();
    allKeys = getAllKeysMethod(analyticsTreeMaps, allKeys);
    List<List<String>> values = getListsMethod(analyticsTreeMaps, allKeys);

    OpenLapDataConverter dataConverter = preparingOpenLAPDataMethod(allKeys, values);
    return dataConverter.getDataSet();
  }

  private static Set<String> getAllKeysMethod(
      List<Map<String, Object>> analyticsTreeMaps, Set<String> allKeys) {
    log.info("Getting all keys...");
    if (!analyticsTreeMaps.isEmpty()) {
      // Initialize allKeys with keys from the first map
      allKeys = new TreeSet<>(analyticsTreeMaps.get(0).keySet());

      // Iterate through the rest of the maps starting from index 1
      for (int i = 1; i < analyticsTreeMaps.size(); i++) {
        Map<String, Object> currentMap = analyticsTreeMaps.get(i);

        // Create a temporary set to store the intersection of allKeys and currentMap's keys
        Set<String> intersection = new HashSet<>(allKeys);

        // Retain only the keys present in both allKeys and currentMap
        intersection.retainAll(currentMap.keySet());

        // Update allKeys to be the intersection
        allKeys = new TreeSet<>(intersection);
      }
    }
    return allKeys;
  }

  private static List<List<String>> getListsMethod(
      List<Map<String, Object>> analyticsTreeMaps, Set<String> allKeys) {
    log.info("Getting lists...");
    int maxLength = allKeys.size();
    List<List<String>> values = new ArrayList<>(analyticsTreeMaps.size());
    for (Map<String, Object> map : analyticsTreeMaps) {
      List<String> list = new ArrayList<>(Collections.nCopies(maxLength, "0"));
      for (Map.Entry<String, Object> entry : map.entrySet()) {
        int index = new ArrayList<>(allKeys).indexOf(entry.getKey());
        if (index != -1) {
          list.set(index, entry.getValue().toString());
        }
      }
      values.add(list);
    }
    return values;
  }

  private static OpenLapDataConverter preparingOpenLAPDataMethod(
      Set<String> allKeys, List<List<String>> values) {
    log.info("Preparing dataset...");
    OpenLapDataConverter dataConverter = new OpenLapDataConverter();
    ArrayList<String> allKeysList = new ArrayList<>(allKeys);
    try {
      dataConverter.SetOpenLapDataColumn(
          "item_name", OpenLAPColumnDataType.Text, true, allKeysList, "Item name", "");
      for (int i = 0; i < values.size(); i++) {
        List<String> row = values.get(i);
        String columnName = "column_" + (i + 1);
        String title = "Column " + (i + 1);
        boolean isNumericColumn = true;
        for (String value : row) {
          try {
            Integer.parseInt(value);
          } catch (NumberFormatException | NullPointerException e) {
            isNumericColumn = false;
            break; // No need to check further, column contains text
          }
        }
        OpenLAPColumnDataType dataType =
            isNumericColumn ? OpenLAPColumnDataType.Numeric : OpenLAPColumnDataType.Text;
        dataConverter.SetOpenLapDataColumn(
            columnName, dataType, true, (ArrayList<String>) row, title, "");
      }
    } catch (OpenLAPDataColumnException e) {
      throw new ServiceException("Failed to create OpenLAPDataset when merging indicators", e);
    }
    log.info("Merged dataset completed.");
    return dataConverter;
  }

  @Override
  public OpenLAPDataSet analyzeBasicIndicatorsForMultiLevelIndicator(
      IndicatorMultiLevelAnalysisRequest indicatorMultiLevelAnalysisRequest) {
    OpenLAPDataSet mergeIndicatorsResults =
        mergeBasicIndicatorsForMultiLevelIndicator(
                new IndicatorMultiLevelMergeRequest(
                    indicatorMultiLevelAnalysisRequest.getIndicators()))
            .getMergedData();
    ArrayList<OpenLAPPortMapping> openLAPPortMappings =
        indicatorMultiLevelAnalysisRequest.getAnalyticsTechniqueMapping().getMapping();

    OpenLAPDataSet filteredDataSet = new OpenLAPDataSet();

    for (OpenLAPPortMapping mapping : openLAPPortMappings) {
      String id = mapping.getOutputPort().getId();

      // Check if the column exists in mergeIndicatorsResults
      if (mergeIndicatorsResults.getColumns().containsKey(id)) {
        OpenLAPDataColumn dataColumn = mergeIndicatorsResults.getColumns().get(id);

        // Add the existing column to the filteredDataSet
        filteredDataSet.getColumns().put(id, dataColumn);
      }
    }
    IndicatorAnalysisTechnique indicatorAnalysisTechnique = new IndicatorAnalysisTechnique();
    indicatorAnalysisTechnique.setAnalyticsTechniqueId(
        indicatorMultiLevelAnalysisRequest.getAnalyticsTechniqueId());
    indicatorAnalysisTechnique.setAnalyticsTechniqueMapping(
        indicatorMultiLevelAnalysisRequest.getAnalyticsTechniqueMapping());
    indicatorAnalysisTechnique.setAnalyticsTechniqueParams(
        indicatorMultiLevelAnalysisRequest.getAnalyticsTechniqueParams());
    return indicatorUtilityService.getAnalyzedDataSetMethod(
        indicatorAnalysisTechnique, filteredDataSet);
  }

  @Override
  public String previewBasicIndicatorsForMultiLevelIndicator(
      IndicatorMultiLevelPreviewRequest indicatorMultiLevelPreviewRequest) {
    OpenLAPDataSet analyzedDataset =
        analyzeBasicIndicatorsForMultiLevelIndicator(
            new IndicatorMultiLevelAnalysisRequest(
                indicatorMultiLevelPreviewRequest.getIndicators(),
                indicatorMultiLevelPreviewRequest.getAnalyticsTechniqueId(),
                indicatorMultiLevelPreviewRequest.getAnalyticsTechniqueMapping(),
                indicatorMultiLevelPreviewRequest.getAnalyticsTechniqueParams()));

    return indicatorUtilityService.getIndicatorCodeMethod(
        analyzedDataset,
        indicatorMultiLevelPreviewRequest.getVisualizationLibraryId(),
        indicatorMultiLevelPreviewRequest.getVisualizationTypeId(),
        indicatorMultiLevelPreviewRequest.getVisualizationMapping(),
        indicatorMultiLevelPreviewRequest.getVisualizationParams(),
        true);
  }

  @Override
  public void createMultiLevelIndicator(
      HttpServletRequest request, IndicatorMultiLevelRequest indicatorMultiLevelCreateRequest) {
    IndicatorReference indicatorReference =
        getIndicatorReferenceForMultiLevelIndicator(indicatorMultiLevelCreateRequest);
    indicatorUtilityService.createIndicator(request, indicatorReference);
  }

  @Override
  public void updateMultiLevelIndicator(
      HttpServletRequest request,
      IndicatorMultiLevelRequest indicatorMultiLevelCreateRequest,
      String indicatorId) {
    IndicatorReference indicatorReference =
        getIndicatorReferenceForMultiLevelIndicator(indicatorMultiLevelCreateRequest);
    indicatorUtilityService.updateIndicator(request, indicatorReference, indicatorId);
  }

  private static IndicatorReference getIndicatorReferenceForMultiLevelIndicator(
      IndicatorMultiLevelRequest indicatorMultiLevelCreateRequest) {
    IndicatorReference indicatorReference = new IndicatorReference();
    indicatorReference.setName(indicatorMultiLevelCreateRequest.getName());
    indicatorReference.setIndicatorType(indicatorMultiLevelCreateRequest.getIndicatorType());
    indicatorReference.setVisualizationLibraryId(
        indicatorMultiLevelCreateRequest.getVisualizationLibraryId());
    indicatorReference.setVisualizationTypeId(
        indicatorMultiLevelCreateRequest.getVisualizationTypeId());
    indicatorReference.setVisualizationParams(
        indicatorMultiLevelCreateRequest.getVisualizationParams());
    indicatorReference.setVisualizationMapping(
        indicatorMultiLevelCreateRequest.getVisualizationMapping());
    indicatorReference.setAnalyticsTechniqueId(
        indicatorMultiLevelCreateRequest.getAnalyticsTechniqueId());
    indicatorReference.setAnalyticsTechniqueMapping(
        indicatorMultiLevelCreateRequest.getAnalyticsTechniqueMapping());
    indicatorReference.setAnalyticsTechniqueParams(
        indicatorMultiLevelCreateRequest.getAnalyticsTechniqueParams());
    indicatorReference.setIndicators(indicatorMultiLevelCreateRequest.getIndicators());
    return indicatorReference;
  }
}
