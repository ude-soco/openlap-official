package com.openlap.community;

import com.google.gson.Gson;
import com.google.gson.JsonElement;
import com.openlap.analytics_module.entities.Indicator;
import com.openlap.analytics_module.services.IndicatorUtilityService;
import com.openlap.dataset.*;
import com.openlap.plugins.visualization.VisualizationCustomization;
import com.openlap.visualization_methods.entities.VisType;
import com.openlap.visualization_methods.services.VisualizationMethodUtilityService;
import com.openlap.visualization_methods.services.VisualizationTypeService;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.bson.Document;
import org.springframework.stereotype.Service;

/** Renders chart appearance from schema and synthetic values, never a creator's query or cache. */
@Service
@RequiredArgsConstructor
public class CommunityIndicatorExamplePreview {
  private final CommunityCatalogService catalog;
  private final VisualizationMethodUtilityService charts;
  private final VisualizationTypeService types;
  private final IndicatorUtilityService utility;
  private static final Gson JSON = new Gson();

  public record Preview(String status, String message, String previewCode, String visualizationTypeId) {}

  public Preview preview(String poolId) {
    Indicator source = catalog.resolveIndicator(poolId);
    VisType chart;
    try {
      var reference = source.getVisualizationTechniqueReference();
      if (reference == null || reference.getVisLibrary() == null || reference.getVisType() == null)
        return pluginUnavailable();
      var library = charts.fetchVisualizationLibraryMethod(reference.getVisLibrary().getId());
      chart = charts.fetchVisualizationTypeMethod(reference.getVisType().getId());
      if (library == null || chart == null || !library.isEnabled() || !chart.isEnabled()
          || chart.getVisualizationLib() == null || !chart.getVisualizationLib().isEnabled()
          || !library.getId().equals(chart.getVisualizationLib().getId())) return pluginUnavailable();
    } catch (RuntimeException unavailable) {
      return pluginUnavailable();
    }
    try {
      var example = sample(source, chart, types.getVisTypeInputs(chart.getId()));
      var mapping = example.mapping();
      if (!charts.validateAnalyticsTechniqueToVisualizationMapping(chart.getId(), mapping).isValid())
        return unavailable();
      String code = utility.getIndicatorCodeMethod(example.data(), chart.getVisualizationLib().getId(),
          chart.getId(), mapping, parameters(source, chart), true);
      if (code == null || code.isBlank()) return unavailable();
      return new Preview("READY", "Chart appearance with sample values; no creator records are shown.", code, chart.getId());
    } catch (Exception unsupported) {
      // Driver/plugin failures can include private paths or selectors; expose only authored feedback.
      return unavailable();
    }
  }

  private record Example(OpenLAPDataSet data, OpenLAPPortConfig mapping) {}

