package com.openlap.visualization_methods.compatibility;

import com.openlap.dataset.OpenLAPDataSet;
import com.openlap.dataset.OpenLAPPortConfig;
import com.openlap.infrastructure.exception.ValidationException;
import com.openlap.template.VisualizationCodeGenerator;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Repairs the pinned C3 scatter transform's last-point-per-group overwrite. */
public final class LegacyC3Scatter {
  private static final String CLASS = "openlap.visualizer.C3.Charts.ScatterPlot";
  private static final List<String> DEFAULT_COLORS = List.of(
      "#008ffb", "#ff5733", "#3498db", "#2ecc71", "#9b59b6", "#f1c40f",
      "#e74c3c", "#1abc9c", "#34495e", "#d35400", "#95a5a6");

  private LegacyC3Scatter() {}

  public static String repair(VisualizationCodeGenerator generator, String code,
      OpenLAPDataSet originalData, OpenLAPPortConfig mappings, Map<String, Object> parameters) {
    if (generator == null || !CLASS.equals(generator.getClass().getName())
        || !LegacyC3Strings.supports(generator)) return code;
    String fixed = replaceData(code, data(originalData, mappings, parameters));
    return LegacyChartOptions.append(fixed, "c3.generate(", List.of("axis", "x"), "type", "indexed");
  }

  private static final class Points {
    private final List<Object> x = new ArrayList<>();
    private final List<Object> y = new ArrayList<>();
  }

  static Map<String, Object> data(OpenLAPDataSet source, OpenLAPPortConfig mappings,
      Map<String, Object> parameters) {
    Map<String, String> inputs = new LinkedHashMap<>();
    if (mappings == null || mappings.getMapping() == null) throw invalid("Review the scatter input mappings.");
    for (var mapping : mappings.getMapping()) {
      if (mapping == null || mapping.getInputPort() == null || mapping.getOutputPort() == null) {
        throw invalid("Review the scatter input mappings.");
      }
      if (inputs.putIfAbsent(mapping.getInputPort().getId(), mapping.getOutputPort().getId()) != null) {
        throw invalid("Each scatter input needs exactly one mapping.");
      }
    }
    List<?> x = values(source, inputs.get("xAxisStrings"));
    List<?> y = values(source, inputs.get("yAxisValues"));
    List<?> groups = values(source, inputs.get("GroupBy"));
    if (x.size() != y.size() || x.size() != groups.size() || x.size() > 100000) {
      throw invalid("Scatter coordinates and group labels must have equal, bounded lengths.");
    }
    Map<String, Points> byGroup = new LinkedHashMap<>();
    for (int row = 0; row < x.size(); row++) {
      Object label = groups.get(row);
      if (!(label instanceof String name) || name.isBlank() || name.length() > 2048) {
        throw invalid("Each scatter observation needs a nonempty group label.");
      }
      Points points = byGroup.computeIfAbsent(name, ignored -> new Points());
      points.x.add(number(x.get(row)));
      points.y.add(number(y.get(row)));
    }

    List<String> palette = palette(parameters);
    Map<String, String> xs = new LinkedHashMap<>();
    Map<String, String> names = new LinkedHashMap<>();
    Map<String, String> colors = new LinkedHashMap<>();
    List<List<Object>> columns = new ArrayList<>();
    int index = 0;
    for (var group : byGroup.entrySet()) {
      // Internal IDs are independent of display names and cannot collide with the X-column IDs.
      String id = "series_" + index;
      xs.put(id, id + "_x");
      names.put(id, group.getKey());
      colors.put(id, palette.get(index % palette.size()));
      ArrayList<Object> xValues = new ArrayList<>();
      xValues.add(id + "_x");
      xValues.addAll(group.getValue().x);
      ArrayList<Object> yValues = new ArrayList<>();
      yValues.add(id);
      yValues.addAll(group.getValue().y);
      columns.add(xValues);
      columns.add(yValues);
      index++;
    }
    Map<String, Object> data = new LinkedHashMap<>();
    data.put("xs", xs);
    data.put("columns", columns);
    data.put("names", names);
    data.put("colors", colors);
    data.put("type", "scatter");
    Object labels = parameters == null ? null : parameters.get("showLabels");
    data.put("labels", labels == null || Boolean.parseBoolean(labels.toString()));
    return data;
  }

  private static List<?> values(OpenLAPDataSet source, String id) {
    if (id == null || source.getColumns().get(id) == null || source.getColumns().get(id).getData() == null) {
      throw invalid("A mapped scatter column is unavailable. Review the source analysis.");
    }
    return source.getColumns().get(id).getData();
  }

  private static Number number(Object value) {
    Number number;
    try {
      number = value instanceof Number numeric ? numeric
          : value instanceof String text ? new BigDecimal(text) : null;
    } catch (NumberFormatException error) {
      number = null;
    }
    if (number == null || !Double.isFinite(number.doubleValue())) {
      throw invalid("Scatter coordinates must be finite numbers.");
    }
    return number;
  }

  private static List<String> palette(Map<String, Object> parameters) {
    Object configured = parameters == null ? null : parameters.get("colorsArray");
    if (configured == null || configured.toString().isBlank() || "[]".equals(configured.toString().trim())) {
      return DEFAULT_COLORS;
    }
    List<?> items = configured instanceof List<?> list ? list : Arrays.asList(
        configured.toString().trim().replaceAll("^\\[|\\]$", "").split(","));
    List<String> colors = new ArrayList<>();
    for (Object item : items) {
      String color = String.valueOf(item).trim().replaceAll("^['\"]|['\"]$", "");
      if (!color.matches("#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|[A-Za-z]{1,32}")) {
        throw invalid("Use hexadecimal or named colors for the scatter palette.");
      }
      colors.add(color);
    }
    if (colors.isEmpty() || colors.size() > 100) throw invalid("Choose a bounded, nonempty scatter palette.");
    return colors;
  }

  /** Replace only the reviewed template's data option; labels remain JSON-escaped. */
  static String replaceData(String code, Map<String, Object> data) {
    return LegacyChartOptions.replace(code, "c3.generate(", "data", data);
  }

  private static ValidationException invalid(String message) {
    return new ValidationException("INVALID_LEGACY_SCATTER_INPUT", message);
  }
}
