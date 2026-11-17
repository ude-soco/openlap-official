package com.openlap.analytics_module.drafts;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.openlap.analytics_module.entities.utility_entities.IndicatorType;
import com.openlap.infrastructure.exception.ValidationException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import org.springframework.stereotype.Component;

/**
 * Whitelist the authoring document, keeping catalogs, analyzed rows and generated code out of
 * drafts.
 */
@Component
public class IndicatorDraftConfiguration {
  public static final int MAX_BYTES = 1048576;
  private final ObjectMapper mapper;

  public IndicatorDraftConfiguration(ObjectMapper mapper) {
    this.mapper = mapper;
  }

  public JsonNode validate(JsonNode value, IndicatorType type, Integer version) {
    if (version == null || version != 1 || value == null || !value.isObject()) throw invalid();
    if (!value.path("schemaVersion").isNumber()
        || value.path("schemaVersion").asDouble() != 1
        || !type.name().equals(value.path("type").asText())) throw invalid();
    if (value.toString().getBytes(StandardCharsets.UTF_8).length > MAX_BYTES) throw invalid();
    bounded(value, 0, new int[] {0});
    check(value, type == IndicatorType.BASIC ? basic() : complex(), false);
    if (type != IndicatorType.BASIC) requireComplexStructure(value);
    return value.deepCopy();
  }

  /** Only server-tagged adaptation drafts can contain private, unsaved Basic source recipes. */
  public JsonNode validateAdaptation(JsonNode value, IndicatorType type, Integer version) {
    if (type == IndicatorType.BASIC) return validate(value, type, version);
    if (value == null || !value.isObject() || !value.path("sourceDrafts").isObject()
        || value.toString().getBytes(StandardCharsets.UTF_8).length > MAX_BYTES) throw invalid();
    bounded(value, 0, new int[] {0});
    ObjectNode parent = ((ObjectNode) value).deepCopy();
    JsonNode drafts = parent.remove("sourceDrafts");
    JsonNode checked = validate(parent, type, version);
    Set<String> sourceIds = new HashSet<>();
    for (JsonNode source : checked.path("sources")) sourceIds.add(source.path("id").asText());
    Set<String> draftIds = new HashSet<>();
    var fields = drafts.fields();
    while (fields.hasNext()) {
      var entry = fields.next();
      String slot = entry.getKey();
      if (!slot.matches("[A-Za-z0-9][A-Za-z0-9_-]{0,99}")
          || Set.of("root", "constructor", "prototype", "__proto__").contains(slot)) throw invalid();
      draftIds.add(slot);
      validate(entry.getValue(), IndicatorType.BASIC, 1);
    }
    if (!draftIds.equals(sourceIds) || draftIds.size() > 10) throw invalid();
    ((ObjectNode) checked).set("sourceDrafts", drafts.deepCopy());
    return checked;
  }

  private static void requireComplexStructure(JsonNode value) {
    JsonNode sources = value.path("sources"),
        analysis = value.path("analysis"),
        visualization = value.path("visualization");
    if (!value.path("name").isTextual()
        || !sources.isArray()
        || sources.size() > 10
        || !analysis.isObject()
        || !analysis.path("params").isArray()
        || !analysis.path("mapping").isObject()
        || !analysis.path("mapping").path("mapping").isArray()
        || !visualization.isObject()
        || !visualization.path("mapping").isObject()
        || !visualization.path("mapping").path("mapping").isArray()) throw invalid();
    Set<String> identities = new HashSet<>();
    for (JsonNode source : sources) {
      if (!source.path("id").isTextual()
          || source.path("id").asText().isEmpty()
          || !identities.add(source.path("id").asText())
          || !source.path("outputs").isArray()) throw invalid();
      for (JsonNode output : source.path("outputs")) {
        if (!output.isObject()
            || !output.path("id").isTextual()
            || !output.path("type").isTextual()) throw invalid();
      }
    }
  }

  public JsonNode legacy(String json, IndicatorType type) {
    if (json == null || json.length() > MAX_BYTES) return null;
    try {
      JsonNode value = mapper.readTree(json);
      if (!value.isObject()
          || !(type.name().equals(value.path("type").asText())
              || type.name().equals(value.path("indicator").path("type").asText()))) return null;
      ObjectNode projected =
          (ObjectNode) project(value, type == IndicatorType.BASIC ? basic() : complex());
      projected.put("schemaVersion", 1);
      projected.put("type", type.name());
      return validate(projected, type, 1);
    } catch (Exception ignored) {
      return null;
    }
  }

  private JsonNode project(JsonNode value, Map<String, Object> fields) {
    ObjectNode result = mapper.createObjectNode();
    fields.forEach(
        (key, child) -> {
          JsonNode entry = value.get(key);
          if (entry == null) return;
          if (child instanceof Map && entry.isObject())
            result.set(key, project(entry, cast(child)));
          else if (child instanceof List && entry.isArray()) {
            var list = mapper.createArrayNode();
            for (JsonNode item : entry)
              if (item.isObject()) list.add(project(item, cast(((List<?>) child).get(0))));
            result.set(key, list);
          } else if (child == Leaf.ANY || child == Leaf.SCALAR && entry.isValueNode())
            result.set(key, entry);
        });
    return result;
  }

  @SuppressWarnings("unchecked")
  private static Map<String, Object> cast(Object value) {
    return (Map<String, Object>) value;
  }

