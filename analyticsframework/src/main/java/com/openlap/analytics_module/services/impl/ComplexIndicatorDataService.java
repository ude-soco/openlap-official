package com.openlap.analytics_module.services.impl;

import com.openlap.analytics_module.dto.requests.indicator.IndicatorsToMergeRequest;
import com.openlap.analytics_module.dto.response.indicator.ComplexIndicatorMergeResult;
import com.openlap.analytics_module.entities.Indicator;
import com.openlap.analytics_module.entities.utility_entities.IndicatorType;
import com.openlap.analytics_module.services.IndicatorBasicService;
import com.openlap.analytics_module.services.IndicatorUtilityService;
import com.openlap.dataset.OpenLAPColumnConfigData;
import com.openlap.dataset.OpenLAPDataSet;
import com.openlap.dataset.OpenLAPPortConfig;
import com.openlap.dataset.OpenLAPPortMapping;
import com.openlap.infrastructure.exception.ValidationException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Resolves saved definitions once per operation; source results remain server authoritative. */
@Service
@RequiredArgsConstructor
public class ComplexIndicatorDataService {
  private final IndicatorBasicService basic;
  private final IndicatorUtilityService utility;
  private final ComplexIndicatorMerger merger;

  public ComplexIndicatorMergeResult combine(List<IndicatorsToMergeRequest> requests,
      OpenLAPColumnConfigData fallbackKey, boolean intersection) {
    if (requests == null || requests.size() < 2 || requests.size() > ComplexIndicatorMerger.MAX_SOURCES) {
      throw invalid("Choose between two and ten distinct basic indicators.");
    }
    List<ComplexIndicatorMerger.Source> sources = new ArrayList<>();
    HashSet<String> ids = new HashSet<>();
    String method = null;
    // Validate every saved definition before executing any source plugin.
    List<Indicator> definitions = new ArrayList<>();
    for (IndicatorsToMergeRequest request : requests) {
      if (request == null || request.getIndicatorId() == null || !ids.add(request.getIndicatorId())) {
        throw invalid("Choose distinct saved basic indicators.");
      }
      Indicator source = utility.fetchIndicatorMethod(request.getIndicatorId());
      if (source.getIndicatorType() != IndicatorType.BASIC || source.getAnalyticsTechniqueReference() == null
          || source.getAnalyticsTechniqueReference().getAnalyticsTechnique() == null) {
        throw invalid("Only saved basic indicators can be combined. Nested complex indicators are not supported.");
      }
      String currentMethod = source.getAnalyticsTechniqueReference().getAnalyticsTechnique().getId();
      if (!intersection && method != null && !Objects.equals(method, currentMethod)) {
        throw invalid("Composite indicators must use the same analytics method. Choose indicators using the first source's method.");
      }
      method = currentMethod;
      definitions.add(source);
    }
    for (int index = 0; index < requests.size(); index++) {
      IndicatorsToMergeRequest request = requests.get(index);
      Indicator definition = definitions.get(index);
      String label = request.getLabel() == null || request.getLabel().isBlank() ? definition.getName() : request.getLabel();
      sources.add(new ComplexIndicatorMerger.Source(definition.getId(), label,
          request.getColumnToMerge() == null ? fallbackKey : request.getColumnToMerge(),
          request.getMeasureColumnIds(), basic.analyzeIndicatorByIndicatorId(definition.getId())));
    }
    return merger.merge(sources, intersection);
  }

  public static OpenLAPDataSet visualizationData(ComplexIndicatorMergeResult merged, OpenLAPPortConfig mapping) {
    requireNonempty(merged);
    if (mapping == null || mapping.getMapping() == null || mapping.getMapping().isEmpty()) {
      throw invalid("Map the required chart inputs before generating a preview.");
    }
    boolean combined = mapping.getMapping().stream().anyMatch(port -> port != null && port.getOutputPort() != null
        && port.getOutputPort().getId() != null && port.getOutputPort().getId().startsWith("combined_"));
    OpenLAPDataSet data = combined ? merged.getChartData() : merged;
    if (data == null) throw invalid("The selected chart data mode is unavailable.");
    requireMapping(data, mapping);
    return data;
  }

  public static void requireMapping(OpenLAPDataSet data, OpenLAPPortConfig mapping) {
    if (mapping == null || mapping.getMapping() == null || mapping.getMapping().isEmpty()) {
      throw invalid("Map the required inputs before continuing.");
    }
    HashSet<String> inputs = new HashSet<>();
    for (OpenLAPPortMapping port : mapping.getMapping()) {
      if (port == null || port.getOutputPort() == null || port.getInputPort() == null
          || port.getOutputPort().getId() == null || port.getInputPort().getId() == null
          || !inputs.add(port.getInputPort().getId())) {
        throw invalid("Each input needs one valid column mapping.");
      }
      var column = data.getColumns().get(port.getOutputPort().getId());
      if (column == null || column.getConfigurationData().getType() != port.getInputPort().getType()
          || column.getConfigurationData().getType() != port.getOutputPort().getType()) {
        throw invalid("A mapped column is missing or has an incompatible data type. Review the mappings.");
      }
    }
  }

  public static void requireNonempty(ComplexIndicatorMergeResult data) {
    if (data.getRowCount() == 0) throw invalid("No matching rows are available. Review the source indicators and matching columns.");
  }

  private static ValidationException invalid(String message) {
    return new ValidationException("INVALID_INDICATOR_COMBINATION", message);
  }
}
