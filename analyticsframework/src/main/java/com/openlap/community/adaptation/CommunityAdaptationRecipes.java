package com.openlap.community.adaptation;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import com.openlap.analytics_module.drafts.IndicatorDraftConfiguration;
import com.openlap.analytics_module.entities.Indicator;
import com.openlap.analytics_module.entities.utility_entities.*;
import com.openlap.analytics_module.repositories.IndicatorRepository;
import com.openlap.analytics_statements.dtos.request.*;
import com.openlap.analytics_statements.services.StatementService;
import com.openlap.community.CommunitySanitizer;
import com.openlap.user.entities.User;
import com.openlap.user.entities.utility_entities.LrsConsumer;
import java.time.Instant;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Frozen, anonymous projections of typed definitions; never deserialize the author's editor state. */
@Service
@RequiredArgsConstructor
public class CommunityAdaptationRecipes {
  private final IndicatorRepository indicators;
  private final StatementService statements;
  private final ObjectMapper mapper;
  private final IndicatorDraftConfiguration configurations;

  public record Prepared(IndicatorType type, String name, JsonNode configuration, JsonNode adaptation) {}
  private record Basic(ObjectNode reference, ObjectNode configuration, List<JsonNode> outputs) {}

  public Prepared prepare(Indicator source, User viewer, String poolId) {
    IndicatorType type = source.getIndicatorType() == null ? IndicatorType.BASIC : source.getIndicatorType();
    List<Indicator> leaves = new ArrayList<>();
    List<IndicatorsToMerge> links = new ArrayList<>();
    if (type != IndicatorType.BASIC && source.getIndicators() != null) {
      for (var link : source.getIndicators()) {
        if (links.size() == 10) break;
        links.add(link);
        Indicator leaf = null;
        try {
          if (link != null && link.getIndicator() != null)
            leaf = indicators.findById(link.getIndicator().getId()).orElse(null);
        } catch (RuntimeException missingReference) { /* A missing source remains repairable. */ }
        leaves.add(leaf);
      }
    }
    Set<String> privateValues = privateValues(source, leaves);
    Map<String, String> aliases = new LinkedHashMap<>();
    for (int i = 0; i < leaves.size(); i++)
      if (leaves.get(i) != null && leaves.get(i).getId() != null)
        aliases.put(leaves.get(i).getId(), "source-" + (i + 1));
    String name = label(source.getName(), source, privateValues, "Community indicator");
    ObjectNode reference, config;
    if (type == IndicatorType.BASIC) {
      Basic basic = basic(source, viewer, privateValues, aliases, name);
      reference = basic.reference(); config = basic.configuration();
    } else {
      reference = object("name", name, "type", type.name());
      config = object("schemaVersion", 1, "type", type.name(), "name", name);
      ArrayNode sources = mapper.createArrayNode(), refs = mapper.createArrayNode(), combineRefs = mapper.createArrayNode();
      ObjectNode sourceDrafts = mapper.createObjectNode();
      for (int i = 0; i < leaves.size(); i++) {
        String slot = "source-" + (i + 1), sourceLabel = "Source " + (i + 1);
        Indicator leaf = leaves.get(i); IndicatorsToMerge link = links.get(i);
        Basic basic = basic(leaf, viewer, privateValues, aliases, sourceLabel);
        sourceDrafts.set(slot, basic.configuration());
        refs.add(object("slotId", slot, "label", sourceLabel, "reference", basic.reference()));
        JsonNode key = parse(link == null ? null : link.getColumnToMerge());
        if (key.isEmpty()) key = parse(source.getColumnToMerge());
        String keyId = identifier(key.path("id").asText(), privateValues, aliases);
        List<String> measures = new ArrayList<>();
        if (link != null && link.getMeasureColumnIds() != null) for (String raw : link.getMeasureColumnIds()) {
          if (measures.size() == 30) break;
          String id = identifier(raw, privateValues, aliases); if (!id.isBlank()) measures.add(id);
        }
        var selectedMethod = basic.configuration().path("analysis").path("selectedAnalyticsMethod").path("method");
        sources.add(object("id", slot, "name", sourceLabel, "analyticsMethod", selectedMethod,
            "outputs", basic.outputs(), "keyColumnId", keyId, "measureColumnIds", measures, "label", sourceLabel));
        combineRefs.add(object("slotId", slot, "keyColumnId", keyId, "measureColumnIds", measures, "label", sourceLabel));
      }
      reference.set("sources", refs);
      reference.set("combine", object("sources", combineRefs));
      reference.set("analysis", analysisReference(source, privateValues, aliases));
      reference.set("visualization", visualizationReference(source, privateValues, aliases));
      config.set("sources", sources); config.set("sourceDrafts", sourceDrafts);
      var analysis = reference.path("analysis");
      config.set("analysis", object("methodId", analysis.path("method").path("available").asBoolean()
          ? analysis.path("method").path("id").asText() : "", "mapping", analysis.path("mapping"), "params", editableParams(analysis.path("params"))));
      var vis = reference.path("visualization");
      config.set("visualization", object("libraryId", vis.path("library").path("available").asBoolean() ? vis.path("library").path("id").asText() : "",
          "typeId", vis.path("chart").path("available").asBoolean() ? vis.path("chart").path("id").asText() : "",
          "mapping", vis.path("mapping"), "params", vis.path("params"), "dataMode", "combined"));
    }
    JsonNode checked = configurations.validateAdaptation(config, type, 1);
    ObjectNode metadata = object("schemaVersion", 1, "poolId", poolId,
        "sourceVersion", configurations.hash(reference), "reference", reference);
    return new Prepared(type, name, checked, metadata);
  }

