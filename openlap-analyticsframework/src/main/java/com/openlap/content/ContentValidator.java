package com.openlap.content;

import com.openlap.infrastructure.exception.ValidationException;
import java.net.URI;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

/** Accepts only the content schema, never Mongo operators or arbitrary HTML. */
@Component
public class ContentValidator {
  private static final List<String> PUBLICATION_TYPES =
      Arrays.asList("Journal", "Conference", "Workshop", "Book chapter");

  public Map<String, Object> validate(ContentKind kind, Map<String, Object> input, boolean publishing) {
    Map<String, Object> errors = new LinkedHashMap<>();
    Map<String, Object> result = new LinkedHashMap<>();
    if (input == null) {
      fail(Collections.singletonMap("draft", "Enter content to save."));
    }
    text(input, result, errors, "title", 300, true);
    if (kind == ContentKind.NEWS) {
      text(input, result, errors, "date", 10, publishing);
      String date = (String) result.get("date");
      if (date != null && !date.isEmpty()) {
        try {
          if (!date.matches("\\d{4}-\\d{2}-\\d{2}")) throw new DateTimeParseException("date", date, 0);
          LocalDate.parse(date);
        } catch (DateTimeParseException e) { errors.put("date", "Choose a valid date."); }
      }
      text(input, result, errors, "venue", 1000, false);
      body(input.get("body"), result, errors, publishing);
    } else {
      text(input, result, errors, "authors", 2000, publishing);
      text(input, result, errors, "venue", 2000, publishing);
      Object year = input.get("year");
      if (year instanceof Integer || year instanceof Long) year = year.toString();
      Map<String, Object> withYear = new LinkedHashMap<>(input);
      withYear.put("year", year);
      text(withYear, result, errors, "year", 4, publishing);
      if (result.containsKey("year") && !result.get("year").toString().isEmpty()
          && !result.get("year").toString().matches("[12]\\d{3}")) {
        errors.put("year", "Enter a four-digit year from 1000 to 2999.");
      }
      text(input, result, errors, "type", 40, publishing);
      if (result.containsKey("type") && !result.get("type").toString().isEmpty()
          && !PUBLICATION_TYPES.contains(result.get("type"))) {
        errors.put("type", "Choose Journal, Conference, Workshop, or Book chapter.");
      }
      url(input, result, errors, "pdfLink");
      url(input, result, errors, "details");
    }
    List<String> allowed = kind == ContentKind.NEWS
        ? Arrays.asList("title", "date", "body", "venue")
        : Arrays.asList("title", "authors", "year", "type", "venue", "pdfLink", "details");
    for (String field : input.keySet()) {
      if (!allowed.contains(field)) errors.put(field, "This field is not supported.");
    }
    if (!errors.isEmpty()) fail(errors);
    return result;
  }

  private void text(Map<String, Object> input, Map<String, Object> result,
      Map<String, Object> errors, String field, int max, boolean required) {
    Object value = input.get(field);
    if (value == null) {
      if (required) errors.put(field, "This field is required.");
    } else if (!(value instanceof String)) {
      errors.put(field, "Enter text.");
    } else {
      String string = ((String) value).trim();
      result.put(field, string);
      if (required && string.isEmpty()) errors.put(field, "This field is required.");
      if (string.length() > max) errors.put(field, "Use " + max + " characters or fewer.");
    }
  }

  private void url(Map<String, Object> input, Map<String, Object> result,
      Map<String, Object> errors, String field) {
    text(input, result, errors, field, 2048, false);
    Object value = result.get(field);
    if (value != null && !value.toString().isEmpty() && !validUrl(value.toString())) {
      errors.put(field, "Enter a complete http:// or https:// URL.");
    }
  }

  public static boolean validUrl(String value) {
    try {
      URI uri = URI.create(value);
      return ("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))
          && uri.getHost() != null && !uri.getHost().isEmpty() && uri.getUserInfo() == null;
    } catch (IllegalArgumentException e) { return false; }
  }

  private void body(Object value, Map<String, Object> result, Map<String, Object> errors, boolean required) {
    if (value == null) {
      if (required) errors.put("body", "Enter news content.");
      return;
    }
    if (value instanceof Map) {
      try {
        result.put("body", new RichTextValidator().validate((Map<?, ?>) value, required));
      } catch (IllegalArgumentException e) {
        errors.put("body", e.getMessage());
      }
      return;
    }
    if (!(value instanceof List) || ((List<?>) value).size() > 500) {
      errors.put("body", "Enter rich-text content or up to 500 text and link parts.");
      return;
    }
    List<Object> body = new ArrayList<>();
    int length = 0;
    boolean hasText = false;
    for (Object part : (List<?>) value) {
      if (part instanceof String) {
        body.add(part);
        length += ((String) part).length();
        hasText |= !((String) part).trim().isEmpty();
      } else if (part instanceof Map) {
        Map<?, ?> link = (Map<?, ?>) part;
        Object text = link.get("text");
        Object href = link.get("href");
        if (link.size() != 2 || !(text instanceof String) || ((String) text).trim().isEmpty()
            || !(href instanceof String) || ((String) href).length() > 2048 || !validUrl((String) href)) {
          errors.put("body", "Each link needs a label and a complete http:// or https:// URL.");
        } else {
          Map<String, Object> safe = new LinkedHashMap<>();
          safe.put("text", text);
          safe.put("href", href);
          body.add(safe);
          length += ((String) text).length();
          hasText = true;
        }
      } else errors.put("body", "Content must contain text or labeled links.");
    }
    if (length > 30000) errors.put("body", "Use 30000 characters or fewer.");
    if (required && !hasText) errors.put("body", "Enter news content.");
    result.put("body", body);
  }

  private void fail(Map<String, ?> errors) {
    throw new ValidationException("VALIDATION_FAILED", "Check the highlighted fields.",
        Collections.singletonMap("fieldErrors", errors));
  }
}
