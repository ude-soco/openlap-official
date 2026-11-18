package com.openlap.analytics.methods;

import static org.junit.Assert.*;

import com.openlap.dataset.OpenLAPDataColumn;
import com.openlap.dynamicparam.OpenLAPDynamicParam;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.junit.Test;

public class AnalyticsMethodsTest {
  @SuppressWarnings({"rawtypes", "unchecked"})
  private static <T extends AnalyticalMethod> T input(T method, String name, Object... values) {
    ((OpenLAPDataColumn) method.getInput().getColumns().get(name)).setData(new ArrayList<>(Arrays.asList(values)));
    return method;
  }
  @SuppressWarnings({"rawtypes", "unchecked"})
  private static void parameter(AnalyticalMethod method, String name, Object value) {
    ((OpenLAPDynamicParam) method.getParams().getParams().get(name)).setValue(value);
  }
  private static List<?> values(AnalyticalMethod method, String name) {
    return method.getOutput().getColumns().get(name).getData();
  }
  private static double number(AnalyticalMethod method, String name, int row) {
    return ((Number) values(method, name).get(row)).doubleValue();
  }
  private static void rejects(AnalyticalMethod method, String expected) {
    try { method.execute(); fail("Expected validation failure"); }
    catch (IllegalArgumentException exception) { assertTrue(exception.getMessage(), exception.getMessage().contains(expected)); }
  }

  @Test public void summaryMatchesKnownNumericStatisticsAndR7Quartiles() {
    NumericSummary method = input(new NumericSummary(), "values", 2, 4, 4, 4, 5, 5, 7, 9, null);
    method.execute();
    assertEquals(8, number(method, "count", 0), 0);
    assertEquals(1, number(method, "excluded_count", 0), 0);
    assertEquals(5, number(method, "mean", 0), 1e-12);
    assertEquals(4.5, number(method, "median", 0), 1e-12);
    assertEquals(Math.sqrt(32.0 / 7), number(method, "standard_deviation", 0), 1e-12);
    assertEquals(2, number(method, "minimum", 0), 0);
    assertEquals(9, number(method, "maximum", 0), 0);
    assertEquals(4, number(method, "q1", 0), 1e-12);
    assertEquals(5.5, number(method, "q3", 0), 1e-12);
    assertEquals(1.5, number(method, "iqr", 0), 1e-12);
  }

  @Test public void summaryUsesActualDecimalValuesAndDoesNotMutateInput() {
    NumericSummary method = input(new NumericSummary(), "values", -1.5, 0.0, 3.75);
    method.execute();
    assertEquals(.75, number(method, "mean", 0), 1e-12);
    assertEquals(Arrays.asList(-1.5, 0.0, 3.75), method.getInput().getColumns().get("values").getData());
    method.execute();
    assertEquals("Reusing a plugin must not append old outputs", 1, values(method, "mean").size());
  }

  @Test public void singletonHasUndefinedSampleDeviationAndConstantSampleHasZeroDeviation() {
    NumericSummary singleton = input(new NumericSummary(), "values", 8.25);
    singleton.execute();
    assertNull(values(singleton, "standard_deviation").get(0));
    assertEquals(8.25, number(singleton, "median", 0), 0);
    NumericSummary constant = input(new NumericSummary(), "values", 2.5, 2.5, 2.5);
    constant.execute();
    assertEquals(0, number(constant, "standard_deviation", 0), 0);
  }

  @Test public void invalidOrEmptyNumericInputsAreNotSilentlyTreatedAsMissing() {
    rejects(new NumericSummary(), "No numeric");
    rejects(input(new NumericSummary(), "values", null, null), "No numeric");
    rejects(input(new NumericSummary(), "values", "12", 2), "numeric measurement");
    rejects(input(new NumericSummary(), "values", Double.NaN, 2), "finite numbers");
    rejects(input(new NumericSummary(), "values", Double.POSITIVE_INFINITY), "finite numbers");
    rejects(input(new NumericSummary(), "values", -Double.MAX_VALUE, Double.MAX_VALUE), "range is too large");
  }

  @Test public void groupedSummaryKeepsExactKeysAndReportsMissingValuesWithoutShiftingRows() {
    GroupedNumericSummary method = input(new GroupedNumericSummary(), "group", "B", "A", "B", "A", null, "Z");
    input(method, "values", 2.5, null, 4.5, 8, 6, null);
    method.execute();
    assertEquals(Arrays.asList("B", "A", "Z"), values(method, "group"));
    assertEquals(Arrays.asList(2, 1, 0), values(method, "count"));
    assertEquals(Arrays.asList(0, 1, 1), values(method, "excluded_count"));
    assertEquals(Arrays.asList(1, 1, 1), values(method, "ungrouped_count"));
    assertEquals(3.5, number(method, "mean", 0), 0);
    assertEquals(8, number(method, "mean", 1), 0);
    assertNull(values(method, "mean").get(2));
  }