  private Basic basic(Indicator source, User viewer, Set<String> privateValues, Map<String, String> aliases, String name) {
    JsonNode query = parse(source == null ? null : source.getIndicatorQuery());
    ObjectNode filters = object("activityTypes", choices(query.path("activityTypes"), source, privateValues, aliases),
        "actions", choices(query.path("actionOnActivities"), source, privateValues, aliases));
    ArrayNode activities = mapper.createArrayNode();
    if (query.path("activities").isObject()) {
      var fields = query.path("activities").fields();
      while (fields.hasNext() && activities.size() < 100) {
        var field = fields.next();
        String queryId = field.getKey().matches("statement\\.object\\.definition\\.name\\.[A-Za-z0-9-]{1,20}") ? field.getKey() : "";
        for (JsonNode raw : field.getValue()) {
          if (activities.size() == 100) break;
          String text = label(raw.asText(), source, privateValues, "Not shared");
          activities.add(object("id", "Not shared".equals(text) ? "" : text, "name", text, "queryId", queryId));
        }
      }
    }
    filters.set("activities", activities);
    String from = date(query.path("duration").path("from").asText()), until = date(query.path("duration").path("until").asText());
    filters.set("timeframe", object("from", from, "until", until));
    String scope = query.path("userQueryCondition").asText("ONLY_ME");
    filters.put("scope", Set.of("ONLY_ME", "INCLUDE_ME", "EXCLUDE_ME").contains(scope) ? scope : "ONLY_ME");
    List<JsonNode> outputs = outputs(source, privateValues, aliases);
    ObjectNode reference = object("name", name, "type", "BASIC", "dataset", object("sourceCount", Math.min(20, query.path("lrsStores").size()), "outputs", outputs),
        "filters", filters, "analysis", analysisReference(source, privateValues, aliases), "visualization", visualizationReference(source, privateValues, aliases));
    if (source == null) reference.put("unavailable", true);
    ObjectNode config = object("schemaVersion", 1, "type", "BASIC", "indicator", object("indicatorName", name, "type", "BASIC"));
    List<LrsConsumer> connections = ownConnections(query, viewer);
    ArrayNode selectedLrs = mapper.createArrayNode();
    for (LrsConsumer connection : connections) selectedLrs.add(object("id", connection.getId().toHexString(), "lrsId", connection.getLrsId(),
        "uniqueIdentifier", connection.getUniqueIdentifier(), "lrsTitle", "Your connected data source"));
    config.set("dataset", object("selectedLRSList", selectedLrs));
    ArrayNode selectedActivities = exactFilters(filters, connections);
    if (from.isBlank()) from = Instant.now().minusSeconds(365L * 86400).toString();
    if (until.isBlank()) until = Instant.now().toString();
    config.set("filters", object("selectedUserFilter", "ONLY_ME", "selectedTime", object("from", from, "until", until), "selectedActivities", selectedActivities));
    JsonNode analysis = reference.path("analysis"), method = analysis.path("method");
    boolean available = method.path("available").asBoolean();
    config.set("analysis", object("selectedAnalyticsMethod", object("method", available ? object("id", method.path("id").asText(), "name", method.path("name").asText()) : emptyRef(),
        "mapping", selectedActivities.size() > 0 && available ? analysis.path("mapping") : emptyMapping()), "params", available ? editableParams(analysis.path("params")) : mapper.createArrayNode()));
    JsonNode visualization = reference.path("visualization"), library = visualization.path("library"), chart = visualization.path("chart");
    boolean chartAvailable = library.path("available").asBoolean() && chart.path("available").asBoolean();
    config.set("visualization", object("selectedLibrary", library.path("available").asBoolean() ? object("id", library.path("id").asText(), "name", library.path("name").asText()) : emptyRef(),
        "selectedType", chartAvailable ? object("id", chart.path("id").asText(), "name", chart.path("name").asText()) : emptyRef(),
        "mapping", chartAvailable ? visualization.path("mapping") : emptyMapping(), "params", visualization.path("params")));
    ObjectNode locked = mapper.createObjectNode(); int index = 0;
    for (String step : List.of("dataset", "filters", "analysis", "visualization", "finalize")) {
      locked.set(step, object("locked", index != 0, "openPanel", index == 0, "step", String.valueOf(++index)));
    }
    config.set("lockedStep", locked);
    return new Basic(reference, config, outputs);
  }

