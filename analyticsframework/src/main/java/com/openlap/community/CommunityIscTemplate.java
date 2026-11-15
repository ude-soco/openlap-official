package com.openlap.community;

import com.google.gson.*;
import com.openlap.isc_module.entities.IndicatorSpecificationCard;
import com.openlap.user.entities.User;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

/** New illustrative content is constructed from schema; original rows/options are never copied. */
public final class CommunityIscTemplate {
  private static final Map<String, String> CHARTS = Map.ofEntries(
      Map.entry("Bar chart", "bar"), Map.entry("Grouped bar chart", "bar"), Map.entry("Stacked Bar chart", "bar"),
      Map.entry("Line chart", "line"), Map.entry("Area chart", "area"), Map.entry("Pie chart", "pie"),
      Map.entry("Donut chart", "donut"), Map.entry("Polar Area chart", "polarArea"), Map.entry("Scatter Plot", "scatter"),
      Map.entry("Dot chart", "scatter"), Map.entry("Tree Map", "treemap"), Map.entry("Radar chart", "radar"));
  private final Map<String, Object> requirements, dataset, visRef, lockedStep;
  private final String version;
  private CommunityIscTemplate(Map<String, Object> requirements, Map<String, Object> dataset,
      Map<String, Object> visRef, Map<String, Object> lockedStep) {
    this.requirements = requirements; this.dataset = dataset; this.visRef = visRef; this.lockedStep = lockedStep;
    version = hash(CommunitySanitizer.json(canonical(List.of(requirements, dataset, visRef))));
  }
  public Map<String, Object> requirements() { return requirements; }
  public Map<String, Object> dataset() { return dataset; }
  public Map<String, Object> visRef() { return visRef; }
  public Map<String, Object> lockedStep() { return lockedStep; }
  public String version() { return version; }
  public String name() { return (String) requirements.get("indicatorName"); }