  @Test public void mismatchedGroupedRowsAndNoUsableGroupsFailExplicitly() {
    GroupedNumericSummary mismatch = input(new GroupedNumericSummary(), "group", "A", "B");
    input(mismatch, "values", 1);
    rejects(mismatch, "same observations");
    GroupedNumericSummary missing = input(new GroupedNumericSummary(), "group", null, " ");
    input(missing, "values", 1, 2);
    rejects(missing, "No grouped");
  }

  @Test public void pearsonMatchesHandCalculatedCoefficient() {
    PearsonCorrelation method = input(new PearsonCorrelation(), "x", 1, 2, 3, 4);
    input(method, "y", 2, 1, 4, 3);
    method.execute();
    assertEquals(.6, number(method, "correlation", 0), 1e-12);
    assertEquals(4, number(method, "count", 0), 0);
  }

  @Test public void completeCaseExclusionPreservesPairsAndCountsEachRowOnce() {
    PearsonCorrelation method = input(new PearsonCorrelation(), "x", 1, null, 3, 4, 5);
    input(method, "y", 2, 999, 6, null, 10);
    method.execute();
    assertEquals(1, number(method, "correlation", 0), 1e-12);
    assertEquals(3, number(method, "count", 0), 0);
    assertEquals(2, number(method, "excluded_count", 0), 0);
  }

  @Test public void spearmanUsesAverageTiedRanks() {
    SpearmanCorrelation method = input(new SpearmanCorrelation(), "x", 1, 2, 2, 3);
    input(method, "y", 1, 2, 3, 4);
    method.execute();
    assertEquals(3 / Math.sqrt(10), number(method, "correlation", 0), 1e-12);
  }

  @Test public void correlationHandlesDescendingValuesAndRejectsInsufficientOrConstantMeasurements() {
    PearsonCorrelation negative = input(new PearsonCorrelation(), "x", 1.5, 2.5, 3.5);
    input(negative, "y", -3, -5, -7);
    negative.execute();
    assertEquals(-1, number(negative, "correlation", 0), 1e-12);
    PearsonCorrelation shortInput = input(new PearsonCorrelation(), "x", 1, 2);
    input(shortInput, "y", 2, 3); rejects(shortInput, "three complete");
    SpearmanCorrelation constant = input(new SpearmanCorrelation(), "x", 1, 1, 1);
    input(constant, "y", 2, 3, 4); rejects(constant, "no variation");
    PearsonCorrelation mismatch = input(new PearsonCorrelation(), "x", 1, 2, 3);
    input(mismatch, "y", 2, 3); rejects(mismatch, "same observations");
  }

  private static ReproducibleKMeans clusters() {
    ReproducibleKMeans method = input(new ReproducibleKMeans(), "x", 10.2, .1, 10.1, .2, null);
    input(method, "y", 100.2, .3, 100.1, .4, 300);
    input(method, "observation", "High A", "Low A", "High B", "Low B", "Missing");
    parameter(method, "clusters", 2);
    return method;
  }

  @Test public void clusteringPreservesShuffledOriginalRowsAndDecimalFeatures() {
    ReproducibleKMeans method = clusters();
    method.execute();
    assertEquals(Arrays.asList("High A", "Low A", "High B", "Low B"), values(method, "observation"));
    assertEquals(Arrays.asList("Cluster 2", "Cluster 1", "Cluster 2", "Cluster 1"), values(method, "cluster"));
    assertEquals(Arrays.asList(10.2, .1, 10.1, .2), values(method, "x"));
    assertEquals(Arrays.asList(4, 4, 4, 4), values(method, "count"));
    assertEquals(Arrays.asList(1, 1, 1, 1), values(method, "excluded_count"));
  }

  @Test public void clusteringIsRepeatableAndRetainsDuplicateCoordinatesAsSeparateObservations() {
    ReproducibleKMeans first = clusters(), second = clusters();
    first.execute(); second.execute();
    assertEquals(first.getOutput(), second.getOutput());
    ReproducibleKMeans duplicate = input(new ReproducibleKMeans(), "x", 0, 10, 0, 10);
    input(duplicate, "y", 0, 10, 0, 10);
    parameter(duplicate, "clusters", 2); duplicate.execute();
    assertEquals(Arrays.asList("Row 1", "Row 2", "Row 3", "Row 4"), values(duplicate, "observation"));
    assertEquals(Arrays.asList("Cluster 1", "Cluster 2", "Cluster 1", "Cluster 2"), values(duplicate, "cluster"));
  }

