package com.openlap.visualization_methods.compatibility;

import com.google.gson.Gson;
import com.openlap.infrastructure.exception.ValidationException;
import java.util.List;

/** Small structural editor for the reviewed legacy templates, not a general JavaScript parser. */
final class LegacyChartOptions {
  private static final Gson JSON = new Gson();
  private LegacyChartOptions() {}

  private record Range(int start, int end) {}

  static String replace(String code, String marker, String property, Object value) {
    int root = root(code, marker);
    Range existing = property(code, root, property);
    return code.substring(0, existing.start()) + JSON.toJson(value) + code.substring(existing.end() + 1);
  }

  static String append(String code, String marker, List<String> path, String property, Object value) {
    int object = root(code, marker);
    for (String step : path) {
      Range nested = property(code, object, step);
      if (code.charAt(nested.start()) != '{') throw invalid();
      object = nested.start();
    }
    int end = matching(code, object);
    String body = code.substring(object + 1, end).trim();
    String separator = body.isEmpty() || body.endsWith(",") ? "" : ",";
    return code.substring(0, end) + separator + JSON.toJson(property) + ":" + JSON.toJson(value) + code.substring(end);
  }

  private static int root(String code, String marker) {
    int call = code.indexOf(marker);
    int root = call < 0 ? -1 : code.indexOf('{', call + marker.length());
    if (root < 0) throw invalid();
    return root;
  }

  private static Range property(String code, int object, String name) {
    int depth = 1;
    int arrays = 0;
    for (int index = object + 1; index < code.length(); index++) {
      char c = code.charAt(index);
      if (c == '\'' || c == '"') { index = quoteEnd(code, index); continue; }
      if (c == '{') depth++;
      else if (c == '}' && --depth == 0) break;
      else if (c == '[') arrays++;
      else if (c == ']') arrays--;
      else if (depth == 1 && arrays == 0 && code.startsWith(name, index)
          && !Character.isJavaIdentifierPart(code.charAt(index - 1))) {
        int colon = index + name.length();
        while (colon < code.length() && Character.isWhitespace(code.charAt(colon))) colon++;
        if (colon >= code.length() || code.charAt(colon) != ':') continue;
        int start = colon + 1;
        while (start < code.length() && Character.isWhitespace(code.charAt(start))) start++;
        if (start >= code.length() || code.charAt(start) != '{' && code.charAt(start) != '[') throw invalid();
        return new Range(start, matching(code, start));
      }
    }
    throw invalid();
  }

  private static int matching(String code, int start) {
    char open = code.charAt(start);
    char close = open == '{' ? '}' : ']';
    int depth = 0;
    for (int index = start; index < code.length(); index++) {
      char c = code.charAt(index);
      if (c == '\'' || c == '"') { index = quoteEnd(code, index); continue; }
      if (c == open) depth++;
      else if (c == close && --depth == 0) return index;
    }
    throw invalid();
  }

  private static int quoteEnd(String code, int start) {
    char quote = code.charAt(start);
    for (int index = start + 1; index < code.length(); index++) {
      if (code.charAt(index) == '\\') index++;
      else if (code.charAt(index) == quote) return index;
    }
    throw invalid();
  }

  private static ValidationException invalid() {
    return new ValidationException("UNSUPPORTED_LEGACY_CHART_STRUCTURE",
        "The historical chart generator returned an unsupported options structure.");
  }
}
