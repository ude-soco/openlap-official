package com.openlap.analytics_module.services.impl;

import com.openlap.dataset.OpenLAPColumnConfigData;
import com.openlap.dataset.OpenLAPColumnDataType;
import com.openlap.dataset.OpenLAPDataColumn;
import com.openlap.dataset.OpenLAPDataSet;
import com.openlap.dataset.OpenLAPPortConfig;
import com.openlap.dataset.OpenLAPPortMapping;
import com.openlap.infrastructure.exception.ValidationException;
import com.openlap.exceptions.AnalyticsMethodInitializationException;
import com.openlap.template.AnalyticsMethod;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Converts explicitly mapped method inputs without changing the source dataset or dropping rows. */
public final class AnalyticsInputPreparation {
  private AnalyticsInputPreparation() {}

  public record Prepared(OpenLAPDataSet data, OpenLAPPortConfig mapping) {}

  /** Shared boundary for previews, saved Basic indicators and Multilevel analysis. */
  public static OpenLAPDataSet execute(AnalyticsMethod method, OpenLAPDataSet data,
      OpenLAPPortConfig mapping, Map<String, String> parameters) {
    Prepared prepared = prepare(data, method.getInput(), mapping);
    try {
      method.initialize(prepared.data(), prepared.mapping(), parameters);
      return method.execute();
    } catch (AnalyticsMethodInitializationException | IllegalArgumentException e) {
      // A plugin may include raw values in its exception message. Never echo that message to a
      // viewer, including through saved/community indicators that execute on another data source.
      throw new ValidationException("ANALYTICS_DATA_INVALID",
          "The analytics method could not use these inputs. Check parameter ranges and ensure "
              + "the selected columns contain enough complete observations with variation.");
    }
  }

  /**
   * The installed method defines the destination contract. Raw statement columns remain Text for
   * legacy plugins, but an explicit numeric/boolean input mapping can request checked conversion.
   */
  public static OpenLAPPortConfig normalizeMapping(
      OpenLAPDataSet contract, OpenLAPPortConfig mapping) {
    if (contract == null || mapping == null || mapping.getMapping() == null) {
      throw invalid("Choose the required method inputs before running the analysis.");
    }
    ArrayList<OpenLAPPortMapping> normalized = new ArrayList<>();
    Set<String> destinations = new HashSet<>();
    for (OpenLAPPortMapping item : mapping.getMapping()) {
      if (item == null || item.getInputPort() == null || item.getOutputPort() == null) {
        throw invalid("The analysis input mapping is incomplete. Choose a source for each input.");
      }
      OpenLAPColumnConfigData requested = item.getInputPort();
      OpenLAPDataColumn destination = contract.getColumns().get(requested.getId());
      if (destination == null || requested.getType() != destination.getConfigurationData().getType()
          || !destinations.add(requested.getId())) {
        throw invalid("The method inputs changed or contain duplicates. Select the method inputs again.");
      }
      OpenLAPColumnConfigData source = item.getOutputPort();
      OpenLAPColumnConfigData target = destination.getConfigurationData();
      if (source.getId() == null || source.getId().isBlank()
          || !convertible(source.getType(), target.getType())) {
        throw invalid("Choose a source column with the type required by each method input.");
      }
      normalized.add(new OpenLAPPortMapping(config(source, source.getId(), target.getType()), target));
    }
    OpenLAPPortConfig result = new OpenLAPPortConfig(normalized);
    if (!contract.validateConfiguration(result).isValid()) {
      throw invalid("Choose a source column for every required method input.");
    }
    return result;
  }

