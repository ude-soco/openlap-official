package com.openlap.plugins.analytics;

import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.core.StreamReadConstraints;
import com.fasterxml.jackson.core.StreamReadFeature;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.openlap.dataset.OpenLAPColumnConfigData;
import com.openlap.dataset.OpenLAPColumnDataType;
import com.openlap.infrastructure.exception.ValidationException;
import com.openlap.template.AnalyticsMethod;
import java.io.IOException;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.jar.JarFile;
import org.bson.Document;

/** Optional advice about how OpenLAP presents methods whose executable contracts remain in Java. */
public final class AnalyticsManifest {
  public static final String RESOURCE = "META-INF/openlap/analytics.json";
  private static final int MAX_BYTES = 128 * 1024;
  private static final int MAX_ENTRIES = 64;
  private static final Set<String> INPUT_ROLES = Set.of("EVENTS", "CATEGORY", "TIMESTAMP", "SCORE", "OUTCOME");
  private static final Set<String> OUTPUT_ROLES = Set.of("X", "Y", "LABEL", "CLUSTER");
  private static final Set<String> DIAGNOSTIC_KINDS = Set.of("INCLUDED", "EXCLUDED", "UNGROUPED");
  private static final ObjectMapper JSON = new ObjectMapper(JsonFactory.builder()
      .streamReadConstraints(StreamReadConstraints.builder().maxNestingDepth(12).maxStringLength(1024).build())
      .enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION).build())
      .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS);

  private final Map<String, JsonNode> methods;

  private AnalyticsManifest(Map<String, JsonNode> methods) {
    this.methods = Map.copyOf(methods);
  }

  public static AnalyticsManifest read(JarFile archive, List<String> discoveredClasses) throws IOException {
    var resource = archive.getJarEntry(RESOURCE);
    if (resource == null) return new AnalyticsManifest(Map.of());
    if (resource.isDirectory() || resource.getSize() > MAX_BYTES) throw invalid("The analytics manifest exceeds 128 KiB.");
    try (var input = archive.getInputStream(resource)) {
      byte[] bytes = input.readNBytes(MAX_BYTES + 1);
      if (bytes.length > MAX_BYTES) throw invalid("The analytics manifest exceeds 128 KiB.");
      JsonNode manifest = JSON.readTree(bytes);
      fields(manifest, "schemaVersion", "methods");
      if (!manifest.path("schemaVersion").isIntegralNumber() || !manifest.path("schemaVersion").canConvertToInt()
          || manifest.path("schemaVersion").intValue() != 1) throw invalid("Unsupported analytics manifest version.");
      JsonNode methods = manifest.path("methods");
      if (!methods.isArray() || methods.size() > MAX_ENTRIES) throw invalid("Declare at most 64 analytics methods in the manifest.");
      Map<String, JsonNode> entries = new LinkedHashMap<>();
      for (JsonNode method : methods) {
        fields(method, "className", "recommendedFor", "inputRoles", "outputHints");
        JsonNode className = method.path("className");
        if (!className.isTextual() || !discoveredClasses.contains(className.textValue())
            || entries.putIfAbsent(className.textValue(), method) != null) {
          throw invalid("Manifest methods must identify unique, discovered analytics classes.");
        }
        checkRecommendations(method);
        checkPorts(method, "inputRoles");
        checkPorts(method, "outputHints");
      }
      return new AnalyticsManifest(entries);
    } catch (com.fasterxml.jackson.core.JsonProcessingException error) {
      throw invalid("The analytics manifest must contain a valid JSON object with unique keys.");
    }
  }

  public boolean hasMetadata(String className) {
    return methods.containsKey(className);
  }

  /** Validate references against the actual initialized Java contract before saving metadata. */
  public Document metadata(String className, AnalyticsMethod method) {
    JsonNode descriptor = methods.get(className);
    if (descriptor == null) return null;
    Map<String, OpenLAPColumnConfigData> inputs = index(method.getInputPorts());
    Map<String, OpenLAPColumnConfigData> outputs = index(method.getOutputPorts());
    var inputRoles = descriptor.path("inputRoles");
    inputRoles.fields().forEachRemaining(entry -> {
      var input = inputs.get(entry.getKey());
      OpenLAPColumnDataType expected = switch (entry.getValue().textValue()) {
        case "SCORE" -> OpenLAPColumnDataType.Numeric;
        case "OUTCOME" -> OpenLAPColumnDataType.TrueFalse;
        default -> OpenLAPColumnDataType.Text;
      };
      if (input == null || input.getType() != expected) {
        throw invalid("An analytics input role must reference a declared input with the matching data type.");
      }
    });
    var outputHints = descriptor.path("outputHints");
    outputHints.fields().forEachRemaining(entry -> {
      var output = outputs.get(entry.getKey());
      if (output == null) throw invalid("An analytics output hint must reference a declared output.");
      JsonNode hint = entry.getValue();
      String role = hint.path("role").asText();
      if ((hint.path("primary").asBoolean() || hint.has("format") || hint.has("diagnostic") || "X".equals(role) || "Y".equals(role))
          && output.getType() != OpenLAPColumnDataType.Numeric) throw invalid("Analytics measures, percentages, axes and diagnostics require numeric outputs.");
      if (("LABEL".equals(role) || "CLUSTER".equals(role)) && output.getType() != OpenLAPColumnDataType.Text) {
        throw invalid("Analytics labels and clusters require text outputs.");
      }
      requireInputReference(hint, "labelFromInput", inputs);
      requireInputReference(hint.path("diagnostic"), "input", inputs);
    });
    Document metadata = Document.parse(descriptor.toString());
    metadata.remove("className");
    List<String> requiredRoles = requiredBasicRoles(descriptor, inputs);
    if (!requiredRoles.isEmpty()) metadata.put("requiredInputRoles", requiredRoles);
    String requirement = basicRequirement(requiredRoles);
    if (requirement != null) metadata.put("basicInputRequirement", requirement);
    return metadata;
  }

  private static List<String> requiredBasicRoles(JsonNode descriptor, Map<String, OpenLAPColumnConfigData> inputs) {
    JsonNode recommended = descriptor.path("recommendedFor");
    if (recommended.size() > 0) {
      boolean basic = false;
      for (JsonNode indicator : recommended) basic |= "BASIC".equals(indicator.textValue());
      if (!basic) return List.of();
    }
    List<String> requiredRoles = inputs.values().stream().filter(OpenLAPColumnConfigData::isRequired)
        .map(input -> descriptor.path("inputRoles").path(input.getId()).textValue()).toList();
    if (requiredRoles.stream().anyMatch(java.util.Objects::isNull)) return List.of();
    return requiredRoles.stream().distinct().sorted().toList();
  }

  private static String basicRequirement(List<String> requiredRoles) {
    if (requiredRoles.size() == 1) return requiredRoles.get(0);
    if (requiredRoles.size() == 2 && requiredRoles.contains("SCORE") && requiredRoles.contains("CATEGORY")) {
      return "SCORE_AND_CATEGORY";
    }
    return null;
  }

  private static Map<String, OpenLAPColumnConfigData> index(List<OpenLAPColumnConfigData> ports) {
    Map<String, OpenLAPColumnConfigData> indexed = new LinkedHashMap<>();
    if (ports == null) throw invalid("Initialize the declared analytics ports before supplying a manifest.");
    for (OpenLAPColumnConfigData port : ports) {
      if (port == null || port.getId() == null || indexed.putIfAbsent(port.getId(), port) != null) {
        throw invalid("Analytics ports must have unique identifiers to use a manifest.");
      }
    }
    return indexed;
  }

  private static void checkRecommendations(JsonNode method) {
    if (!method.has("recommendedFor")) return;
    JsonNode recommended = method.path("recommendedFor");
    Set<String> seen = new HashSet<>();
    if (!recommended.isArray() || recommended.size() > 2) throw invalid("Analytics recommendations may list BASIC and MULTI_LEVEL.");
    for (JsonNode indicator : recommended) {
      String value = enumValue(indicator, Set.of("BASIC", "MULTI_LEVEL"));
      if (!seen.add(value)) throw invalid("List each recommended indicator type only once.");
    }
  }

  private static void checkPorts(JsonNode method, String field) {
    if (!method.has(field)) return;
    JsonNode ports = method.path(field);
    if (!ports.isObject() || ports.size() > MAX_ENTRIES) throw invalid("Manifest input and output hints must be objects of at most 64 ports.");
    Set<String> outputRoles = new HashSet<>();
    ports.fields().forEachRemaining(entry -> {
      requirePortId(entry.getKey());
      JsonNode value = entry.getValue();
      if ("inputRoles".equals(field)) {
        enumValue(value, INPUT_ROLES);
      } else {
        fields(value, "primary", "format", "role", "labelFromInput", "diagnostic");
        if (value.has("primary") && !value.path("primary").isBoolean()) throw invalid("The primary output hint must be true or false.");
        if (value.has("format")) enumValue(value.path("format"), Set.of("PERCENTAGE"));
        if (value.has("role") && !outputRoles.add(enumValue(value.path("role"), OUTPUT_ROLES))) {
          throw invalid("Declare each analytics output role only once per method.");
        }
        checkInputReference(value, "labelFromInput");
        if (value.has("diagnostic")) {
          JsonNode diagnostic = value.path("diagnostic");
          fields(diagnostic, "kind", "aggregation", "input", "summaryOnly");
          enumValue(diagnostic.path("kind"), DIAGNOSTIC_KINDS);
          enumValue(diagnostic.path("aggregation"), Set.of("ONCE", "SUM"));
          checkInputReference(diagnostic, "input");
          if (diagnostic.has("summaryOnly") && !diagnostic.path("summaryOnly").isBoolean()) {
            throw invalid("The diagnostic summaryOnly option must be true or false.");
          }
        }
      }
    });
  }

  private static void checkInputReference(JsonNode hint, String field) {
    if (hint.has(field)) requirePortId(hint.path(field).textValue());
  }

  private static void requireInputReference(JsonNode hint, String field, Map<String, OpenLAPColumnConfigData> inputs) {
    if (hint.has(field) && !inputs.containsKey(hint.path(field).textValue())) {
      throw invalid("Analytics labels and diagnostics must reference declared inputs.");
    }
  }

  private static void requirePortId(String id) {
    if (id == null || id.isBlank() || id.length() > 300 || id.startsWith("$") || id.chars().anyMatch(Character::isISOControl)
        || Set.of("__proto__", "constructor", "prototype").contains(id)) throw invalid("Invalid analytics manifest port identifier.");
  }

  private static String enumValue(JsonNode value, Set<String> choices) {
    if (!value.isTextual() || !choices.contains(value.textValue())) throw invalid("Unsupported analytics manifest role, format or option.");
    return value.textValue();
  }

  private static void fields(JsonNode object, String... names) {
    Set<String> allowed = Set.of(names);
    if (object == null || !object.isObject()) throw invalid("Analytics manifest entries must be objects.");
    object.fieldNames().forEachRemaining(field -> {
      if (!allowed.contains(field)) throw invalid("The analytics manifest contains an unknown field.");
    });
  }

  private static ValidationException invalid(String message) {
    return new ValidationException("INVALID_ANALYTICS_MANIFEST", message);
  }
}
