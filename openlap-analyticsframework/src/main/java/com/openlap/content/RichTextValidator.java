package com.openlap.content;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Validates a deliberately small ProseMirror/Tiptap schema and returns only safe attributes. */
public final class RichTextValidator {
  private static final List<String> BLOCKS = Arrays.asList("paragraph", "bulletList", "orderedList");
  private static final List<String> MARKS = Arrays.asList("bold", "italic", "underline", "link");
  private static final int MAX_DEPTH = 12;
  private static final int MAX_NODES = 2000;
  private static final int MAX_TEXT = 30000;

  public Map<String, Object> validate(Map<?, ?> document, boolean publishing) {
    Budget budget = new Budget();
    Map<String, Object> canonical = node(document, null, 1, budget);
    if (publishing && !budget.hasText) throw invalid("Enter news content.");
    return canonical;
  }

  private Map<String, Object> node(Map<?, ?> input, String parent, int depth, Budget budget) {
    if (depth > MAX_DEPTH) throw invalid("Use fewer nested lists (maximum content depth is 12).");
    if (++budget.nodes > MAX_NODES) throw invalid("Use 2000 content nodes or fewer.");
    Object rawType = input.get("type");
    if (!(rawType instanceof String)) throw invalid("Each content node needs a supported type.");
    String type = (String) rawType;
    if (parent == null && !"doc".equals(type)) throw invalid("News content must be a document.");
    if (parent != null && !allowedChild(parent, type)) throw invalid("This content structure is not supported.");

    Map<String, Object> output = new LinkedHashMap<>();
    output.put("type", type);
    if ("text".equals(type)) {
      keys(input, "type", "text", "marks");
      Object text = input.get("text");
      if (!(text instanceof String) || ((String) text).isEmpty()) throw invalid("Text nodes must contain text.");
      String value = (String) text;
      budget.text += value.length();
      if (budget.text > MAX_TEXT) throw invalid("Use 30000 characters or fewer.");
      budget.hasText |= !value.trim().isEmpty();
      output.put("text", value);
      if (input.containsKey("marks")) {
        List<Map<String, Object>> marks = marks(input.get("marks"));
        if (!marks.isEmpty()) output.put("marks", marks);
      }
      return output;
    }
    if ("hardBreak".equals(type)) {
      keys(input, "type");
      if (++budget.text > MAX_TEXT) throw invalid("Use 30000 characters or fewer.");
      return output;
    }
    if (!"doc".equals(type) && !"listItem".equals(type) && !BLOCKS.contains(type)) {
      throw invalid("This content type is not supported.");
    }
    keys(input, "type", "content", "attrs");
    Map<?, ?> attrs = attributes(input.get("attrs"));
    if ("orderedList".equals(type)) {
      keys(attrs, "start", "type");
      if (attrs.get("type") != null) throw invalid("Ordered list styles are not supported.");
      Object start = attrs.get("start");
      long number = 1;
      if (start != null) {
        if (!(start instanceof Integer) && !(start instanceof Long)) throw invalid("List numbering must start at a whole number from 1 to 100000.");
        number = ((Number) start).longValue();
        if (number < 1 || number > 100000) throw invalid("List numbering must start at a whole number from 1 to 100000.");
      }
      output.put("attrs", Collections.singletonMap("start", (int) number));
    } else if (!attrs.isEmpty()) throw invalid("Content attributes are not supported for this node.");

    Object rawContent = input.get("content");
    if (rawContent != null && !(rawContent instanceof List)) throw invalid("Content nodes must contain a list of children.");
    List<?> children = rawContent == null ? Collections.emptyList() : (List<?>) rawContent;
    if ("doc".equals(type) && children.isEmpty()) {
      children = Collections.singletonList(Collections.singletonMap("type", "paragraph"));
    }
    if (!"paragraph".equals(type) && children.isEmpty()) throw invalid("Documents and lists must contain content.");
    List<Map<String, Object>> result = new ArrayList<>();
    for (Object child : children) {
      if (!(child instanceof Map)) throw invalid("Each child must be a content node.");
      result.add(node((Map<?, ?>) child, type, depth + 1, budget));
    }
    if ("listItem".equals(type) && !"paragraph".equals(result.get(0).get("type"))) {
      throw invalid("Each list item must start with a paragraph.");
    }
    if (!result.isEmpty()) output.put("content", result);
    return output;
  }

  private boolean allowedChild(String parent, String child) {
    if ("doc".equals(parent) || "listItem".equals(parent)) return BLOCKS.contains(child);
    if ("paragraph".equals(parent)) return "text".equals(child) || "hardBreak".equals(child);
    if ("bulletList".equals(parent) || "orderedList".equals(parent)) return "listItem".equals(child);
    return false;
  }

  private List<Map<String, Object>> marks(Object rawMarks) {
    if (!(rawMarks instanceof List) || ((List<?>) rawMarks).size() > MARKS.size()) {
      throw invalid("Choose bold, italic, underline, or link formatting.");
    }
    List<Map<String, Object>> result = new ArrayList<>();
    Set<String> seen = new HashSet<>();
    for (Object raw : (List<?>) rawMarks) {
      if (!(raw instanceof Map)) throw invalid("Text formatting must use supported marks.");
      Map<?, ?> mark = (Map<?, ?>) raw;
      keys(mark, "type", "attrs");
      Object rawType = mark.get("type");
      if (!(rawType instanceof String) || !MARKS.contains(rawType) || !seen.add((String) rawType)) {
        throw invalid("Choose unique bold, italic, underline, or link formatting.");
      }
      String type = (String) rawType;
      Map<String, Object> canonical = new LinkedHashMap<>();
      canonical.put("type", type);
      Map<?, ?> attrs = attributes(mark.get("attrs"));
      if ("link".equals(type)) {
        keys(attrs, "href", "target", "rel", "class");
        Object href = attrs.get("href");
        if (!(href instanceof String) || ((String) href).length() > 2048 || !ContentValidator.validUrl((String) href)) {
          throw invalid("Each link needs a complete http:// or https:// URL without embedded credentials.");
        }
        for (String metadata : Arrays.asList("target", "rel", "class")) {
          Object value = attrs.get(metadata);
          if (value != null && !(value instanceof String)) throw invalid("Unsupported link metadata.");
        }
        canonical.put("attrs", Collections.singletonMap("href", href));
      } else if (!attrs.isEmpty()) throw invalid("Only links support formatting attributes.");
      result.add(canonical);
    }
    result.sort(Comparator.comparingInt(mark -> MARKS.indexOf(mark.get("type"))));
    return result;
  }

  private Map<?, ?> attributes(Object value) {
    if (value == null) return Collections.emptyMap();
    if (!(value instanceof Map)) throw invalid("Content attributes must be an object.");
    return (Map<?, ?>) value;
  }

  private void keys(Map<?, ?> input, String... supported) {
    List<String> allowed = Arrays.asList(supported);
    for (Object key : input.keySet()) if (!allowed.contains(key)) throw invalid("This content contains unsupported fields or attributes.");
  }

  private IllegalArgumentException invalid(String message) { return new IllegalArgumentException(message); }

  private static final class Budget {
    private int nodes;
    private int text;
    private boolean hasText;
  }
}