  private ObjectNode analysisReference(Indicator source, Set<String> privateValues, Map<String, String> aliases) {
    var reference = source == null ? null : source.getAnalyticsTechniqueReference();
    var method = reference == null ? null : reference.getAnalyticsTechnique();
    ObjectNode result = object("method", object("id", method == null ? "" : catalogId(method.getId()),
        "name", method == null ? "Unavailable analytics method" : label(method.getName(), source, privateValues, "Analytics method"),
        "available", method != null && method.isEnabled()),
        "mapping", mapping(reference == null ? null : reference.getQueryToAnalyticsTechniqueMapping(), source, privateValues, aliases));
    ArrayNode params = mapper.createArrayNode();
    JsonNode raw = parse(reference == null ? null : reference.getAdditionalParams());
    if (raw.isArray()) for (JsonNode param : raw) {
      if (params.size() == 100) break;
      String id = identifier(param.path("id").asText(), privateValues, aliases); if (id.isBlank()) continue;
      JsonNode value = parameterValue(param.get("value"), source, privateValues, 0);
      params.add(object("id", id, "name", label(id, source, privateValues, "Method parameter"), "value", value));
    }
    result.set("params", params); return result;
  }

  private ObjectNode visualizationReference(Indicator source, Set<String> privateValues, Map<String, String> aliases) {
    var reference = source == null ? null : source.getVisualizationTechniqueReference();
    var library = reference == null ? null : reference.getVisLibrary(); var chart = reference == null ? null : reference.getVisType();
    return object("library", object("id", library == null ? "" : catalogId(library.getId()),
        "name", library == null ? "Unavailable library" : label(library.getName(), source, privateValues, "Visualization library"), "available", library != null && library.isEnabled()),
        "chart", object("id", chart == null ? "" : catalogId(chart.getId()),
        "name", chart == null ? "Unavailable chart" : label(chart.getName(), source, privateValues, "Chart"), "available", chart != null && chart.isEnabled()),
        "mapping", mapping(reference == null ? null : reference.getAnalyticsTechniqueToVisualizationMapping(), source, privateValues, aliases),
        "params", source == null ? Map.of() : safeStyleKeys(mapper.valueToTree(CommunitySanitizer.visualizationParams(source)), privateValues));
  }