  public static Prepared prepare(
      OpenLAPDataSet data, OpenLAPDataSet contract, OpenLAPPortConfig mapping) {
    OpenLAPPortConfig normalized = normalizeMapping(contract, mapping);
    if (data == null) throw invalid("No data is available for the selected analysis.");
    OpenLAPDataSet prepared = data;
    Integer rows = null;
    ArrayList<OpenLAPPortMapping> executionMapping = new ArrayList<>();
    for (OpenLAPPortMapping item : normalized.getMapping()) {
      OpenLAPColumnConfigData sourceConfig = item.getOutputPort();
      OpenLAPColumnConfigData target = item.getInputPort();
      OpenLAPDataColumn source = data.getColumns().get(sourceConfig.getId());
      if (source == null || source.getData() == null || source.getConfigurationData() == null
          || !convertible(source.getConfigurationData().getType(), target.getType())) {
        throw invalid("A selected input column is unavailable. Review the method input selections.");
      }
      if (rows != null && source.getData().size() != rows) {
        throw invalid("The selected columns have different numbers of observations. Align the data before analysis.");
      }
      rows = source.getData().size();
      if (target.getType() == OpenLAPColumnDataType.Text) {
        // Do not stringify labels or reinterpret categories selected for existing text methods.
        executionMapping.add(item);
        continue;
      }
      ArrayList<Object> converted = new ArrayList<>();
      boolean changed = source.getConfigurationData().getType() != target.getType();
      for (Object value : (List<?>) source.getData()) {
        Object convertedValue = convert(value, target.getType());
        converted.add(convertedValue);
        changed |= convertedValue != value;
      }
      if (!changed) {
        executionMapping.add(item);
        continue;
      }
      if (prepared == data) {
        prepared = new OpenLAPDataSet();
        prepared.getColumns().putAll(data.getColumns());
      }
      // One source can feed a text input and a numeric input simultaneously. Use a private alias
      // for the converted column, leaving the source and saved mappings untouched.
      String alias = "__openlap_input_" + target.getId();
      while (prepared.getColumns().containsKey(alias)) alias = "_" + alias;
      OpenLAPColumnConfigData convertedConfig = config(sourceConfig, alias, target.getType());
      OpenLAPDataColumn column = new OpenLAPDataColumn(
          alias, target.getType(), sourceConfig.isRequired(),
          sourceConfig.getTitle(), sourceConfig.getDescription());
      column.setData(converted);
      prepared.getColumns().put(alias, column);
      executionMapping.add(new OpenLAPPortMapping(convertedConfig, target));
    }
    return new Prepared(prepared, new OpenLAPPortConfig(executionMapping));
  }

  private static boolean convertible(OpenLAPColumnDataType source, OpenLAPColumnDataType target) {
    return source != null && target != null && (source == target
        || source == OpenLAPColumnDataType.Text
            && (target == OpenLAPColumnDataType.Numeric || target == OpenLAPColumnDataType.TrueFalse));
  }

  private static Object convert(Object value, OpenLAPColumnDataType type) {
    if (value == null || value instanceof String text && text.isBlank()) return null;
    if (type == OpenLAPColumnDataType.Numeric) {
      if (value instanceof Number number && Double.isFinite(number.doubleValue())) return value;
      if (value instanceof String text) {
        try {
          double number = Double.parseDouble(text.trim());
          if (Double.isFinite(number)) return number;
        } catch (NumberFormatException ignored) {
          // Return a useful error without including any potentially private statement value.
        }
      }
      throw invalid("A selected numeric input contains nonnumeric or nonfinite values. Choose a numeric field or correct its data.");
    }
    if (type == OpenLAPColumnDataType.TrueFalse) {
      if (value instanceof Boolean) return value;
      if (value instanceof String text) {
        if ("true".equalsIgnoreCase(text.trim())) return Boolean.TRUE;
        if ("false".equalsIgnoreCase(text.trim())) return Boolean.FALSE;
      }
      throw invalid("A selected true/false input contains other values. Choose a boolean field or correct its data.");
    }
    return value;
  }

  private static OpenLAPColumnConfigData config(
      OpenLAPColumnConfigData original, String id, OpenLAPColumnDataType type) {
    return new OpenLAPColumnConfigData(id, type, original.isRequired(),
        original.getTitle(), original.getDescription());
  }

  private static ValidationException invalid(String message) {
    return new ValidationException("ANALYTICS_INPUT_INVALID", message);
  }
}
