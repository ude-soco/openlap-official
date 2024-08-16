package com.openlap.analytics_module.services.impl;

import com.google.gson.Gson;
import com.openlap.analytics_module.dto.requests.indicator.IndicatorCompositeMergeRequest;
import com.openlap.analytics_module.dto.requests.indicator.IndicatorCompositePreviewRequest;
import com.openlap.analytics_module.dto.requests.indicator.IndicatorCompositeRequest;
import com.openlap.analytics_module.dto.requests.indicator.IndicatorsToMergeRequest;
import com.openlap.analytics_module.entities.utility_entities.IndicatorReference;
import com.openlap.analytics_module.services.IndicatorBasicService;
import com.openlap.analytics_module.services.IndicatorCompositeService;
import com.openlap.analytics_module.services.IndicatorUtilityService;
import com.openlap.dataset.OpenLAPColumnConfigData;
import com.openlap.dataset.OpenLAPColumnDataType;
import com.openlap.dataset.OpenLAPDataSet;
import java.util.*;
import javax.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class IndicatorCompositeServiceImpl implements IndicatorCompositeService {
  private final IndicatorBasicService indicatorBasicService;
  private final IndicatorUtilityService indicatorUtilityService;

  // TODO: logging required for composite indicator service
  @Override
  public OpenLAPDataSet mergeIndicatorsForCompositeIndicator(
      IndicatorCompositeMergeRequest indicatorCompositeRequest) {
    Gson gson = new Gson();
    OpenLAPDataSet combinedAnalyzedDataSet = null;
    List<Map<String, List<?>>> analyticsHashMapList = new ArrayList<>();
    List<Map<String, Object>> analyticsTreeMaps = new ArrayList<>();
    List<OpenLAPColumnConfigData> outputPorts = new ArrayList<>();
    String columnToMergeId = indicatorCompositeRequest.getColumnToMerge().getId();

    // Process each indicator
    for (IndicatorsToMergeRequest indicator : indicatorCompositeRequest.getIndicators()) {
      if (outputPorts.isEmpty()) {
        outputPorts =
            indicatorUtilityService.fetchAnalyticsTechniqueOutputsByIndicatorIdMethod(
                indicator.getIndicatorId());
      }
      OpenLAPDataSet analyzedDataSet =
          indicatorBasicService.analyzeIndicatorByIndicatorId(indicator.getIndicatorId());
      List<OpenLAPColumnConfigData> columnConfigDataList =
          analyzedDataSet.getColumnsConfigurationData();

      // Initialize the combined dataset on first iteration
      if (combinedAnalyzedDataSet == null) {
        combinedAnalyzedDataSet = gson.fromJson(gson.toJson(analyzedDataSet), OpenLAPDataSet.class);
      } else {
        for (OpenLAPColumnConfigData columnConfigData : columnConfigDataList) {
          combinedAnalyzedDataSet
              .getColumns()
              .get(columnConfigData.getId())
              .getData()
              .addAll(analyzedDataSet.getColumns().get(columnConfigData.getId()).getData());
        }
      }
      Map<String, List<?>> dataMap = new HashMap<>();
      for (OpenLAPColumnConfigData columnConfigData : columnConfigDataList) {
        if (columnConfigData.getId().equals(columnToMergeId)
            || !columnConfigData.getType().equals(OpenLAPColumnDataType.Text)) {
          dataMap.put(
              columnConfigData.getId(),
              analyzedDataSet.getColumns().get(columnConfigData.getId()).getData());
        }
      }
      analyticsHashMapList.add(dataMap);
    }
    removeUnwantedColumns(combinedAnalyzedDataSet, columnToMergeId);
    filterOutputPorts(outputPorts, columnToMergeId);

    processMergedDataForCompositeIndicator(
        analyticsHashMapList, analyticsTreeMaps, columnToMergeId, outputPorts);

    return buildCombinedDataSetForCompositeIndicator(
        combinedAnalyzedDataSet, analyticsTreeMaps, columnToMergeId, outputPorts);
  }

  private void removeUnwantedColumns(OpenLAPDataSet dataSet, String columnToMergeId) {
    Iterator<OpenLAPColumnConfigData> iterator = dataSet.getColumnsConfigurationData().iterator();
    while (iterator.hasNext()) {
      OpenLAPColumnConfigData columnConfigData = iterator.next();
      if (!columnConfigData.getId().equals(columnToMergeId)
          && columnConfigData.getType().equals(OpenLAPColumnDataType.Text)) {
        dataSet.getColumns().remove(columnConfigData.getId());
        iterator.remove();
      }
    }
  }

  private void filterOutputPorts(
      List<OpenLAPColumnConfigData> outputPorts, String columnToMergeId) {
    Iterator<OpenLAPColumnConfigData> iterator = outputPorts.iterator();
    while (iterator.hasNext()) {
      OpenLAPColumnConfigData outputPort = iterator.next();
      if (!outputPort.getId().equals(columnToMergeId)
          && outputPort.getType().equals(OpenLAPColumnDataType.Text)) {
        iterator.remove();
      }
    }
  }

  private void processMergedDataForCompositeIndicator(
      List<Map<String, List<?>>> analyticsHashMapList,
      List<Map<String, Object>> analyticsTreeMaps,
      String columnToMergeId,
      List<OpenLAPColumnConfigData> outputPorts) {
    for (Map<String, List<?>> dataMap : analyticsHashMapList) {
      Map<String, ArrayList<?>> outputHashMap = new HashMap<>();
      Map<String, Object> mergedMap = new TreeMap<>();
      List<String> itemNames = (List<String>) dataMap.get(columnToMergeId);

      for (OpenLAPColumnConfigData port : outputPorts) {
        if (!port.getId().equals(columnToMergeId)) {
          outputHashMap.put(port.getId(), (ArrayList<?>) dataMap.get(port.getId()));
        }
      }

      for (Map.Entry<String, ArrayList<?>> entry : outputHashMap.entrySet()) {
        if (entry.getKey().equals(columnToMergeId)) continue;
        for (int i = 0; i < itemNames.size(); i++) {
          Object value = entry.getValue().get(i);
          if (value instanceof String) {
            try {
              Integer intValue = Integer.parseInt((String) value);
              mergedMap.put(itemNames.get(i), intValue);
            } catch (NumberFormatException e) {
              mergedMap.put(itemNames.get(i), value);
            }
          } else if (value instanceof Integer) {
            mergedMap.put(itemNames.get(i), value);
          } else if (value instanceof Double) {
            Number number = (Number) entry.getValue().get(i);
            mergedMap.put(itemNames.get(i), number.intValue());
          } else {
            // Handle other data types if necessary
            mergedMap.put(itemNames.get(i), value.toString());
          }
        }
      }
      analyticsTreeMaps.add(mergedMap);
    }
  }

  private OpenLAPDataSet buildCombinedDataSetForCompositeIndicator(
      OpenLAPDataSet combinedDataSet,
      List<Map<String, Object>> analyticsTreeMaps,
      String columnToMergeId,
      List<OpenLAPColumnConfigData> outputPorts) {
    Set<String> allKeys = new TreeSet<>();
    for (Map<String, Object> map : analyticsTreeMaps) {
      allKeys.addAll(map.keySet());
    }
    int maxLength = allKeys.size();

    List<List<String>> values = new ArrayList<>(analyticsTreeMaps.size());
    for (Map<String, Object> map : analyticsTreeMaps) {
      List<String> list = new ArrayList<>(Collections.nCopies(maxLength, "0"));
      for (Map.Entry<String, Object> entry : map.entrySet()) {
        int index = new ArrayList<>(allKeys).indexOf(entry.getKey());
        list.set(index, entry.getValue().toString());
      }
      values.add(list);
    }

    for (OpenLAPColumnConfigData port : outputPorts) {
      if (!port.getId().equals(columnToMergeId)
          && !port.getType().equals(OpenLAPColumnDataType.Text)) {
        combinedDataSet.getColumns().get(port.getId()).getData().clear();
        combinedDataSet.getColumns().get(port.getId()).getData().addAll(values);
        continue;
      }
      combinedDataSet.getColumns().get(port.getId()).getData().clear();
      combinedDataSet.getColumns().get(port.getId()).getData().addAll(allKeys);
    }

    return combinedDataSet;
  }

  @Override
  public String previewIndicatorComposite(
      IndicatorCompositePreviewRequest indicatorCompositeRequest) {
    IndicatorCompositeMergeRequest indicatorCompositeMergeRequest =
        new IndicatorCompositeMergeRequest();
    indicatorCompositeMergeRequest.setColumnToMerge(indicatorCompositeRequest.getColumnToMerge());
    indicatorCompositeMergeRequest.setIndicators(indicatorCompositeRequest.getIndicators());

    OpenLAPDataSet mergedData =
        mergeIndicatorsForCompositeIndicator(indicatorCompositeMergeRequest);

    return indicatorUtilityService.getIndicatorCodeMethod(
        mergedData,
        indicatorCompositeRequest.getVisualizationLibraryId(),
        indicatorCompositeRequest.getVisualizationTypeId(),
        indicatorCompositeRequest.getVisualizationMapping(),
        indicatorCompositeRequest.getVisualizationParams(),
        true);
  }

  @Override
  public void createCompositeIndicator(
      HttpServletRequest request, IndicatorCompositeRequest indicatorCompositeRequest) {
    IndicatorReference indicatorReference =
        getIndicatorReferenceForCompositeIndicator(indicatorCompositeRequest);
    indicatorUtilityService.createIndicator(request, indicatorReference);
  }

  @Override
  public void updateCompositeIndicator(
      HttpServletRequest request,
      IndicatorCompositeRequest indicatorCompositeRequest,
      String indicatorId) {
    IndicatorReference indicatorReference =
        getIndicatorReferenceForCompositeIndicator(indicatorCompositeRequest);
    indicatorUtilityService.updateIndicator(request, indicatorReference, indicatorId);
  }

  private static IndicatorReference getIndicatorReferenceForCompositeIndicator(
      IndicatorCompositeRequest indicatorCompositeRequest) {
    IndicatorReference indicatorReference = new IndicatorReference();
    indicatorReference.setName(indicatorCompositeRequest.getName());
    indicatorReference.setIndicatorType(indicatorCompositeRequest.getIndicatorType());
    indicatorReference.setVisualizationLibraryId(
        indicatorCompositeRequest.getVisualizationLibraryId());
    indicatorReference.setVisualizationTypeId(indicatorCompositeRequest.getVisualizationTypeId());
    indicatorReference.setVisualizationParams(indicatorCompositeRequest.getVisualizationParams());
    indicatorReference.setVisualizationMapping(indicatorCompositeRequest.getVisualizationMapping());
    indicatorReference.setColumnToMerge(indicatorCompositeRequest.getColumnToMerge());
    indicatorReference.setIndicators(indicatorCompositeRequest.getIndicators());
    return indicatorReference;
  }
}
