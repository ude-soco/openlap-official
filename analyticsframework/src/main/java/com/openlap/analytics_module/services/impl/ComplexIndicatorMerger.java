package com.openlap.analytics_module.services.impl;

import com.openlap.analytics_module.dto.response.indicator.ComplexIndicatorMergeResult;
import com.openlap.dataset.OpenLAPColumnConfigData;
import com.openlap.dataset.OpenLAPColumnDataType;
import com.openlap.dataset.OpenLAPDataColumn;
import com.openlap.dataset.OpenLAPDataSet;
import com.openlap.exceptions.OpenLAPDataColumnException;
import com.openlap.infrastructure.exception.ValidationException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;

/** Deterministic key joins; never mutates source datasets or silently aggregates duplicate keys. */
@Component
public class ComplexIndicatorMerger {
  public static final int MAX_SOURCES = 10;
  public static final int MAX_ROWS = 10000;
  public static final int MAX_CELLS = 100000;
  public static final String KEY = "key";
  public static final String CHART_KEY = "combined_key";
  public static final String CHART_SERIES = "combined_series";
  public static final String CHART_VALUE = "combined_value";

  public record Source(
      String indicatorId, String label, OpenLAPColumnConfigData key,
      List<String> measures, OpenLAPDataSet data) {}

  private record Prepared(
      Source source, OpenLAPColumnConfigData keyConfig, LinkedHashMap<String, Integer> rows,
      LinkedHashMap<String, Object> keyValues, List<String> measures) {}

  public ComplexIndicatorMergeResult merge(List<Source> sources, boolean intersection) {
    if (sources == null || sources.size() < 2 || sources.size() > MAX_SOURCES) {
      throw invalid("Choose between two and ten distinct basic indicators.");
    }
    List<Prepared> prepared = new ArrayList<>();
    Set<String> sourceIds = new HashSet<>();
    OpenLAPColumnDataType keyType = null;
    int measureCount = 0;
    for (Source source : sources) {
      if (source == null || source.indicatorId() == null || !sourceIds.add(source.indicatorId())) {
        throw invalid("Choose distinct basic indicators; the same indicator cannot be added twice.");
      }
      Prepared input = prepare(source);
      if (keyType != null && keyType != input.keyConfig().getType()) {
        throw invalid("Matching columns must have the same data type in every indicator.");
      }
      keyType = input.keyConfig().getType();
      measureCount += input.measures().size();
      prepared.add(input);
    }

    LinkedHashMap<String, Object> keys = new LinkedHashMap<>();
    prepared.forEach(input -> input.keyValues().forEach(keys::putIfAbsent));
    if (intersection) keys.keySet().removeIf(key -> prepared.stream().anyMatch(input -> !input.rows().containsKey(key)));
    if (keys.size() > MAX_ROWS || (long) keys.size() * measureCount > MAX_CELLS) {
      throw invalid("The combined result is too large. Narrow the source indicators or select fewer measures.");
    }

    ComplexIndicatorMergeResult result = new ComplexIndicatorMergeResult();
    result.setRowCount(keys.size());
    add(result, KEY, keyType, title(prepared.get(0).keyConfig()), "Matching values shared by the source indicators", new ArrayList<>(keys.values()));
    List<String> keyOrder = new ArrayList<>(keys.keySet());
    List<Object> chartKeys = new ArrayList<>();
    List<Object> chartGroups = new ArrayList<>();
    List<Object> chartValues = new ArrayList<>();
    for (Prepared input : prepared) {
      Source source = input.source();
      String label = source.label() == null || source.label().isBlank() ? source.indicatorId() : source.label();
      int included = (int) input.rows().keySet().stream().filter(keys::containsKey).count();
      result.getSources().add(new ComplexIndicatorMergeResult.SourceSummary(source.indicatorId(), label,
          input.rows().size(), included, input.rows().size() - included));
      for (String measure : input.measures()) {
        String id = measureId(source.indicatorId(), measure);
        OpenLAPDataColumn<?> column = source.data().getColumns().get(measure);
        String measureTitle = label + " · " + title(column.getConfigurationData());
        List<Object> values = new ArrayList<>();
        for (int index = 0; index < keyOrder.size(); index++) {
          String key = keyOrder.get(index);
          Integer sourceRow = input.rows().get(key);
          Object value;
          if (sourceRow == null) {
            value = 0;
            result.getFilledCells().add(new ComplexIndicatorMergeResult.FilledCell(index, id, source.indicatorId()));
          } else {
            value = number(column.getData().get(sourceRow), "Measure " + measureTitle);
          }
          values.add(value);
          chartKeys.add(String.valueOf(keys.get(key)));
          chartGroups.add(measureTitle);
          chartValues.add(value);
        }
        add(result, id, OpenLAPColumnDataType.Numeric, measureTitle,
            "Source " + source.indicatorId() + ", output " + measure, values);
      }
    }
    if (!intersection) {
      OpenLAPDataSet chart = new OpenLAPDataSet();
      add(chart, CHART_KEY, OpenLAPColumnDataType.Text, title(prepared.get(0).keyConfig()), "Combined matching values", chartKeys);
      add(chart, CHART_SERIES, OpenLAPColumnDataType.Text, "Source / measure", "Series identify each selected source measure", chartGroups);
      add(chart, CHART_VALUE, OpenLAPColumnDataType.Numeric, "Measure value", "Values include the explicitly reported zero fills", chartValues);
      result.setChartData(chart);
    }
    return result;
  }

