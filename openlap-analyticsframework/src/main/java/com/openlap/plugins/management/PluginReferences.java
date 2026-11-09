package com.openlap.plugins.management;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mongodb.DBRef;
import com.openlap.infrastructure.exception.ValidationException;
import java.io.IOException;
import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import org.bson.Document;

/** Reads both DBRefs and nested JSON snapshots without dereferencing or exposing user content. */
public final class PluginReferences {
  public static final Set<String> COLLECTIONS = new HashSet<>(Arrays.asList(
      "analytics-indicator", "analytics-indicator-drafts", "openlap-isc", "plugin-installation"));
  private static final Set<String> JSON_FIELDS = new HashSet<>(Arrays.asList(
      "session", "configurationRequest", "requirements", "dataset", "visRef", "lockedStep"));
  private final ObjectMapper mapper = new ObjectMapper();

  public Set<String> collect(Document document) {
    Set<String> values = new LinkedHashSet<>();
    walk(document, null, 0, new int[] {0}, values);
    return values;
  }

  private void walk(Object value, String field, int depth, int[] nodes, Set<String> values) {
    if (depth > 48 || ++nodes[0] > 150000) throw invalid();
    if (value == null) return;
    if (value instanceof DBRef) { Object id = ((DBRef) value).getId(); if (id != null) values.add(id.toString()); return; }
    if (value instanceof Map<?, ?>) {
      ((Map<?, ?>) value).forEach((key, child) -> {
        String name = String.valueOf(key);
        if (!"_pluginReferenceWrite".equals(name) && !"createdBy".equals(name) && !"_id".equals(name)) walk(child, name, depth + 1, nodes, values);
      });
    } else if (value instanceof Iterable<?>) {
      for (Object child : (Iterable<?>) value) walk(child, field, depth + 1, nodes, values);
    } else if (value instanceof String) {
      String text = (String) value;
      String trimmed = text.trim();
      if ("null".equals(trimmed) && JSON_FIELDS.contains(field)) return;
      values.add(text);
      if (!trimmed.isEmpty() && (JSON_FIELDS.contains(field) || trimmed.startsWith("{") || trimmed.startsWith("["))) {
        if (text.length() > 8 * 1024 * 1024) throw invalid();
        try { walk(mapper.readValue(text, Object.class), null, depth + 1, nodes, values); }
        catch (IOException e) { if (JSON_FIELDS.contains(field)) throw invalid(); }
        catch (StackOverflowError e) { throw invalid(); }
      }
    } else if (value instanceof org.bson.types.ObjectId) values.add(value.toString());
  }

  private static ValidationException invalid() {
    return new ValidationException("PLUGIN_REFERENCE_DATA_INVALID", "A stored configuration contains unreadable or oversized JSON. Repair or discard that configuration before removing plugins.");
  }
}
