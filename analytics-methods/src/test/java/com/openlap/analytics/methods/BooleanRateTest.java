package com.openlap.analytics.methods;

import static org.junit.Assert.*;

import com.openlap.dataset.OpenLAPDataColumn;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.junit.Test;

public class BooleanRateTest {
  @SuppressWarnings({"rawtypes", "unchecked"})
  private static BooleanRate input(BooleanRate method, String id, Object... values) {
    ((OpenLAPDataColumn) method.getInput().getColumns().get(id)).setData(new ArrayList<>(Arrays.asList(values)));
    return method;
  }

  private static List<?> values(BooleanRate method, String id) {
    return method.getOutput().getColumns().get(id).getData();
  }

  private static double number(BooleanRate method, String id, int row) {
    return ((Number) values(method, id).get(row)).doubleValue();
  }

  private static void rejects(BooleanRate method, String message) {
    try { method.execute(); fail("Expected validation failure"); }
    catch (IllegalArgumentException exception) { assertTrue(exception.getMessage(), exception.getMessage().contains(message)); }
  }

  @Test public void percentageUsesOnlyKnownOutcomesAndNeverTreatsUnknownAsFalse() {
    BooleanRate method = input(new BooleanRate(), "outcome", true, false, true, null, false, true);
    method.execute();
    assertEquals(List.of("All observations"), values(method, "group"));
    assertEquals(3, number(method, "true_count", 0), 0);
    assertEquals(2, number(method, "false_count", 0), 0);
    assertEquals(5, number(method, "count", 0), 0);
    assertEquals(1, number(method, "excluded_count", 0), 0);
    assertEquals(60, number(method, "percentage", 0), 1e-12);
    assertEquals(0, number(method, "ungrouped_count", 0), 0);
    method.execute();
    assertEquals("Reusing a plugin clears previous results", 1, values(method, "percentage").size());
  }

  @Test public void missingOutcomesGiveAnUndefinedPercentageAndExplicitDenominator() {
    BooleanRate method = input(new BooleanRate(), "outcome", null, null);
    method.execute();
    assertNull(values(method, "percentage").get(0));
    assertEquals(0, number(method, "count", 0), 0);
    assertEquals(0, number(method, "false_count", 0), 0);
    assertEquals(2, number(method, "excluded_count", 0), 0);
  }

  @Test public void groupedRatesRetainExactKeysAndCountMissingGroupsSeparately() {
    BooleanRate method = input(new BooleanRate(), "outcome", true, false, null, null, true, false);
    input(method, "group", " B ", "A", " B ", "Z", null, "A");
    method.execute();
    assertEquals(List.of(" B ", "A", "Z"), values(method, "group"));
    assertEquals(List.of(1, 0, 0), values(method, "true_count"));
    assertEquals(List.of(0, 2, 0), values(method, "false_count"));
    assertEquals(List.of(1, 2, 0), values(method, "count"));
    assertEquals(List.of(1, 0, 1), values(method, "excluded_count"));
    assertEquals(List.of(1, 1, 1), values(method, "ungrouped_count"));
    assertEquals(100, number(method, "percentage", 0), 0);
    assertEquals(0, number(method, "percentage", 1), 0);
    assertNull(values(method, "percentage").get(2));
    for (OpenLAPDataColumn<?> column : method.getOutput().getColumns().values()) {
      assertEquals(3, column.getData().size());
    }
  }

  @Test public void malformedBooleanAndMisalignedOrMissingGroupDataAreRejected() {
    for (Object invalid : List.of("true", "false", "", 1, 0)) {
      rejects(input(new BooleanRate(), "outcome", invalid), "true/false outcome");
    }
    BooleanRate misaligned = input(new BooleanRate(), "outcome", true, false);
    input(misaligned, "group", "A"); rejects(misaligned, "same observations");
    BooleanRate unknownGroups = input(new BooleanRate(), "outcome", true, false);
    input(unknownGroups, "group", null, " "); rejects(unknownGroups, "identified group");
    rejects(new BooleanRate(), "No recorded outcomes");
  }

  @Test public void boundedCountersRemainFiniteAtTheMaximumSupportedObservationCount() {
    BooleanRate method = new BooleanRate();
    for (int index = 0; index < 100_000; index++) {
      method.getInput().getColumns().get("outcome").getData().add(index % 2 == 0);
    }
    method.execute();
    assertEquals(100_000, number(method, "count", 0), 0);
    assertEquals(50, number(method, "percentage", 0), 0);
    method.getInput().getColumns().get("outcome").getData().add(true);
    rejects(method, "at most 100000");
  }
}
