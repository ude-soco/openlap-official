package com.openlap.analytics.methods;

import com.openlap.dataset.OpenLAPColumnDataType;
import java.time.DateTimeException;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.time.temporal.WeekFields;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;

/** Calendar event buckets with explicit UTC boundaries and ISO weeks. */
public final class EventsOverTime extends AnalyticalMethod {
  public EventsOverTime() {
    super("descriptive");
    input("timestamp", OpenLAPColumnDataType.Text, true, "Event timestamp",
        "An ISO date-time with an offset or Z, a date-only value, or a native timestamp. Calendar periods use UTC. Missing timestamps are excluded; malformed timestamps are rejected.");
    output("period", OpenLAPColumnDataType.Text, "Period (UTC)",
        "Observed UTC calendar day, ISO week, month or year, ordered chronologically. Missing periods are not filled with zeros.");
    output("event_count", OpenLAPColumnDataType.Numeric, "Event count", "Number of events with usable timestamps falling within this UTC calendar period.");
    output("excluded_count", OpenLAPColumnDataType.Numeric, "Events without a timestamp (whole dataset)",
        "Whole-dataset missing timestamp count, repeated on each period row. Read once; do not sum.");
    choiceParameter("period", "Calendar period", "Count by UTC day, ISO week starting Monday, month or year. Only observed periods are returned.",
        "Day", "Day,Week,Month,Year");
  }

  @Override public String getAnalyticsMethodName() { return "Count events over time"; }

  @Override public String getAnalyticsMethodDescription() {
    return "Count events by UTC calendar day, ISO week (Monday start), month or year, in chronological order. Date-only values refer to UTC midnight. Missing timestamps are excluded and reported; malformed or offset-free date-times are rejected. Only observed periods appear, so gaps do not imply zero activity.";
  }

  @Override protected void implementationExecution() {
    resetOutput();
    List<?> timestamps = data("timestamp");
    if (timestamps.size() > MAX_ROWS) throw invalid("This method supports at most " + MAX_ROWS + " events per preview.");
    String period = String.valueOf(parameter("period"));
    if (!List.of("Day", "Week", "Month", "Year").contains(period)) throw invalid("Choose Day, Week, Month or Year for the calendar period.");
    Map<LocalDate, Integer> buckets = new TreeMap<>();
    int excluded = 0;
    for (Object raw : timestamps) {
      LocalDate date = utcDate(raw);
      if (date == null) { excluded++; continue; }
      LocalDate start = switch (period) {
        case "Week" -> date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        case "Month" -> date.withDayOfMonth(1);
        case "Year" -> date.withDayOfYear(1);
        default -> date;
      };
      buckets.merge(start, 1, Integer::sum);
    }
    if (buckets.isEmpty()) throw invalid("No event timestamps are available. Choose a timestamp field or adjust your filters.");
    for (Map.Entry<LocalDate, Integer> entry : buckets.entrySet()) {
      LocalDate date = entry.getKey();
      String label = switch (period) {
        case "Week" -> String.format(Locale.ROOT, "%04d-W%02d", date.get(WeekFields.ISO.weekBasedYear()), date.get(WeekFields.ISO.weekOfWeekBasedYear()));
        case "Month" -> date.format(DateTimeFormatter.ofPattern("uuuu-MM", Locale.ROOT));
        case "Year" -> date.format(DateTimeFormatter.ofPattern("uuuu", Locale.ROOT));
        default -> date.toString();
      };
      append("period", label);
      append("event_count", entry.getValue());
      append("excluded_count", excluded);
    }
  }

  private static LocalDate utcDate(Object raw) {
    if (raw == null || raw instanceof String text && text.isBlank()) return null;
    try {
      if (raw instanceof Instant value) return value.atZone(ZoneOffset.UTC).toLocalDate();
      if (raw instanceof Date value) return Instant.ofEpochMilli(value.getTime()).atZone(ZoneOffset.UTC).toLocalDate();
      if (raw instanceof OffsetDateTime value) return value.atZoneSameInstant(ZoneOffset.UTC).toLocalDate();
      if (raw instanceof ZonedDateTime value) return value.withZoneSameInstant(ZoneOffset.UTC).toLocalDate();
      if (raw instanceof LocalDate value) return value;
      if (raw instanceof String text) {
        String value = text.trim();
        if (value.matches("[+-]?\\d{4,9}-\\d{2}-\\d{2}")) return LocalDate.parse(value);
        return OffsetDateTime.parse(value, DateTimeFormatter.ISO_OFFSET_DATE_TIME)
            .atZoneSameInstant(ZoneOffset.UTC).toLocalDate();
      }
    } catch (DateTimeException | IllegalArgumentException exception) {
      throw invalid("Choose a valid ISO timestamp with an offset or Z, or a date-only value. Check the timestamp data before previewing.");
    }
    throw invalid("Choose a timestamp field containing ISO timestamps or dates. Numeric epoch values need explicit conversion first.");
  }
}
