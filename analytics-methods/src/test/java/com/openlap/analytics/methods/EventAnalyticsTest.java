package com.openlap.analytics.methods;

import static org.junit.Assert.*;

import com.openlap.dataset.OpenLAPDataColumn;
import com.openlap.dynamicparam.OpenLAPDynamicParam;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import org.junit.Test;

public class EventAnalyticsTest {
  @SuppressWarnings({"rawtypes", "unchecked"})
  private static <T extends AnalyticalMethod> T input(T method, String id, Object... values) {
    ((OpenLAPDataColumn) method.getInput().getColumns().get(id)).setData(new ArrayList<>(Arrays.asList(values)));
    return method;
  }

  @SuppressWarnings({"rawtypes", "unchecked"})
  private static void parameter(AnalyticalMethod method, String id, Object value) {
    ((OpenLAPDynamicParam) method.getParams().getParams().get(id)).setValue(value);
  }

  private static List<?> output(AnalyticalMethod method, String id) { return method.getOutput().getColumns().get(id).getData(); }
  private static void rejects(AnalyticalMethod method, String expected) {
    try { method.execute(); fail("Expected validation failure"); }
    catch (IllegalArgumentException exception) { assertTrue(exception.getMessage(), exception.getMessage().contains(expected)); }
  }

  @Test public void selectedEventCountIncludesMissingIdsAndReturnsZeroForEmptySelection() {
    EventCount method = input(new EventCount(), "event", "event-1", null, "event-3", "");
    method.execute();
    assertEquals(List.of("Selected events"), output(method, "category"));
    assertEquals(List.of(4), output(method, "event_count"));
    method.execute();
    assertEquals("Repeated execution must replace output", List.of(4), output(method, "event_count"));
    EventCount empty = new EventCount(); empty.execute();
    assertEquals(List.of(0), output(empty, "event_count"));
  }

  @Test public void eventFrequenciesCountCategoriesAndUseAllUsableEventsAsDenominator() {
    EventFrequency method = input(new EventFrequency(), "category", "B", "A", "B", "A", "C", null, " ");
    method.execute();
    assertEquals(List.of("A", "B", "C"), output(method, "category"));
    assertEquals(List.of(2, 2, 1), output(method, "event_count"));
    assertEquals(List.of(40.0, 40.0, 20.0), output(method, "percentage"));
    assertEquals(List.of(2, 2, 2), output(method, "excluded_count"));
    parameter(method, "limit", 1); method.execute();
    assertEquals(List.of("A"), output(method, "category"));
    assertEquals("Limiting output must not change the denominator", List.of(40.0), output(method, "percentage"));
  }

  @Test public void leastFrequentRankingHasStableAlphabeticalTiesAndExactCategoryKeys() {
    EventFrequency method = input(new EventFrequency(), "category", "B", "A", "B", "a", "C", "C");
    parameter(method, "order", "Least frequent"); parameter(method, "limit", 3);
    method.execute();
    assertEquals(List.of("A", "a", "B"), output(method, "category"));
    assertEquals(List.of(1, 1, 2), output(method, "event_count"));
  }

  @Test public void eventFrequencyRejectsEmptyMalformedOrInvalidParameterInputs() {
    rejects(new EventFrequency(), "No event categories");
    rejects(input(new EventFrequency(), "category", null, " "), "No event categories");
    rejects(input(new EventFrequency(), "category", "A", 42), "text column");
    EventFrequency badOrder = input(new EventFrequency(), "category", "A");
    parameter(badOrder, "order", "Random"); rejects(badOrder, "Most frequent or Least frequent");
    EventFrequency negative = input(new EventFrequency(), "category", "A");
    parameter(negative, "limit", -1); rejects(negative, "between 0 and 10000");
    EventFrequency fractional = input(new EventFrequency(), "category", "A");
    parameter(fractional, "limit", 1.5); rejects(fractional, "between 0 and 10000");
  }

  @Test public void distinctValuesCountExactIdentityRatherThanRepeatedEvents() {
    DistinctValueCount method = input(new DistinctValueCount(), "value", "learner", "learner", "Learner", null, " ");
    method.execute();
    assertEquals(List.of("All observations"), output(method, "category"));
    assertEquals(List.of(2), output(method, "distinct_count"));
    assertEquals(List.of(2), output(method, "excluded_count"));
    assertEquals(List.of(0), output(method, "ungrouped_count"));
    DistinctValueCount empty = new DistinctValueCount(); empty.execute();
    assertEquals(List.of(0), output(empty, "distinct_count"));
  }

  @Test public void groupedDistinctCountsRetainAlignmentAndSeparateMissingGroupKeys() {
    DistinctValueCount method = input(new DistinctValueCount(), "value", "u1", "u1", "u1", "u2", null, "U1", null);
    input(method, "group", "A", "B", "A", null, "B", "B", "Z");
    method.execute();
    assertEquals(List.of("A", "B", "Z"), output(method, "category"));
    assertEquals(List.of(1, 2, 0), output(method, "distinct_count"));
    assertEquals(List.of(0, 1, 1), output(method, "excluded_count"));
    assertEquals(List.of(1, 1, 1), output(method, "ungrouped_count"));
  }