  private Example sample(Indicator source, VisType chart, List<OpenLAPColumnConfigData> schema) throws Exception {
    if (schema == null || schema.isEmpty() || schema.size() > 100) throw new IllegalArgumentException();
    Map<String, OpenLAPColumnConfigData> inputs = new LinkedHashMap<>();
    for (var input : schema) {
      if (input == null || input.getId() == null || input.getId().isBlank()
          || inputs.putIfAbsent(input.getId(), input) != null) throw new IllegalArgumentException();
    }
    var stored = JSON.fromJson(source.getVisualizationTechniqueReference().getAnalyticsTechniqueToVisualizationMapping(), OpenLAPPortConfig.class);
    if (stored == null || stored.getMapping() == null || stored.getMapping().isEmpty() || stored.getMapping().size() > 100)
      throw new IllegalArgumentException();
    String seriesInput = seriesInput(chart, inputs.keySet());
    boolean grouped = stored.getMapping().stream().anyMatch(port -> port != null && port.getInputPort() != null
        && port.getInputPort().getId().equals(seriesInput));
    var data = new OpenLAPDataSet();
    ArrayList<OpenLAPPortMapping> mappings = new ArrayList<>();
    Map<String, OpenLAPColumnConfigData> aliases = new LinkedHashMap<>();
    Set<String> mapped = new HashSet<>();
    for (var port : stored.getMapping()) {
      if (port == null || port.getInputPort() == null || port.getOutputPort() == null
          || port.getOutputPort().getId() == null || port.getOutputPort().getId().isBlank()) throw new IllegalArgumentException();
      var input = inputs.get(port.getInputPort().getId());
      if (input == null || !mapped.add(input.getId()) || input.getType() == null
          || input.getType() != port.getInputPort().getType() || input.getType() != port.getOutputPort().getType()
          || input.getType() != OpenLAPColumnDataType.Numeric && input.getType() != OpenLAPColumnDataType.Text)
        throw new IllegalArgumentException();
      var output = aliases.get(port.getOutputPort().getId());
      if (output == null) {
        int number = aliases.size() + 1;
        output = new OpenLAPColumnConfigData("exampleColumn" + number, input.getType(), true,
            input.getType() == OpenLAPColumnDataType.Numeric ? "Value" + number : "Category" + number, "");
        aliases.put(port.getOutputPort().getId(), output);
        addColumn(data, output, number, grouped, input.getId().equals(seriesInput));
      } else if (output.getType() != input.getType()) throw new IllegalArgumentException();
      // Both sides are rebuilt. Saved labels, descriptions and output identifiers never reach a renderer.
      var safeInput = new OpenLAPColumnConfigData(input.getId(), input.getType(), input.isRequired(), "Input" + mapped.size(), "");
      mappings.add(new OpenLAPPortMapping(output, safeInput));
    }
    for (var input : schema) if (input.isRequired() && !mapped.contains(input.getId())) throw new IllegalArgumentException();
    return new Example(data, new OpenLAPPortConfig(mappings));
  }

  private static String seriesInput(VisType chart, Set<String> inputs) {
    Object configured = chart.getVisualizationDescriptor() == null ? null : chart.getVisualizationDescriptor().get("inputRoles");
    if (configured instanceof Map<?, ?> roles && roles.get("series") instanceof String id && inputs.contains(id)) return id;
    // The legacy C3/Apex JARs predate descriptors and expose this stable group port.
    return inputs.contains("GroupBy") ? "GroupBy" : "";
  }

  @SuppressWarnings({"rawtypes", "unchecked"})
  private static void addColumn(OpenLAPDataSet data, OpenLAPColumnConfigData config, int number,
      boolean grouped, boolean series) throws Exception {
    ArrayList values = new ArrayList<>();
    int[] amounts = {12, 19, 15, 27, 21, 32};
    for (int row = 0; row < amounts.length; row++) {
      if (config.getType() == OpenLAPColumnDataType.Numeric) values.add(amounts[row] + (number - 1) * 3);
      else if (series) values.add(row % 2 == 0 ? "Series A" : "Series B");
      else values.add("Example " + (grouped ? row / 2 + 1 : row + 1));
    }
    var column = new OpenLAPDataColumn(config.getId(), config.getType(), true, config.getTitle(), "");
    column.setData(values);
    data.addOpenLAPDataColumn(column);
  }