  private ArrayNode choices(JsonNode raw, Indicator source, Set<String> privateValues, Map<String, String> aliases) {
    ArrayNode result = mapper.createArrayNode();
    if (raw.isArray()) for (JsonNode item : raw) {
      if (result.size() == 100) break;
      String id = identifier(item.asText(), privateValues, aliases);
      String name = item.asText(); int cut = Math.max(name.lastIndexOf('/'), name.lastIndexOf('#'));
      if (cut >= 0) name = name.substring(cut + 1);
      result.add(object("id", id, "name", label(name, source, privateValues, "Not shared")));
    }
    return result;
  }

  private ArrayNode exactFilters(JsonNode reference, List<LrsConsumer> connections) {
    ArrayNode result = mapper.createArrayNode(); if (connections.isEmpty()) return result;
    List<LrsStoresStatementRequest> stores = connections.stream().map(item -> new LrsStoresStatementRequest(item.getLrsId(), item.getUniqueIdentifier())).toList();
    try {
      List<Object> types = statements.findUniqueActivityTypes(new ActivityTypesRequest(stores));
      for (JsonNode type : reference.path("activityTypes")) {
        if (result.size() == 20) break;
        JsonNode exactType = match(types, type.path("id").asText(), ""); if (exactType == null) continue;
        String typeId = exactType.path("id").asText();
        List<Object> actions = statements.findUniqueActionOnActivities(new ActionOnActivitiesRequest(stores, List.of(typeId)));
        ArrayNode selectedActions = mapper.createArrayNode();
        for (JsonNode action : reference.path("actions")) {
          JsonNode exact = match(actions, action.path("id").asText(), "");
          if (exact != null) selectedActions.add(object("id", exact.path("id").asText(), "name", exact.path("name").asText()));
        }
        List<String> actionIds = new ArrayList<>(); selectedActions.forEach(item -> actionIds.add(item.path("id").asText()));
        ArrayNode selected = mapper.createArrayNode();
        if (!actionIds.isEmpty()) {
          List<Object> ownActivities = statements.findUniqueActivities(new ActivitiesRequest(stores, List.of(typeId), actionIds));
          for (JsonNode activity : reference.path("activities")) {
            JsonNode exact = match(ownActivities, activity.path("id").asText(), activity.path("queryId").asText());
            if (exact != null) selected.add(object("id", exact.path("id").asText(), "name", exact.path("name").asText(), "queryId", exact.path("queryId").asText()));
          }
        }
        result.add(object("id", "filter-" + (result.size() + 1), "selectedActivityType", object("id", typeId, "name", exactType.path("name").asText()),
            "selectedActionList", selectedActions, "selectedActivityList", selected));
      }
    } catch (RuntimeException unavailableData) { return mapper.createArrayNode(); }
    return result;
  }

  private JsonNode match(List<Object> options, String id, String queryId) {
    if (id.isBlank() || options == null) return null;
    for (Object value : options) {
      JsonNode option = mapper.valueToTree(value);
      if (id.equals(option.path("id").asText()) && (queryId.isBlank() || queryId.equals(option.path("queryId").asText()))) return option;
    }
    return null;
  }

