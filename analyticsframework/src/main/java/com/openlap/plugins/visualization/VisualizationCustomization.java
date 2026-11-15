package com.openlap.plugins.visualization;

import java.util.*;
import org.bson.Document;

/** Values use stable plugin keys; executable UI expressions and unknown parameters are not accepted. */
public final class VisualizationCustomization {
  private VisualizationCustomization() {}

  public static Map<String, Object> validate(Document descriptor, Map<String, Object> supplied) {
    if (descriptor == null) return supplied;
    List<?> controls = (List<?>) descriptor.getOrDefault("customizations", List.of());
    Map<String, Object> result = new LinkedHashMap<>(); Set<String> allowed = new HashSet<>(Set.of("width", "height"));
    Map<String, Object> values = new LinkedHashMap<>();
    for (Object item : controls) {
      Map<String,Object> control = (Map<String,Object>)item;
      String id = (String)control.get("id");
      values.put(id, supplied != null && supplied.get(id) != null ? supplied.get(id) : control.get("defaultValue"));
    }
    for (Object item : controls) {
      Document control = new Document((Map<String,Object>) item);
      String id = control.getString("id"); allowed.add(id);
      if (control.get("visibleWhen") instanceof Map) {
        Map<?,?> condition = (Map<?,?>)control.get("visibleWhen");
        if (!equalValue(values.get(condition.get("id")),condition.get("equals"))) continue;
      }
      Object value = supplied == null ? null : supplied.get(id);
      if (value == null && control.containsKey("defaultValue")) value = control.get("defaultValue");
      if (value != null) { validateValue(control,value); result.put(id,value); }
    }
    if (supplied != null) for (Map.Entry<String,Object> entry : supplied.entrySet()) {
      if (!allowed.contains(entry.getKey())) throw VisualizationManifest.invalid("Unknown chart customization: " + entry.getKey() + ".");
      // A declared field owns its semantics, including percentage dimensions.
      // The implicit numeric layout contract applies only to undeclared keys.
      if (("width".equals(entry.getKey()) || "height".equals(entry.getKey()))
          && !values.containsKey(entry.getKey())) {
        Object value = entry.getValue();
        if (!(value instanceof Number) || !Double.isFinite(((Number)value).doubleValue()) || ((Number)value).doubleValue() <= 0 || ((Number)value).doubleValue() > 10000) throw VisualizationManifest.invalid("Chart dimensions must be positive numbers no larger than 10000.");
        result.put(entry.getKey(), value);
      }
    }
    return result;
  }

  private static boolean equalValue(Object left, Object right) {
    return Objects.equals(left,right) || left instanceof Number && right instanceof Number &&
        ((Number)left).doubleValue() == ((Number)right).doubleValue();
  }

  static void validateValue(Document control, Object value) {
    String type = control.getString("type"); boolean valid;
    switch (type) {
      case "boolean": valid = value instanceof Boolean; break;
      case "number":
        valid = value instanceof Number && Double.isFinite(((Number)value).doubleValue());
        if (valid) {
          double number = ((Number)value).doubleValue();
          valid = (!control.containsKey("min") || number >= ((Number)control.get("min")).doubleValue()) && (!control.containsKey("max") || number <= ((Number)control.get("max")).doubleValue());
          if (valid && control.containsKey("step")) {
            double base = control.containsKey("min") ? ((Number)control.get("min")).doubleValue() : 0;
            double steps = (number - base) / ((Number)control.get("step")).doubleValue();
            valid = Math.abs(steps - Math.rint(steps)) <= 1e-8;
          }
        }
        break;
      case "color": valid = value instanceof String && ((String)value).matches("#[a-fA-F0-9]{6}"); break;
      case "select": valid = ((List<?>)control.getOrDefault("options", List.of())).stream().map(item -> (Map<?,?>)item).anyMatch(option -> equalValue(option.get("value"),value)); break;
      default: valid = value instanceof String && ((String)value).length() <= 10000 && ((String)value).indexOf('\0') < 0;
    }
    if (!valid) throw VisualizationManifest.invalid("Invalid value for chart customization: " + control.getString("label") + ".");
  }
}
