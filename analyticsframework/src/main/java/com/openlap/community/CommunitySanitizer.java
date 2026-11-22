package com.openlap.community;

import com.google.gson.*;
import com.openlap.analytics_module.entities.Indicator;
import com.openlap.user.entities.User;
import java.util.*;
import java.util.regex.Pattern;

/** Community responses are projections, never serialized owner entities or saved chart payloads. */
public final class CommunitySanitizer {
  private static final Gson JSON = new Gson();
  private static final int MAX_TEXT_LENGTH = 500;
  // Each identifier alternative has fixed width; contact detection uses literal scans below.
  private static final Pattern IDENTIFIER = Pattern.compile("(?i)(\\b[0-9a-f]{24}\\b|\\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\b)");
  private static final Set<String> ENUMS = Set.of("left", "right", "center", "top", "bottom", "horizontal", "vertical", "linear", "smooth", "stepline", "solid", "gradient", "light", "dark", "asc", "desc", "ascending", "descending", "none", "normal", "bold", "dashed", "dotted", "auto", "true", "false");
  private CommunitySanitizer() {}

  public static String text(String raw, User creator, String fallback) {
    // Reject oversized input before normalization, case folding or any regular expression.
    if (raw == null || raw.length() > MAX_TEXT_LENGTH || creator == null || raw.isBlank()) return fallback;
    String value = raw.strip().replaceAll("[\\p{Cntrl}]", " ").replaceAll("\\s+", " ");
    String lower = value.toLowerCase(Locale.ROOT);
    if (value.indexOf('@') >= 0 || value.indexOf('<') >= 0 || value.indexOf('>') >= 0
        || lower.contains("http://") || lower.contains("https://") || lower.contains("www.")
        || lower.contains("mailto:") || IDENTIFIER.matcher(value).find()) return fallback;
    List<String> identifiers = new ArrayList<>();
    identifiers.add(creator.getId()); identifiers.add(creator.getEmail());
    if (creator.getName() != null) {
      identifiers.add(creator.getName());
      identifiers.addAll(Arrays.asList(creator.getName().split("[^\\p{L}\\p{N}]+")));
    }
    if (creator.getLrsConsumerList() != null) creator.getLrsConsumerList().forEach(connection -> {
      if (connection != null) { identifiers.add(connection.getUniqueIdentifier()); identifiers.add(connection.getLrsId()); }
    });
    for (String identifier : identifiers) if (identifier != null && !identifier.isBlank()) {
      String needle = identifier.toLowerCase(Locale.ROOT);
      if (lower.equals(needle) || (needle.length() > 2 && lower.contains(needle))
          || (needle.length() == 2 && Pattern.compile("(?i)(?<![\\p{L}\\p{N}])" + Pattern.quote(needle) + "(?![\\p{L}\\p{N}])").matcher(value).find())) return fallback;
    }
    return value;
  }

  public static String publicName(Indicator source) {
    String fallback = switch (source.getIndicatorType() == null ? "" : source.getIndicatorType().name()) {
      case "COMPOSITE" -> "Combined learning activity";
      case "MULTI_LEVEL" -> "Multilevel learning analysis";
      default -> "Learning activity indicator";
    };
    return text(source.getName(), source.getCreatedBy(), fallback);
  }

  public static Object visualizationParams(Indicator source) {
    var reference = source.getVisualizationTechniqueReference();
    if (reference == null) return Map.of();
    JsonElement values = parse(reference.getAdditionalParams());
    var chart = reference.getVisType();
    var descriptor = chart == null ? null : chart.getVisualizationDescriptor();
    if (values.isJsonObject() && descriptor != null && descriptor.get("customizations") instanceof List<?> controls) {
      for (Object item : controls) {
        if (item instanceof Map<?, ?> control && control.get("id") instanceof String id
            && ("categoryFilter".equals(control.get("type")) || "seriesColors".equals(control.get("type")))) {
          values.getAsJsonObject().remove(id);
        }
      }
    }
    return safeStyle(values);
  }

  /** Retains numbers, booleans, colors and known style enums; drops arbitrary labels/links/code. */
  public static Object safeStyle(JsonElement value) {
    return style(value, 0);
  }

  private static Object style(JsonElement value, int depth) {
    if (value == null || value.isJsonNull() || depth > 8) return Map.of();
    if (value.isJsonPrimitive()) {
      JsonPrimitive item = value.getAsJsonPrimitive();
      if (item.isBoolean()) return item.getAsBoolean();
      if (item.isNumber()) {
        double number = item.getAsDouble();
        return Double.isFinite(number) && Math.abs(number) < 1e9 ? item.getAsNumber() : null;
      }
      String string = item.getAsString();
      return string.matches("#[0-9a-fA-F]{3,8}") || ENUMS.contains(string.toLowerCase(Locale.ROOT)) ? string : null;
    }
    if (value.isJsonArray()) {
      List<Object> output = new ArrayList<>();
      for (JsonElement item : value.getAsJsonArray()) {
        if (output.size() >= 100) break;
        Object clean = style(item, depth + 1); if (clean != null) output.add(clean);
      }
      return output;
    }
    Map<String, Object> output = new LinkedHashMap<>();
    for (var item : value.getAsJsonObject().entrySet()) {
      String key = item.getKey();
      if (!key.matches("[A-Za-z][A-Za-z0-9_]{0,60}")
          || key.toLowerCase(Locale.ROOT).matches(".*(title|subtitle|annotation|formatter|callback|event|url|link|html|script|label|categor|series|name|text|identifier|user|email).*")) continue;
      Object clean = style(item.getValue(), depth + 1); if (clean != null) output.put(key, clean);
    }
    return output;
  }

  public static JsonElement parse(String raw) {
    try { return raw != null && raw.length() <= 2_000_000 ? JsonParser.parseString(raw) : new JsonObject(); }
    catch (RuntimeException error) { return new JsonObject(); }
  }

  public static String string(JsonElement value, String key) {
    try { JsonElement field = value.getAsJsonObject().get(key); return field != null && field.isJsonPrimitive() ? field.getAsString() : ""; }
    catch (RuntimeException error) { return ""; }
  }

  public static JsonObject object(JsonElement value) {
    return value != null && value.isJsonObject() ? value.getAsJsonObject() : new JsonObject();
  }

  public static String json(Object value) { return JSON.toJson(value); }
}