  private List<LrsConsumer> ownConnections(JsonNode query, User viewer) {
    Map<String, LrsConsumer> unique = new LinkedHashMap<>();
    if (viewer == null || viewer.getLrsConsumerList() == null) return List.of();
    for (var connection : viewer.getLrsConsumerList()) if (connection != null && connection.getId() != null && connection.getLrsId() != null
        && !connection.getLrsId().isBlank() && connection.getUniqueIdentifier() != null && !connection.getUniqueIdentifier().isBlank())
      unique.putIfAbsent(connection.getLrsId() + "\n" + connection.getUniqueIdentifier(), connection);
    Set<String> required = new LinkedHashSet<>(); query.path("lrsStores").forEach(item -> required.add(item.path("lrsId").asText()));
    List<LrsConsumer> result = new ArrayList<>();
    for (String lrs : required) {
      List<LrsConsumer> candidates = unique.values().stream().filter(item -> lrs.equals(item.getLrsId())).toList();
      if (candidates.size() != 1) { result.clear(); break; } result.add(candidates.get(0));
    }
    if (!result.isEmpty() && result.size() == required.size()) return result;
    return unique.size() == 1 ? List.of(unique.values().iterator().next()) : List.of();
  }

  private List<JsonNode> outputs(Indicator source, Set<String> privateValues, Map<String, String> aliases) {
    var reference = source == null ? null : source.getAnalyticsTechniqueReference();
    var method = reference == null ? null : reference.getAnalyticsTechnique();
    JsonNode raw = parse(method == null ? null : method.getOutputs());
    if (raw.isObject()) raw = raw.path("columns");
    List<JsonNode> result = new ArrayList<>();
    if (raw.isArray()) for (JsonNode item : raw) {
      if (result.size() == 30) break;
      JsonNode column = item.has("config") ? item.path("config") : item;
      ObjectNode port = port(column, source, privateValues, aliases); if (!port.path("id").asText().isBlank()) result.add(port);
    }
    return result;
  }

  private ObjectNode mapping(String raw, Indicator source, Set<String> privateValues, Map<String, String> aliases) {
    ArrayNode result = mapper.createArrayNode(); JsonNode value = parse(raw).path("mapping");
    if (value.isArray()) for (JsonNode item : value) {
      if (result.size() == 100) break;
      ObjectNode input = port(item.path("inputPort"), source, privateValues, aliases), output = port(item.path("outputPort"), source, privateValues, aliases);
      if (!input.path("id").asText().isBlank() && !output.path("id").asText().isBlank()) result.add(object("inputPort", input, "outputPort", output));
    }
    return object("mapping", result);
  }

  private ObjectNode port(JsonNode raw, Indicator source, Set<String> privateValues, Map<String, String> aliases) {
    String id = identifier(raw.path("id").asText(), privateValues, aliases);
    String type = raw.path("type").asText(); if (!Set.of("Text", "Numeric", "Boolean", "Categorical", "Numerical", "text", "numeric", "boolean", "categorical", "numerical").contains(type)) type = "Text";
    return object("id", id, "type", type, "title", label(raw.path("title").asText(raw.path("name").asText(id)), source, privateValues, "Output column"),
        "required", raw.path("required").asBoolean(false));
  }

  private JsonNode safeStyleKeys(JsonNode value, Set<String> privateValues) {
    if (value.isObject()) {
      ObjectNode result = mapper.createObjectNode();
      value.fields().forEachRemaining(entry -> {
        if (!isPrivate(entry.getKey(), privateValues)) result.set(entry.getKey(), safeStyleKeys(entry.getValue(), privateValues));
      });
      return result;
    }
    if (value.isArray()) { ArrayNode result = mapper.createArrayNode(); value.forEach(item -> result.add(safeStyleKeys(item, privateValues))); return result; }
    return value;
  }

  private JsonNode parameterValue(JsonNode value, Indicator source, Set<String> privateValues, int depth) {
    if (value == null || depth > 6) return NullNode.instance;
    if (value.isNumber()) return Double.isFinite(value.asDouble()) && Math.abs(value.asDouble()) < 1e12 ? value : NullNode.instance;
    if (value.isBoolean() || value.isNull()) return value;
    if (value.isTextual()) { String clean = label(value.asText(), source, privateValues, ""); return clean.isEmpty() ? NullNode.instance : new TextNode(clean); }
    if (value.isArray()) { ArrayNode result = mapper.createArrayNode(); for (JsonNode item : value) { if (result.size() == 100) break; result.add(parameterValue(item, source, privateValues, depth + 1)); } return result; }
    // Structured arbitrary plugin parameters can contain private context. Require the viewer to re-enter them.
    return NullNode.instance;
  }

