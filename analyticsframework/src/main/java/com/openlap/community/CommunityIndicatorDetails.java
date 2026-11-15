package com.openlap.community;

import com.google.gson.*;
import com.openlap.analytics_module.entities.Indicator;
import com.openlap.analytics_module.repositories.IndicatorRepository;
import com.openlap.user.entities.User;
import com.openlap.user.services.TokenService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class CommunityIndicatorDetails {
  private final CommunityCatalogService catalog;
  private final TokenService tokens;
  private final IndicatorRepository indicators;
  private final CommunityIndicatorExecution execution;
  public CommunityIndicatorDetails(CommunityCatalogService catalog, TokenService tokens,
      IndicatorRepository indicators, CommunityIndicatorExecution execution) {
    this.catalog = catalog; this.tokens = tokens; this.indicators = indicators; this.execution = execution;
  }
  public Map<String, Object> detail(HttpServletRequest request, String poolId) {
    Indicator source = catalog.resolveIndicator(poolId);
    Map<String, Object> result = new LinkedHashMap<>(catalog.metadata("indicators", poolId, tokens.getUserFromToken(request).getId()));
    result.put("name", CommunitySanitizer.publicName(source));
    String version;
    try { version = execution.fingerprint(source); }
    catch (RuntimeException unavailableSource) {
      // Details remain discoverable when a supporting source is missing; preview will report why.
      version = CommunityIscTemplate.hash(poolId + ":" + source.getIndicatorType() + ":" + source.getCreatedOn());
    }
    result.put("version", version);
    if (source.getVisualizationTechniqueReference() != null && source.getVisualizationTechniqueReference().getVisType() != null)
      result.put("visualizationTypeId", source.getVisualizationTechniqueReference().getVisType().getId());
    result.put("inputs", inputs(source)); result.put("outputs", outputs(source));
    result.put("parameters", parameters(source)); result.put("filters", filters(source));
    result.put("dataScope", "Only my data");
    List<Map<String, Object>> sources = new ArrayList<>();
    if (source.getIndicators() != null) for (var link : source.getIndicators()) {
      if (sources.size() >= 10) break;
      // Source IDs and stored author labels are deliberately absent from this projection.
      Indicator leaf = link == null || link.getIndicator() == null ? null
          : indicators.findById(link.getIndicator().getId()).orElse(null);
      if (leaf == null) { sources.add(Map.of("label", "Unavailable source", "method", "", "inputs", List.of(), "outputs", List.of())); continue; }
      String method = leaf.getAnalyticsTechniqueReference() == null || leaf.getAnalyticsTechniqueReference().getAnalyticsTechnique() == null
          ? "" : CommunitySanitizer.text(leaf.getAnalyticsTechniqueReference().getAnalyticsTechnique().getName(), leaf.getCreatedBy(), "Analytics method");
      sources.add(Map.of("label", "Source " + (sources.size() + 1), "method", method,
          "inputs", inputs(leaf), "outputs", outputs(leaf), "filters", filters(leaf)));
    }
    result.put("sources", sources);
    return result;
  }
  static List<Map<String, Object>> inputs(Indicator source) {
    JsonObject query = CommunitySanitizer.object(CommunitySanitizer.parse(source.getIndicatorQuery()));
    JsonElement outputs = query.get("outputs");
    if (outputs == null || !outputs.isJsonArray()) return List.of();
    List<Map<String, Object>> values = new ArrayList<>();
    for (JsonElement field : outputs.getAsJsonArray()) {
      if (values.size() >= 30) break;
      if (field.isJsonPrimitive()) values.add(Map.of("name", CommunitySanitizer.text(field.getAsString(), source.getCreatedBy(), "Data field"), "type", "Data", "required", true));
    }
    return values;
  }
  static List<Map<String, Object>> outputs(Indicator source) {
    if (source.getAnalyticsTechniqueReference() == null || source.getAnalyticsTechniqueReference().getAnalyticsTechnique() == null) return List.of();
    JsonElement raw = CommunitySanitizer.parse(source.getAnalyticsTechniqueReference().getAnalyticsTechnique().getOutputs());
    if (raw.isJsonObject() && raw.getAsJsonObject().has("columns")) raw = raw.getAsJsonObject().get("columns");
    if (!raw.isJsonArray()) return List.of();
    List<Map<String, Object>> values = new ArrayList<>();
    for (JsonElement field : raw.getAsJsonArray()) {
      if (values.size() >= 30) break;
      JsonObject item = CommunitySanitizer.object(field);
      if (item.has("config")) item = CommunitySanitizer.object(item.get("config"));
      String name = CommunitySanitizer.string(item, "title");
      if (name.isBlank()) name = CommunitySanitizer.string(item, "id");
      values.add(Map.of("name", CommunitySanitizer.text(name, source.getCreatedBy(), "Output column"),
          "type", CommunitySanitizer.text(CommunitySanitizer.string(item, "type"), source.getCreatedBy(), "Data")));
    }
    return values;
  }
  static List<Map<String, Object>> parameters(Indicator source) {
    if (source.getAnalyticsTechniqueReference() == null) return List.of();
    JsonElement raw = CommunitySanitizer.parse(source.getAnalyticsTechniqueReference().getAdditionalParams());
    if (!raw.isJsonArray()) return List.of();
    List<Map<String, Object>> values = new ArrayList<>();
    for (JsonElement field : raw.getAsJsonArray()) {
      if (values.size() >= 30) break;
      JsonObject item = CommunitySanitizer.object(field);
      String name = CommunitySanitizer.text(CommunitySanitizer.string(item, "id"), source.getCreatedBy(), "Method parameter");
      JsonElement value = item.get("value");
      String display = value != null && value.isJsonPrimitive() ? CommunitySanitizer.text(value.getAsString(), source.getCreatedBy(), "Configured") : "Configured";
      values.add(Map.of("name", name, "value", display));
    }
    return values;
  }
  static Map<String, Object> filters(Indicator source) {
    JsonObject query = CommunitySanitizer.object(CommunitySanitizer.parse(source.getIndicatorQuery()));
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("activityTypes", labels(query.get("activityTypes"), source.getCreatedBy(), "Activity type"));
    result.put("actions", labels(query.get("actionOnActivities"), source.getCreatedBy(), "Action"));
    JsonObject duration = CommunitySanitizer.object(query.get("duration"));
    result.put("timeframe", Map.of("from", date(CommunitySanitizer.string(duration, "from")), "until", date(CommunitySanitizer.string(duration, "until"))));
    result.put("scope", "Only my data");
    return result;
  }
  private static String date(String raw) { return raw.matches("[0-9T:+Z.\\- ]{4,40}") ? raw : ""; }
  private static List<String> labels(JsonElement raw, User owner, String fallback) {
    if (raw == null || !raw.isJsonArray()) return List.of();
    List<String> output = new ArrayList<>();
    for (JsonElement value : raw.getAsJsonArray()) {
      if (output.size() >= 30) break;
      if (!value.isJsonPrimitive()) continue;
      String label = value.getAsString();
      if (label.startsWith("http://") || label.startsWith("https://")) {
        int split = Math.max(label.lastIndexOf('/'), label.lastIndexOf('#')); label = label.substring(split + 1);
      }
      output.add(CommunitySanitizer.text(label, owner, fallback));
    }
    return output;
  }
}
