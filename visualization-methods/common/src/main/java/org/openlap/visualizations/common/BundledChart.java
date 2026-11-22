package org.openlap.visualizations.common;

import com.google.gson.Gson;
import com.openlap.dataset.OpenLAPColumnDataType;
import com.openlap.dataset.OpenLAPDataColumnFactory;
import com.openlap.dataset.OpenLAPDataSet;
import com.openlap.dataset.OpenLAPPortConfig;
import com.openlap.exceptions.DataSetValidationException;
import com.openlap.exceptions.OpenLAPDataColumnException;
import com.openlap.exceptions.VisualizationCodeGenerationException;
import com.openlap.template.DataTransformer;
import com.openlap.template.VisualizationCodeGenerator;
import com.openlap.template.model.ChartConfiguration;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public abstract class BundledChart extends VisualizationCodeGenerator {
  private static final Gson JSON = new Gson();

  protected abstract ChartKind kind();

  protected abstract String renderer();

  @Override
  public final String getName() {
    return kind().title;
  }

  @Override
  public final ChartConfiguration getConfiguration() {
    // The manifest supplies the available controls to OpenLAP.
    return new ChartConfiguration(false, false, false, false, false, false, false,
        false, false, false, false, false, false, false, false, false, false, false,
        false, false, false, false, false, false, false, false, false, false);
  }

  @Override
  public final void initializeDataSetConfiguration() {
    var input = new OpenLAPDataSet();
    if (kind() == ChartKind.SCATTER) {
      add(input, "x", OpenLAPColumnDataType.Numeric, true, "X-axis", "Horizontal value for each point.");
      add(input, "y", OpenLAPColumnDataType.Numeric, true, "Y-axis", "Vertical value for each point.");
      add(input, "label", OpenLAPColumnDataType.Text, false, "Point label", "Name shown in the point tooltip.");
      add(input, "series", OpenLAPColumnDataType.Text, false, "Series", "Group or cluster used to color points.");
    } else {
      add(input, "category", OpenLAPColumnDataType.Text, true, "Category", "Label for each value, such as an activity or period.");
      add(input, "value", OpenLAPColumnDataType.Numeric, true, "Value", "Measure to visualize for each category.");
      if (kind().usesSeries()) {
        add(input, "series", OpenLAPColumnDataType.Text, true, "Series", "Group name for each value. Use one observation per category and series.");
      }
    }
    setInput(input);
    setOutput(new OpenLAPDataSet());
  }

  private static void add(OpenLAPDataSet data, String id, OpenLAPColumnDataType type,
      boolean required, String title, String description) {
    try {
      data.addOpenLAPDataColumn(OpenLAPDataColumnFactory.createOpenLAPDataColumnOfType(id, type, required, title, description));
    } catch (OpenLAPDataColumnException error) {
      throw new IllegalStateException("Could not initialize the chart inputs.", error);
    }
  }

  @Override
  public final Class<ChartRows> getDataTransformer() {
    return ChartRows.class;
  }

  @Override
  public final String visualizationLibraryScript() {
    return "";
  }

  @Override
  public final String generateVisualizationCode(OpenLAPDataSet data, OpenLAPPortConfig ports, Map<String, Object> options)
      throws DataSetValidationException, IllegalAccessException, InstantiationException {
    var resolved = new LinkedHashMap<>(options == null ? Map.<String, Object>of() : options);
    if (!kind().usesSlices() && ports != null && ports.getMapping() != null) {
      boolean scatter = kind() == ChartKind.SCATTER;
      setDefaultAxisTitle(data, ports, resolved, scatter ? "x" : "category", "xAxisLabel");
      setDefaultAxisTitle(data, ports, resolved, scatter ? "y" : "value", "yAxisLabel");
    }
    return super.generateVisualizationCode(data, ports, resolved);
  }

  private static void setDefaultAxisTitle(OpenLAPDataSet data, OpenLAPPortConfig ports,
      Map<String, Object> options, String inputId, String option) {
    if (!text(options, option, "").isBlank()) return;
    for (var port : ports.getMapping()) {
      if (port == null || port.getInputPort() == null || port.getOutputPort() == null
          || !inputId.equals(port.getInputPort().getId())) continue;
      var column = data.getColumns().get(port.getOutputPort().getId());
      if (column == null || column.getConfigurationData() == null) return;
      String title = column.getConfigurationData().getTitle();
      if (title != null && !title.isBlank()) options.put(option, title);
      return;
    }
  }

  @Override
  public final String visualizationCode(DataTransformer transformer, Map<String, Object> options) {
    var supplied = options == null ? Map.<String, Object>of() : options;
    List<?> rows = ((ChartRows) transformer).rows();
    if (kind().usesSlices()) validateSlices(rows);
    if (kind() == ChartKind.BAR) rows = barRows(rows, supplied);
    String id = "openlap-chart-" + UUID.randomUUID();
    return "<div id=\"" + id + "\"></div><script>window." + renderer()
        + ".render(document.getElementById(" + JSON.toJson(id) + "),"
        + JSON.toJson(kind().id) + "," + JSON.toJson(rows) + "," + JSON.toJson(controls(supplied)) + ");</script>";
  }

  private static List<ChartRows.CategoryValue> barRows(List<?> rows, Map<String, Object> options) {
    var hidden = new HashSet<>(entries(options, "hiddenCategories"));
    var visible = rows.stream().map(ChartRows.CategoryValue.class::cast).filter(row -> !hidden.contains(row.category()));
    var byValue = Comparator.comparingDouble(ChartRows.CategoryValue::value);
    return switch (choice(options, "sortingOrder", "original", "asc", "desc")) {
      case "asc" -> visible.sorted(byValue).toList();
      case "desc" -> visible.sorted(byValue.reversed()).toList();
      default -> visible.toList();
    };
  }

  private static void validateSlices(List<?> rows) {
    double total = 0;
    for (Object row : rows) {
      double value = ((ChartRows.CategoryValue) row).value();
      if (value < 0) throw new VisualizationCodeGenerationException("Pie and donut charts need non-negative values.");
      total += value;
    }
    if (!Double.isFinite(total) || total == 0) {
      throw new VisualizationCodeGenerationException("Pie and donut charts need a positive, finite total.");
    }
  }

  private Map<String, Object> controls(Map<String, Object> options) {
    var result = new LinkedHashMap<String, Object>();
    result.put("chartTitle", text(options, "chartTitle", ""));
    result.put("chartSubtitle", text(options, "chartSubtitle", ""));
    result.put("titlePosition", choice(options, "titlePosition", "left", "center", "right"));
    result.put("showLegend", flag(options, "showLegend", true));
    result.put("legendPosition", choice(options, "legendPosition", "bottom", "top", "left", "right"));
    result.put("useSeriesColors", flag(options, "useSeriesColors", false));
    result.put("showValues", flag(options, "showValues", true));
    result.put("showValuesBackground", flag(options, "showValuesBackground", false));
    result.put("dataLabelsColor", color(options, "dataLabelsColor", "#000000"));
    result.put("dataLabelsForeColor", color(options, "dataLabelsForeColor", "#ffffff"));
    if (kind() == ChartKind.BAR) result.put("valuesPosition", choice(options, "valuesPosition", "center", "top", "bottom"));
    if (!kind().usesSlices()) {
      result.put("showXAxis", flag(options, "showXAxis", true));
      result.put("showYAxis", flag(options, "showYAxis", true));
      result.put("showXAxisTitle", flag(options, "showXAxisTitle", true));
      result.put("showYAxisTitle", flag(options, "showYAxisTitle", true));
      result.put("xAxisLabel", text(options, "xAxisLabel", ""));
      result.put("yAxisLabel", text(options, "yAxisLabel", ""));
      result.put("showGrid", flag(options, "showGrid", true));
    }
    result.put("seriesColor", color(options, "seriesColor", "#1976d2"));
    if (kind().usesSlices() || kind().usesSeries() || kind() == ChartKind.SCATTER) {
      result.put("seriesColors", entries(options, "seriesColors"));
    }
    Object height = options.getOrDefault("height", 420);
    if (!(height instanceof Number number) || !Double.isFinite(number.doubleValue())
        || number.doubleValue() < 320 || number.doubleValue() > 800) {
      throw new VisualizationCodeGenerationException("Chart height must be between 320 and 800 pixels.");
    }
    result.put("height", height);
    return result;
  }

  private static List<?> entries(Map<String, Object> options, String key) {
    Object value = options.getOrDefault(key, List.of());
    if (value instanceof List<?> entries && entries.size() <= 2_000) return entries;
    throw new VisualizationCodeGenerationException("Choose valid chart options for " + key + ".");
  }

  private static String choice(Map<String, Object> options, String key, String fallback, String... choices) {
    String value = text(options, key, fallback);
    if (fallback.equals(value) || List.of(choices).contains(value)) return value;
    throw new VisualizationCodeGenerationException("Choose an available chart option for " + key + ".");
  }

  private static String text(Map<String, Object> options, String key, String fallback) {
    Object value = options.getOrDefault(key, fallback);
    if (value instanceof String text && text.length() <= 10_000 && text.indexOf('\0') < 0) return text;
    throw new VisualizationCodeGenerationException("Choose a valid text value for " + key + ".");
  }

  private static String color(Map<String, Object> options, String key, String fallback) {
    String value = text(options, key, fallback);
    if (value.matches("#[a-fA-F0-9]{6}")) return value;
    throw new VisualizationCodeGenerationException("Choose a six-digit hexadecimal color for " + key + ".");
  }

  private static boolean flag(Map<String, Object> options, String key, boolean fallback) {
    Object value = options.getOrDefault(key, fallback);
    if (value instanceof Boolean flag) return flag;
    throw new VisualizationCodeGenerationException("Choose on or off for " + key + ".");
  }
}