  private ArrayNode editableParams(JsonNode values) {
    ArrayNode result = mapper.createArrayNode();
    for (JsonNode value : values) result.add(object("id", value.path("id").asText(), "value", value.get("value")));
    return result;
  }

  private Set<String> privateValues(Indicator source, List<Indicator> leaves) {
    Set<String> result = new LinkedHashSet<>(); List<Indicator> all = new ArrayList<>(leaves); all.add(source);
    for (Indicator item : all) if (item != null) {
      addPrivate(result, item.getId()); User owner = item.getCreatedBy();
      if (owner != null) {
        addPrivate(result, owner.getId()); addPrivate(result, owner.getEmail()); addPrivate(result, owner.getName());
        if (owner.getName() != null) for (String token : owner.getName().split("[^\\p{L}\\p{N}]+")) if (token.length() > 2) addPrivate(result, token);
        if (owner.getLrsConsumerList() != null) for (var connection : owner.getLrsConsumerList()) if (connection != null) {
          addPrivate(result, connection.getLrsId()); addPrivate(result, connection.getUniqueIdentifier());
          if (connection.getId() != null) addPrivate(result, connection.getId().toHexString());
        }
      }
      JsonNode query = parse(item.getIndicatorQuery());
      for (JsonNode store : query.path("lrsStores")) { addPrivate(result, store.path("lrsId").asText()); addPrivate(result, store.path("uniqueIdentifier").asText()); }
    }
    return result;
  }
  private void addPrivate(Set<String> values, String value) { if (value != null && !value.isBlank()) values.add(value.toLowerCase(Locale.ROOT)); }
  private boolean isPrivate(String value, Set<String> values) {
    String lower = value.toLowerCase(Locale.ROOT);
    for (String needle : values) if (lower.equals(needle) || needle.length() > 2 && lower.contains(needle)) return true;
    return false;
  }
  private String label(String raw, Indicator source, Set<String> values, String fallback) {
    if (raw == null || raw.length() > 500 || isPrivate(raw, values)) return fallback;
    return CommunitySanitizer.text(raw, source == null ? null : source.getCreatedBy(), fallback);
  }
  private String identifier(String raw, Set<String> values, Map<String, String> aliases) {
    if (raw == null || raw.isBlank() || raw.length() > 500) return "";
    String value = raw;
    for (var alias : aliases.entrySet()) value = value.replace("source_" + alias.getKey() + "__", "source_" + alias.getValue() + "__");
    if (isPrivate(value, values) || !value.matches("[A-Za-z0-9_:/#.?%+\\-=\\[\\] -]{1,500}")
        || value.contains("@") || value.contains("..") || value.contains("?")) return "";
    return value;
  }
  private String catalogId(String raw) { return raw != null && raw.matches("[A-Za-z0-9_-]{1,200}") ? raw : ""; }
  private String date(String raw) { return raw != null && raw.length() <= 40 && raw.matches("[0-9TZ:.+ -]{10,40}") ? raw : ""; }
  private JsonNode parse(String raw) {
    try {
      JsonNode value = raw != null && raw.length() <= 2_000_000 ? mapper.readTree(raw) : null;
      return value == null ? mapper.createObjectNode() : value;
    }
    catch (Exception invalid) { return mapper.createObjectNode(); }
  }
  private ObjectNode emptyRef() { return object("id", "", "name", ""); }
  private ObjectNode emptyMapping() { return object("mapping", List.of()); }
  private ObjectNode object(Object... values) {
    ObjectNode result = mapper.createObjectNode();
    for (int i = 0; i < values.length; i += 2) result.set((String) values[i], mapper.valueToTree(values[i + 1]));
    return result;
  }
}
