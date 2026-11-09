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
    return collect(document, null);
  }

  public Set<String> collect(Document document, Set<String> wanted) {
    Set<String> values = new LinkedHashSet<>();
    walk(document, null, 0, new int[] {0}, values, wanted);
    return values;
  }

  private void walk(Object value, String field, int depth, int[] nodes, Set<String> values, Set<String> wanted) {
    if (depth > 48 || ++nodes[0] > 10000000) throw invalid();
    if (value == null) return;
    if (value instanceof DBRef) { Object id = ((DBRef) value).getId(); if (id != null) add(id.toString(), values, wanted); return; }
    if (value instanceof Map<?, ?>) {
      ((Map<?, ?>) value).forEach((key, child) -> {
        String name = String.valueOf(key);
        if (!"_pluginReferenceWrite".equals(name) && !"createdBy".equals(name) && !"_id".equals(name)) walk(child, name, depth + 1, nodes, values, wanted);
      });
    } else if (value instanceof Iterable<?>) {
      for (Object child : (Iterable<?>) value) walk(child, field, depth + 1, nodes, values, wanted);
    } else if (value instanceof String) {
      String text = (String) value;
      String trimmed = text.trim();
      if ("null".equals(trimmed) && JSON_FIELDS.contains(field)) return;
      add(text, values, wanted);
      if (!trimmed.isEmpty() && (JSON_FIELDS.contains(field) || trimmed.startsWith("{") || trimmed.startsWith("["))) {
        if (text.length() > 16 * 1024 * 1024) throw invalid();
        try (com.fasterxml.jackson.core.JsonParser parser = mapper.getFactory().createParser(text)) {
          int nesting = depth;
          com.fasterxml.jackson.core.JsonToken token;
          while ((token = parser.nextToken()) != null) {
            if (++nodes[0] > 10000000) throw invalid();
            if (token.isStructStart() && ++nesting > 48) throw invalid();
            if (token.isStructEnd()) nesting--;
            if (token == com.fasterxml.jackson.core.JsonToken.VALUE_STRING) walk(parser.getText(), parser.getCurrentName(), nesting + 1, nodes, values, wanted);
          }
        }
        catch (IOException e) { if (JSON_FIELDS.contains(field)) throw invalid(); }
        catch (StackOverflowError e) { throw invalid(); }
      }
    } else if (value instanceof org.bson.types.ObjectId) add(value.toString(), values, wanted);
  }

  private static void add(String value, Set<String> values, Set<String> wanted) { if (wanted == null || wanted.contains(value)) values.add(value); }

  private static ValidationException invalid() {
    return new ValidationException("PLUGIN_REFERENCE_DATA_INVALID", "A stored configuration contains unreadable or oversized JSON. Repair or discard that configuration before removing plugins.");
  }
}