  @SuppressWarnings("unchecked")
  private static Map<String, Object> parameters(Indicator source, VisType chart) {
    Document descriptor = chart.getVisualizationDescriptor() == null ? null : new Document(chart.getVisualizationDescriptor());
    Map<String, Object> supplied = (Map<String, Object>) CommunitySanitizer.visualizationParams(source);
    if (descriptor != null) supplied = declaredStyles(source, descriptor, supplied);
    Map<String, Object> checked = VisualizationCustomization.validate(descriptor, supplied);
    Map<String, Object> bounded = new LinkedHashMap<>(checked);
    for (String key : List.of("width", "height")) {
      double maximum = "width".equals(key) ? 800 : 450;
      Map<?, ?> control = dimensionControl(chart, key);
      Object value = bounded.getOrDefault(key, maximum);
      if (value instanceof Number number && Double.isFinite(number.doubleValue())) {
        double dimension = Math.min(maximum, number.doubleValue());
        double base = control.get("min") instanceof Number min ? min.doubleValue() : 0;
        if (control.get("step") instanceof Number step && step.doubleValue() > 0)
          dimension = base + Math.floor((dimension - base) / step.doubleValue() + 1e-8) * step.doubleValue();
        if (dimension <= 0 || dimension < base || dimension > maximum) throw new IllegalArgumentException();
        bounded.put(key, dimension);
      } else if (!(value instanceof String text && !control.isEmpty()
          && ("auto".equals(text) || percentage(text)))) throw new IllegalArgumentException();
    }
    // Match the normal saved-preview parameter contract (Gson maps use Double),
    // including legacy renderers that cast numeric options rather than using Number.
    return JSON.fromJson(JSON.toJson(VisualizationCustomization.validate(descriptor, bounded)), Map.class);
  }

  private static Map<String, Object> declaredStyles(Indicator source, Document descriptor, Map<String, Object> legacyStyles) {
    Map<String, Object> result = new LinkedHashMap<>();
    for (String dimension : List.of("width", "height"))
      if (legacyStyles.containsKey(dimension)) result.put(dimension, legacyStyles.get(dimension));
    var saved = CommunitySanitizer.object(CommunitySanitizer.parse(source.getVisualizationTechniqueReference().getAdditionalParams()));
    if (descriptor.get("customizations") instanceof List<?> controls) for (Object item : controls) {
      if (!(item instanceof Map<?, ?> control) || !(control.get("id") instanceof String id)) continue;
      JsonElement value = saved.get(id);
      // Freeform text uses the installed plugin's defaults, never an author's title or labels.
      if ("text".equals(control.get("type"))) { result.remove(id); continue; }
      if (value == null || !value.isJsonPrimitive()) continue;
      var primitive = value.getAsJsonPrimitive();
      if ("boolean".equals(control.get("type")) && primitive.isBoolean()) result.put(id, primitive.getAsBoolean());
      else if ("number".equals(control.get("type")) && primitive.isNumber()
          && Double.isFinite(primitive.getAsDouble()) && Math.abs(primitive.getAsDouble()) < 1e9) result.put(id, primitive.getAsNumber());
      else if ("color".equals(control.get("type")) && primitive.isString()
          && primitive.getAsString().matches("#[0-9a-fA-F]{6}")) result.put(id, primitive.getAsString());
      else if ("select".equals(control.get("type")) && control.get("options") instanceof List<?> options)
        for (Object option : options) if (option instanceof Map<?, ?> choice && choice.containsKey("value")
            && JSON.toJsonTree(choice.get("value")).equals(value)) {
          // Use the trusted, declared option value rather than forwarding source strings.
          result.put(id, choice.get("value")); break;
        }
    }
    return result;
  }

  private static Map<?, ?> dimensionControl(VisType chart, String id) {
    Object controls = chart.getVisualizationDescriptor() == null ? null : chart.getVisualizationDescriptor().get("customizations");
    if (controls instanceof List<?> list) for (Object value : list)
      if (value instanceof Map<?, ?> control && id.equals(control.get("id"))) return control;
    return Map.of();
  }

  private static boolean percentage(String value) {
    if (!value.matches("[0-9]{1,3}(\\.[0-9]{1,4})?%")) return false;
    double number = Double.parseDouble(value.substring(0, value.length() - 1));
    return number > 0 && number <= 100;
  }

  private static Preview pluginUnavailable() {
    return new Preview("PLUGIN_UNAVAILABLE", "The chart renderer is unavailable. You can still review its details or adapt it.", null, null);
  }

  private static Preview unavailable() {
    return new Preview("EXAMPLE_UNAVAILABLE", "A sample preview is unavailable for this chart. You can still try it with your data or adapt it.", null, null);
  }
}