  private enum Leaf {
    SCALAR,
    ANY
  }

  private static final Object S = Leaf.SCALAR, A = Leaf.ANY;

  private static Map<String, Object> fields(Object... pairs) {
    Map<String, Object> result = new LinkedHashMap<>();
    for (int i = 0; i < pairs.length; i += 2) result.put((String) pairs[i], pairs[i + 1]);
    return result;
  }

  private static Map<String, Object> ref() {
    return fields("id", S, "name", S);
  }

  private static Map<String, Object> port() {
    return fields("id", S, "type", S, "name", S, "title", S, "required", S, "description", S);
  }

  private static Map<String, Object> mapping() {
    return fields("mapping", List.of(fields("inputPort", port(), "outputPort", port())));
  }

  private static Map<String, Object> params() {
    return fields("id", S, "value", A);
  }

  private static Map<String, Object> basic() {
    return fields(
        "schemaVersion",
        S,
        "type",
        S,
        "indicator",
        fields("indicatorName", S, "type", S),
        "dataset",
        fields(
            "selectedLRSList",
            List.of(fields("id", S, "lrsId", S, "uniqueIdentifier", S, "lrsTitle", S))),
        "filters",
        fields(
            "selectedUserFilter",
            S,
            "selectedTime",
            fields("from", S, "until", S),
            "selectedActivities",
            List.of(
                fields(
                    "id",
                    S,
                    "selectedActivityType",
                    ref(),
                    "selectedActionList",
                    List.of(ref()),
                    "selectedActivityList",
                    List.of(fields("id", S, "name", S, "queryId", S))))),
        "analysis",
        fields(
            "selectedAnalyticsMethod",
            fields("method", ref(), "mapping", mapping()),
            "params",
            List.of(params())),
        "visualization",
        fields("selectedLibrary", ref(), "selectedType", ref(), "mapping", mapping(), "params", A),
        "lockedStep",
        fields(
            "dataset",
            step(),
            "filters",
            step(),
            "analysis",
            step(),
            "visualization",
            step(),
            "finalize",
            step()));
  }

  private static Map<String, Object> step() {
    return fields("locked", S, "openPanel", S, "step", S);
  }

  private static Map<String, Object> complex() {
    return fields(
        "schemaVersion",
        S,
        "type",
        S,
        "name",
        S,
        "sources",
        List.of(
            fields(
                "id",
                S,
                "name",
                S,
                "analyticsMethod",
                ref(),
                "outputs",
                List.of(port()),
                "keyColumnId",
                S,
                "measureColumnIds",
                A,
                "label",
                S,
                "filterSummary",
                A)),
        "analysis",
        fields("methodId", S, "mapping", mapping(), "params", List.of(params())),
        "visualization",
        fields("libraryId", S, "typeId", S, "mapping", mapping(), "params", A, "dataMode", S));
  }

  private static void check(JsonNode node, Map<String, Object> shape, boolean unused) {
    if (!node.isObject()) throw invalid();
    node.fields()
        .forEachRemaining(
            entry -> {
              Object expected = shape.get(entry.getKey());
              JsonNode value = entry.getValue();
              if (expected == null) throw invalid();
              if (value.isNull()) return;
              if (expected instanceof Map) check(value, cast(expected), false);
              else if (expected instanceof List) {
                if (!value.isArray()) throw invalid();
                for (JsonNode item : value) check(item, cast(((List<?>) expected).get(0)), false);
              } else if (expected == S && !value.isValueNode()) throw invalid();
            });
  }

  private static void bounded(JsonNode node, int depth, int[] count) {
    if (depth > 24
        || ++count[0] > 25000
        || node.isTextual() && node.textValue().length() > 65536
        || node.isNumber() && !Double.isFinite(node.doubleValue())) throw invalid();
    if (node.isObject())
      node.fields()
          .forEachRemaining(
              entry -> {
                if (entry.getKey().length() > 200
                    || entry.getKey().startsWith("$")
                    || entry.getKey().indexOf(0) >= 0) throw invalid();
                bounded(entry.getValue(), depth + 1, count);
              });
    else if (node.isArray()) for (JsonNode child : node) bounded(child, depth + 1, count);
  }

  public String hash(JsonNode value) {
    try {
      return HexFormat.of()
          .formatHex(
              MessageDigest.getInstance("SHA-256")
                  .digest(canonical(value).toString().getBytes(StandardCharsets.UTF_8)));
    } catch (java.security.NoSuchAlgorithmException error) {
      throw new IllegalStateException(error);
    }
  }

  private JsonNode canonical(JsonNode value) {
    if (value.isObject()) {
      ObjectNode sorted = mapper.createObjectNode();
      var keys = new TreeSet<String>();
      value.fieldNames().forEachRemaining(keys::add);
      keys.forEach(key -> sorted.set(key, canonical(value.get(key))));
      return sorted;
    }
    if (value.isArray()) {
      var array = mapper.createArrayNode();
      value.forEach(child -> array.add(canonical(child)));
      return array;
    }
    return value;
  }

  private static ValidationException invalid() {
    return new ValidationException(
        "INVALID_DRAFT_CONFIGURATION",
        "The draft must contain a supported, bounded editor configuration without catalogs, preview"
            + " data or generated code.");
  }
}