  public static CommunityIscTemplate from(IndicatorSpecificationCard source) {
    User creator = source.getCreatedBy();
    JsonObject original = CommunitySanitizer.object(CommunitySanitizer.parse(source.getRequirements()));
    JsonObject originalVis = CommunitySanitizer.object(CommunitySanitizer.parse(source.getVisRef()));
    JsonObject originalGoal = CommunitySanitizer.object(original.get("goalType"));
    String name = CommunitySanitizer.text(source.getIndicatorName() == null ? CommunitySanitizer.string(original, "indicatorName") : source.getIndicatorName(), creator, "Learning indicator specification");
    String category = CommunitySanitizer.text(CommunitySanitizer.string(originalGoal, "category"), creator, "Exploration");
    String verb = CommunitySanitizer.text(CommunitySanitizer.string(originalGoal, "verb"), creator, "explore");
    Map<String, Object> goalType = Map.of("id", "community-goal", "category", category, "verb", verb,
        "description", "", "custom", true, "active", true);
    List<Map<String, Object>> data = new ArrayList<>(), columns = new ArrayList<>();
    Map<String, String> aliases = new HashMap<>();
    JsonArray originalColumns = original.has("data") && original.get("data").isJsonArray() ? original.getAsJsonArray("data") : new JsonArray();
    for (JsonElement element : originalColumns) {
      if (data.size() >= 24) break;
      JsonObject column = CommunitySanitizer.object(element);
      int index = data.size() + 1; String field = "col" + index;
      String label = CommunitySanitizer.text(CommunitySanitizer.string(column, "value"), creator, "Column " + index);
      JsonObject rawType = CommunitySanitizer.object(column.get("type"));
      boolean number = "number".equals(CommunitySanitizer.string(rawType, "type"));
      boolean ordinal = "Categorical (ordinal)".equals(CommunitySanitizer.string(rawType, "value"));
      Map<String, Object> type = Map.of("type", number ? "number" : "string", "value", number ? "Numerical" : ordinal ? "Categorical (ordinal)" : "Categorical");
      data.add(Map.of("id", field, "value", label, "type", type));
      columns.add(Map.of("field", field, "headerName", label, "type", number ? "number" : "string", "dataType", type,
          "editable", true, "sortable", false, "width", 180, "align", "left", "headerAlign", "left"));
      aliases.put(CommunitySanitizer.string(column, "id"), field);
    }
    if (data.isEmpty()) {
      Map<String, Object> text = Map.of("type", "string", "value", "Categorical");
      Map<String, Object> number = Map.of("type", "number", "value", "Numerical");
      data.add(Map.of("id", "col1", "value", "Category", "type", text));
      data.add(Map.of("id", "col2", "value", "Value", "type", number));
      columns.add(Map.of("field", "col1", "headerName", "Category", "type", "string", "dataType", text, "editable", true, "width", 180));
      columns.add(Map.of("field", "col2", "headerName", "Value", "type", "number", "dataType", number, "editable", true, "width", 180));
    }
    List<Map<String, Object>> rows = new ArrayList<>();
    for (int row = 1; row <= 4; row++) {
      Map<String, Object> example = new LinkedHashMap<>(); example.put("id", "example-" + row);
      for (int col = 0; col < columns.size(); col++) example.put((String) columns.get(col).get("field"),
          "number".equals(columns.get(col).get("type")) ? row * 10 + col : "Example " + row);
      rows.add(example);
    }
    String selectedPath = CommunitySanitizer.string(original, "selectedPath");
    if (!Set.of("Visualization", "Task", "Dataset").contains(selectedPath)) selectedPath = "Visualization";
    Map<String, Object> requirements = new LinkedHashMap<>();
    requirements.put("goalType", goalType);
    requirements.put("goal", CommunitySanitizer.text(CommunitySanitizer.string(original, "goal"), creator, "Explore patterns in learning activity"));
    requirements.put("question", CommunitySanitizer.text(CommunitySanitizer.string(original, "question"), creator, "What patterns appear in this data?"));
    requirements.put("indicatorName", name); requirements.put("selectedPath", selectedPath); requirements.put("data", data);
    requirements.put("edit", Map.of("goal", false, "question", false, "indicatorName", false));
    requirements.put("show", Map.of("goal", true, "question", true, "indicatorName", true));
    String chart = CommunitySanitizer.string(originalVis.get("chart"), "type");
    if (!CHARTS.containsKey(chart)) chart = "Bar chart";
    String code = CHARTS.get(chart);
    List<Map<String, Object>> numeric = columns.stream().filter(column -> "number".equals(column.get("type"))).toList();
    List<Map<String, Object>> categorical = columns.stream().filter(column -> !"number".equals(column.get("type"))).toList();
    String x = (String) (categorical.isEmpty() ? columns.get(0) : categorical.get(0)).get("field");
    String y = (String) (numeric.isEmpty() ? columns.get(0) : numeric.get(0)).get("field");
    Map<String, Object> axis = new LinkedHashMap<>();
    JsonObject rawAxis = CommunitySanitizer.object(CommunitySanitizer.object(originalVis.get("data")).get("axisOptions"));
    for (String key : List.of("selectedXAxis", "selectedLabel", "selectedCategory", "selectedXValue"))
      axis.put(key, aliases.getOrDefault(CommunitySanitizer.string(rawAxis, key), x));
    for (String key : List.of("selectedYAxis", "selectedBarValue", "selectedValue"))
      axis.put(key, aliases.getOrDefault(CommunitySanitizer.string(rawAxis, key), y));
    for (String key : List.of("xAxisOptions", "yAxisOptions", "labelOptions", "barValueOptions", "categoryOptions", "xValueOptions", "valueOptions")) axis.put(key, columns);
    String categoryField = String.valueOf(axis.get("selectedXAxis"));
    String measureField = String.valueOf(axis.get("selectedYAxis"));
    List<String> categories = rows.stream().map(row -> String.valueOf(row.get(categoryField))).toList();
    List<Number> measures = rows.stream().map(row -> row.get(measureField) instanceof Number number ? number : 0).toList();
    Object series;
    if (Set.of("pie", "donut", "polarArea").contains(code)) series = measures;
    else if (code.equals("scatter")) {
      List<List<Number>> points = new ArrayList<>();
      for (int index = 0; index < rows.size(); index++) points.add(List.of(
          rows.get(index).get(categoryField) instanceof Number number ? number : index + 1, measures.get(index)));
      series = List.of(Map.of("name", "Example values", "data", points));
    } else if (code.equals("treemap")) {
      List<Map<String, Object>> points = new ArrayList<>();
      for (int index = 0; index < rows.size(); index++) points.add(Map.of("x", categories.get(index), "y", measures.get(index)));
      series = List.of(Map.of("name", "Example values", "data", points));
    }
    else {
      List<Map<String, Object>> values = new ArrayList<>();
      for (Map<String, Object> column : numeric) values.add(Map.of("name", column.get("headerName"), "data", rows.stream().map(row -> row.get(column.get("field"))).toList()));
      if (values.isEmpty()) values.add(Map.of("name", "Example values", "data", measures));
      series = values;
    }
    Map<String, Object> options = new LinkedHashMap<>();
    options.put("chart", Map.of("type", code, "stacked", chart.equals("Stacked Bar chart"), "toolbar", Map.of("show", false)));
    options.put("xaxis", Map.of("categories", categories)); options.put("labels", categories);
    options.put("tooltip", Map.of("enabled", true)); options.put("dataLabels", Map.of("enabled", true));
    options.put("legend", Map.of("show", true, "position", "bottom"));
    Map<String, Object> visRef = Map.of("filter", Map.of("type", CommunitySanitizer.text(CommunitySanitizer.string(originalVis.get("filter"), "type"), creator, "Distribution")),
        "chart", Map.of("type", chart, "code", code), "data", Map.of("series", series, "options", options, "axisOptions", axis), "edit", false);
    Map<String, Object> locked = new LinkedHashMap<>();
    int step = 0; for (String key : List.of("requirements", "path", "visualization", "dataset", "finalize"))
      locked.put(key, Map.of("locked", false, "openPanel", false, "step", Integer.toString(++step)));
    return new CommunityIscTemplate(requirements, Map.of("file", Map.of("name", ""), "columns", columns, "rows", rows), visRef, locked);
  }
  private static Object canonical(Object value) {
    if (value instanceof Map<?, ?> map) {
      Map<String, Object> result = new TreeMap<>();
      map.forEach((key, item) -> result.put(key.toString(), canonical(item)));
      return result;
    }
    if (value instanceof Collection<?> list) return list.stream().map(CommunityIscTemplate::canonical).toList();
    return value;
  }
  static String hash(String value) {
    try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
    catch (Exception impossible) { throw new IllegalStateException(impossible); }
  }
}