  private Prepared prepare(Source source) {
    if (source.key() == null || source.key().getId() == null || source.data() == null) {
      throw invalid("Choose a matching column for every indicator.");
    }
    OpenLAPDataColumn<?> keyColumn = source.data().getColumns().get(source.key().getId());
    if (keyColumn == null || keyColumn.getConfigurationData() == null) {
      throw invalid("A matching column is no longer available. Refresh the source indicators.");
    }
    OpenLAPColumnConfigData config = keyColumn.getConfigurationData();
    if (config.getType() != OpenLAPColumnDataType.Text && config.getType() != OpenLAPColumnDataType.Numeric) {
      throw invalid("Matching columns must contain text or numeric identifiers.");
    }
    if (source.key().getType() != null && source.key().getType() != config.getType()) {
      throw invalid("A matching column changed its data type. Refresh its source indicator.");
    }
    if (keyColumn.getData() == null || keyColumn.getData().size() > MAX_ROWS) {
      throw invalid("A source has too many rows or no valid data. Narrow its filters and try again.");
    }
    int rows = keyColumn.getData().size();
    for (OpenLAPDataColumn<?> column : source.data().getColumns().values()) {
      if (column == null || column.getConfigurationData() == null || column.getData() == null || column.getData().size() != rows) {
        throw invalid("Source output columns have unequal lengths. Correct the source analysis before combining it.");
      }
    }
    List<String> measures = source.measures();
    if (measures == null) {
      measures = source.data().getColumnsConfigurationData().stream()
          .filter(column -> !column.getId().equals(config.getId()) && column.getType() == OpenLAPColumnDataType.Numeric)
          .map(OpenLAPColumnConfigData::getId).sorted().toList();
    }
    if (measures.isEmpty() || measures.size() > 32 || new HashSet<>(measures).size() != measures.size()) {
      throw invalid("Choose between one and 32 distinct numeric measures from each indicator.");
    }
    for (String measure : measures) {
      OpenLAPDataColumn<?> column = source.data().getColumns().get(measure);
      if (column == null || measure.equals(config.getId()) || column.getConfigurationData().getType() != OpenLAPColumnDataType.Numeric) {
        throw invalid("Selected measures must be existing numeric output columns, separate from the matching column.");
      }
      for (Object value : column.getData()) number(value, "Measure " + title(column.getConfigurationData()));
    }
    LinkedHashMap<String, Integer> index = new LinkedHashMap<>();
    LinkedHashMap<String, Object> values = new LinkedHashMap<>();
    for (int row = 0; row < rows; row++) {
      Object value = keyColumn.getData().get(row);
      String key;
      Object output;
      if (config.getType() == OpenLAPColumnDataType.Numeric) {
        Number numeric = number(value, "Matching column");
        key = new BigDecimal(numeric.toString()).stripTrailingZeros().toPlainString();
        output = numeric;
      } else {
        if (!(value instanceof String text) || text.isBlank() || text.length() > 2048) {
          throw invalid("Matching columns must contain nonempty identifiers; missing values cannot be combined.");
        }
        key = text;
        output = text;
      }
      if (index.putIfAbsent(key, row) != null) {
        throw invalid("A source contains duplicate matching values. Aggregate it to one row per identifier before combining.");
      }
      values.put(key, output);
    }
    return new Prepared(source, config, index, values, new ArrayList<>(measures));
  }

  private static Number number(Object value, String label) {
    Number numeric;
    try {
      numeric = value instanceof Number number ? number : value instanceof String text ? new BigDecimal(text) : null;
    } catch (NumberFormatException error) {
      numeric = null;
    }
    if (numeric == null || !Double.isFinite(numeric.doubleValue())) {
      throw invalid(label + " contains a missing or invalid number. Unknown values are not replaced with zero.");
    }
    return numeric;
  }

  public static String measureId(String indicatorId, String columnId) {
    return "source_" + indicatorId + "__" + columnId;
  }

  private static String title(OpenLAPColumnConfigData column) {
    return column.getTitle() == null || column.getTitle().isBlank() ? column.getId() : column.getTitle();
  }

  @SuppressWarnings({"rawtypes", "unchecked"})
  private static void add(OpenLAPDataSet data, String id, OpenLAPColumnDataType type,
      String title, String description, List<?> values) {
    if (data.getColumns().containsKey(id)) throw invalid("Output identities conflict. Choose different source columns.");
    OpenLAPDataColumn column = new OpenLAPDataColumn(id, type, true, title, description);
    column.setData(new ArrayList(values));
    try {
      data.addOpenLAPDataColumn(column);
      if (data instanceof ComplexIndicatorMergeResult result) result.getColumnOrder().add(id);
    } catch (OpenLAPDataColumnException error) {
      throw invalid("The combined output schema is invalid.");
    }
  }

  private static ValidationException invalid(String message) {
    return new ValidationException("INVALID_INDICATOR_COMBINATION", message);
  }
}