  @Test public void distinctCountRejectsMismatchedRowsMissingGroupKeysAndNontextValues() {
    DistinctValueCount mismatch = input(new DistinctValueCount(), "value", "A", "B");
    input(mismatch, "group", "G"); rejects(mismatch, "same observations");
    DistinctValueCount missing = input(new DistinctValueCount(), "value", "A", "B");
    input(missing, "group", null, " "); rejects(missing, "No group keys");
    rejects(input(new DistinctValueCount(), "value", 1, 2), "text column");
  }

  @Test public void calendarDaysUseUtcBoundariesAndAcceptNativeDatesAndInstants() {
    EventsOverTime method = input(new EventsOverTime(), "timestamp",
        "2026-01-01T00:30:00+02:00", "2026-01-01T23:30:00-02:00", "2026-01-01",
        Instant.parse("2026-01-01T12:00:00Z"), Date.from(Instant.parse("2026-01-02T03:00:00Z")),
        OffsetDateTime.parse("2026-01-02T00:00:00+02:00"), LocalDate.of(2026, 1, 1), null, "");
    method.execute();
    assertEquals(List.of("2025-12-31", "2026-01-01", "2026-01-02"), output(method, "period"));
    assertEquals(List.of(1, 4, 2), output(method, "event_count"));
    assertEquals(List.of(2, 2, 2), output(method, "excluded_count"));
  }

  @Test public void isoWeeksUseMondayAndWeekBasedYearAcrossNewYear() {
    EventsOverTime method = input(new EventsOverTime(), "timestamp", "2021-01-04", "2021-01-01", "2020-12-31", "2021-01-03");
    parameter(method, "period", "Week"); method.execute();
    assertEquals(List.of("2020-W53", "2021-W01"), output(method, "period"));
    assertEquals(List.of(3, 1), output(method, "event_count"));
  }

  @Test public void monthlyAndYearlyBucketsAreChronologicalAndDoNotFillUnobservedPeriods() {
    EventsOverTime method = input(new EventsOverTime(), "timestamp", "2026-03-01", "2025-12-31", "2026-01-10", "2026-03-02");
    parameter(method, "period", "Month"); method.execute();
    assertEquals(List.of("2025-12", "2026-01", "2026-03"), output(method, "period"));
    assertEquals(List.of(1, 1, 2), output(method, "event_count"));
    parameter(method, "period", "Year"); method.execute();
    assertEquals(List.of("2025", "2026"), output(method, "period"));
    assertEquals(List.of(1, 3), output(method, "event_count"));
  }

  @Test public void temporalMethodRejectsMalformedAmbiguousAndUnusableTimestamps() {
    rejects(new EventsOverTime(), "No event timestamps");
    rejects(input(new EventsOverTime(), "timestamp", null, " "), "No event timestamps");
    rejects(input(new EventsOverTime(), "timestamp", "2026-02-30"), "valid ISO timestamp");
    rejects(input(new EventsOverTime(), "timestamp", "2026-01-01T12:00:00"), "valid ISO timestamp");
    rejects(input(new EventsOverTime(), "timestamp", "yesterday"), "valid ISO timestamp");
    rejects(input(new EventsOverTime(), "timestamp", 123456789), "Numeric epoch values");
    EventsOverTime invalidPeriod = input(new EventsOverTime(), "timestamp", "2026-01-01");
    parameter(invalidPeriod, "period", "Hour"); rejects(invalidPeriod, "Day, Week, Month or Year");
  }

  @Test @SuppressWarnings({"unchecked", "rawtypes"}) public void allEventMethodsEnforcePreviewRowLimits() {
    List<AnalyticalMethod> methods = List.of(new EventCount(), new EventFrequency(), new DistinctValueCount(), new EventsOverTime());
    List<String> inputs = List.of("event", "category", "value", "timestamp");
    for (int index = 0; index < methods.size(); index++) {
      AnalyticalMethod method = methods.get(index);
      ((OpenLAPDataColumn) method.getInput().getColumns().get(inputs.get(index)))
          .setData(new ArrayList<>(Collections.nCopies(100_001, null)));
      rejects(method, "at most 100000");
    }
  }

  @Test public void eventMethodsDeclareCompleteContractsAndProduceRectangularOutputs() {
    List<AnalyticalMethod> methods = List.of(input(new EventCount(), "event", "A", null),
        input(new EventFrequency(), "category", "A", "B", "A"),
        input(new DistinctValueCount(), "value", "u1", "u2", "u1"),
        input(new EventsOverTime(), "timestamp", "2026-01-01", "2026-02-01"));
    for (AnalyticalMethod method : methods) {
      assertEquals("descriptive", method.getType());
      assertNotNull(method.getParams()); assertFalse(method.getInputPorts().isEmpty());
      assertNotNull(method.getAnalyticsMethodName()); assertNotNull(method.getAnalyticsMethodDescription());
      method.execute();
      int rows = method.getOutput().getColumns().values().iterator().next().getData().size();
      for (OpenLAPDataColumn<?> column : method.getOutput().getColumns().values()) assertEquals(rows, column.getData().size());
    }
  }
}