  @Test public void clusteringWithOneConstantFeatureAndWithoutScalingRemainsDefined() {
    ReproducibleKMeans constant = input(new ReproducibleKMeans(), "x", 4, 4, 4, 4);
    input(constant, "y", 0, .1, 10, 10.1);
    parameter(constant, "clusters", 2); constant.execute();
    assertEquals(Arrays.asList("Cluster 1", "Cluster 1", "Cluster 2", "Cluster 2"), values(constant, "cluster"));
    ReproducibleKMeans raw = clusters(); parameter(raw, "scaling", "None"); raw.execute();
    assertEquals(Arrays.asList("Cluster 2", "Cluster 1", "Cluster 2", "Cluster 1"), values(raw, "cluster"));
  }

  @Test public void clusteringRejectsInvalidParametersAndDistinctPointShortage() {
    ReproducibleKMeans count = clusters(); parameter(count, "clusters", 1); rejects(count, "between 2 and 20");
    ReproducibleKMeans tooMany = clusters(); parameter(tooMany, "clusters", 6); rejects(tooMany, "distinct complete");
    ReproducibleKMeans fractional = clusters(); parameter(fractional, "clusters", 2.5); rejects(fractional, "between 2 and 20");
    ReproducibleKMeans iterations = clusters(); parameter(iterations, "max_iterations", 1001); rejects(iterations, "between 1 and 1000");
    ReproducibleKMeans scaling = clusters(); parameter(scaling, "scaling", "Automatic"); rejects(scaling, "Standardize or None");
    ReproducibleKMeans labels = input(new ReproducibleKMeans(), "x", 0, 1, 2);
    input(labels, "y", 0, 1, 2); input(labels, "observation", "Only one"); rejects(labels, "same observations");
  }

  @Test public void clusteringRejectsOverflowAndUnderflowInDistanceCalculations() {
    ReproducibleKMeans extreme = input(new ReproducibleKMeans(), "x", -Double.MAX_VALUE, 0, Double.MAX_VALUE);
    input(extreme, "y", 0, 1, 2);
    parameter(extreme, "clusters", 2); parameter(extreme, "scaling", "None");
    rejects(extreme, "range is too large");
    ReproducibleKMeans tiny = input(new ReproducibleKMeans(), "x", 0.0, 1e-200, 2e-200);
    input(tiny, "y", 0.0, 1e-200, 2e-200); parameter(tiny, "clusters", 2);
    rejects(tiny, "variation is too small");
  }

  @Test public void previewRowLimitsAreEnforcedBeforeExpensiveCalculations() {
    NumericSummary summary = new NumericSummary();
    List<Object> tooMany = new ArrayList<>();
    for (int i = 0; i < 100_001; i++) tooMany.add(i);
    summary.getInput().getColumns().get("values").getData().addAll(tooMany);
    rejects(summary, "at most 100000");
    ReproducibleKMeans cluster = new ReproducibleKMeans();
    for (int i = 0; i < 10_001; i++) {
      cluster.getInput().getColumns().get("x").getData().add(i);
      cluster.getInput().getColumns().get("y").getData().add(i);
    }
    rejects(cluster, "at most 10000");
  }

  @Test public void allRegisteredMethodsDeclareCompleteContractsAndReturnRectangularFiniteOutputs() {
    List<AnalyticalMethod> methods = List.of(input(new NumericSummary(), "values", 1, 2, 3),
        input(input(new GroupedNumericSummary(), "values", 1, 2, 3), "group", "A", "A", "B"),
        input(input(new PearsonCorrelation(), "x", 1, 2, 3), "y", 2, 1, 4),
        input(input(new SpearmanCorrelation(), "x", 1, 2, 3), "y", 2, 1, 4), clusters());
    for (AnalyticalMethod method : methods) {
      assertNotNull(method.getParams()); assertFalse(method.hasPMML());
      assertFalse(method.getInputPorts().isEmpty()); assertFalse(method.getOutputPorts().isEmpty());
      assertNotNull(method.getAnalyticsMethodName()); assertNotNull(method.getAnalyticsMethodDescription());
      method.execute();
      int rows = method.getOutput().getColumns().values().iterator().next().getData().size();
      for (OpenLAPDataColumn<?> column : method.getOutput().getColumns().values()) {
        assertEquals(rows, column.getData().size());
        for (Object value : column.getData()) if (value instanceof Number number) assertTrue(Double.isFinite(number.doubleValue()));
      }
    }
  }
}
