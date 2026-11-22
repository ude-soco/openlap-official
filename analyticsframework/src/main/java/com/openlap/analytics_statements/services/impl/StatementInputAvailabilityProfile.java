package com.openlap.analytics_statements.services.impl;

import com.openlap.analytics_module.services.BasicAnalysisFields;
import com.openlap.analytics_statements.dtos.StatementInputAvailability;
import com.openlap.analytics_statements.dtos.StatementInputAvailability.ScoreCategoryPair;
import com.openlap.analytics_statements.dtos.request.StatementsRequest;
import com.openlap.infrastructure.exception.ValidationException;
import java.time.DateTimeException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Date;
import java.util.Iterator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.bson.Document;

/** Follows the input types understood by the bundled Basic methods. */
final class StatementInputAvailabilityProfile {
  static final int MAX_STATEMENTS = 2_000;
  private static final Pattern ACTIVITY_NAME_PATH =
      Pattern.compile("statement\\.object\\.definition\\.name\\.[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*");
  private static final Pattern DATE_ONLY = Pattern.compile("[+-]?\\d{4,9}-\\d{2}-\\d{2}");

  private enum Kind { CATEGORY, SCORE, OUTCOME, TIMESTAMP }

  private static final Map<String, Kind> FIELDS = Map.ofEntries(
      Map.entry("statement.object.definition.name.en-US", Kind.CATEGORY),
      Map.entry("statement.object.definition.type", Kind.CATEGORY),
      Map.entry("statement.verb.id", Kind.CATEGORY),
      Map.entry("statement.verb.display.en-US", Kind.CATEGORY),
      Map.entry("statement.object.id", Kind.CATEGORY),
      Map.entry("statement.context.platform", Kind.CATEGORY),
      Map.entry("statement.timestamp", Kind.TIMESTAMP),
      Map.entry("statement.stored", Kind.TIMESTAMP),
      Map.entry("statement.result.score.raw", Kind.SCORE),
      Map.entry("statement.result.score.scaled", Kind.SCORE),
      Map.entry("statement.result.score.min", Kind.SCORE),
      Map.entry("statement.result.score.max", Kind.SCORE),
      Map.entry("statement.result.success", Kind.OUTCOME),
      Map.entry("statement.result.completion", Kind.OUTCOME));

  private StatementInputAvailabilityProfile() {}

  static void validate(StatementsRequest query) {
    BasicAnalysisFields.requireAllowed(query, null);
    var duration = query.getDuration();
    if (duration == null || !isTimestamp(duration.getFrom()) || !isTimestamp(duration.getUntil())) {
      throw invalid("Choose a valid time range to check analysis inputs.");
    }
    if (query.getActivities() == null || query.getActivities().isEmpty()
        || query.getActivities().entrySet().stream().anyMatch(entry ->
            entry.getKey() == null
                || !("statement.object.id".equals(entry.getKey()) || ACTIVITY_NAME_PATH.matcher(entry.getKey()).matches())
                || entry.getValue() == null || entry.getValue().isEmpty())) {
      throw invalid("Choose a supported activity identifier or activity name for the activity filter.");
    }
    List<String> fields = query.getOutputs();
    if (fields == null || fields.isEmpty() || fields.size() > FIELDS.size()
        || fields.stream().anyMatch(field -> field == null || !FIELDS.containsKey(field))
        || Set.copyOf(fields).size() != fields.size()) {
      throw invalid("Choose supported analysis fields to check availability.");
    }
  }

  static StatementInputAvailability inspect(Iterator<Document> rows, Map<String, String> aliases) {
    Set<String> available = new LinkedHashSet<>();
    Set<String> invalid = new LinkedHashSet<>();
    Set<ScoreCategoryPair> pairs = new LinkedHashSet<>();
    int checked = 0;
    while (checked < MAX_STATEMENTS && rows.hasNext()) {
      Document row = rows.next();
      checked++;
      List<String> scores = new ArrayList<>();
      List<String> categories = new ArrayList<>();
      aliases.forEach((alias, field) -> {
        Object value = row.get(alias);
        if (value == null || value instanceof String text && text.isBlank()) return;
        Kind kind = FIELDS.get(field);
        if (usable(value, kind)) {
          available.add(field);
          if (kind == Kind.SCORE) scores.add(field);
          if (kind == Kind.CATEGORY) categories.add(field);
        } else {
          invalid.add(field);
        }
      });
      scores.forEach(score -> categories.forEach(category -> pairs.add(new ScoreCategoryPair(score, category))));
    }
    available.removeAll(invalid);
    pairs.removeIf(pair -> invalid.contains(pair.score()) || invalid.contains(pair.category()));
    return new StatementInputAvailability(checked, !rows.hasNext(),
        List.copyOf(available), List.copyOf(invalid), List.copyOf(pairs));
  }

  private static boolean usable(Object value, Kind kind) {
    return switch (kind) {
      case CATEGORY -> value instanceof String;
      case SCORE -> isNumeric(value);
      case OUTCOME -> value instanceof Boolean || value instanceof String text
          && ("true".equalsIgnoreCase(text.trim()) || "false".equalsIgnoreCase(text.trim()));
      case TIMESTAMP -> isTimestamp(value);
    };
  }

  private static boolean isNumeric(Object value) {
    if (value instanceof Number number) return Double.isFinite(number.doubleValue());
    if (!(value instanceof String text)) return false;
    try {
      return Double.isFinite(Double.parseDouble(text.trim()));
    } catch (NumberFormatException ignored) {
      return false;
    }
  }

  private static boolean isTimestamp(Object value) {
    if (value instanceof Date || value instanceof Instant || value instanceof LocalDate
        || value instanceof OffsetDateTime || value instanceof ZonedDateTime) {
      return true;
    }
    if (!(value instanceof String text)) return false;
    String date = text.trim();
    try {
      if (DATE_ONLY.matcher(date).matches()) LocalDate.parse(date);
      else OffsetDateTime.parse(date);
      return true;
    } catch (DateTimeException ignored) {
      return false;
    }
  }

  private static ValidationException invalid(String message) {
    return new ValidationException("ANALYSIS_INPUT_AVAILABILITY_INVALID", message);
  }
}
