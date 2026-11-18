package com.openlap.analytics.methods;

import com.openlap.dataset.OpenLAPColumnDataType;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.IdentityHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.commons.math3.ml.clustering.CentroidCluster;
import org.apache.commons.math3.ml.clustering.Clusterable;
import org.apache.commons.math3.ml.clustering.KMeansPlusPlusClusterer;
import org.apache.commons.math3.ml.distance.EuclideanDistance;
import org.apache.commons.math3.random.Well19937c;
import org.apache.commons.math3.stat.descriptive.DescriptiveStatistics;

/** K-means++ with stable labels and output rows corresponding to original input rows. */
public final class ReproducibleKMeans extends AnalyticalMethod {
  private static final int MAX_POINTS = 10_000;

  public ReproducibleKMeans() {
    super("clustering");
    input("x", OpenLAPColumnDataType.Numeric, true, "First numeric feature", "First prepared feature for each observation. Use one row per learner for learner profiles.");
    input("y", OpenLAPColumnDataType.Numeric, true, "Second numeric feature", "Second feature for the same observation. Rows missing either feature are excluded together.");
    input("observation", OpenLAPColumnDataType.Text, false, "Observation label", "Optional aligned learner or activity label. Without a label, the original row number identifies each observation.");
    output("observation", OpenLAPColumnDataType.Text, "Observation", "Original observation label, or original input row number. Output preserves the order of complete input rows.");
    output("cluster", OpenLAPColumnDataType.Text, "Cluster", "Cluster label ordered by cluster centre, for repeatable interpretation. Clusters are exploratory groups, not attainment judgments.");
    output("x", OpenLAPColumnDataType.Numeric, "First feature", "First feature in its original units.");
    output("y", OpenLAPColumnDataType.Numeric, "Second feature", "Second feature in its original units.");
    output("count", OpenLAPColumnDataType.Numeric, "Analysed observations (whole dataset)", "Whole-dataset complete observation count, repeated on every output row. Read once; do not sum.");
    output("excluded_count", OpenLAPColumnDataType.Numeric, "Excluded observations (whole dataset)", "Whole-dataset rows missing at least one numeric feature, repeated on every output row. Read once; do not sum.");
    integerParameter("clusters", "Number of clusters", "Choose 2-20 clusters, no more than the number of distinct complete feature pairs.", 3);
    integerParameter("seed", "Random seed", "The same data, seed and parameters produce the same result. Integer from 0 to 2147483647.", 42);
    integerParameter("max_iterations", "Maximum iterations", "Bounded execution: choose 1-1000 iterations. A low limit may stop before convergence.", 300);
    choiceParameter("scaling", "Feature scaling", "Standardize gives both features equal scale using population standard deviation. None keeps their original units and distances.", "Standardize", "Standardize,None");
  }
  @Override public String getAnalyticsMethodName() { return "Group observations using reproducible K-means++"; }
  @Override public String getAnalyticsMethodDescription() {
    return "Explore groups using two numeric features, reproducible initialization and explicit feature scaling. One row represents one prepared observation. Complete rows retain their original label and order, with missing-pair exclusions counted. Supports up to 10000 complete observations; exploratory clusters do not imply learner ability or causation.";
  }
  @Override protected void implementationExecution() {
    resetOutput();
    List<?> x = data("x"), y = data("y"), labels = data("observation");
    sameRows(x, y);
    if (!labels.isEmpty()) sameRows(x, labels);
    int clusters = integer("clusters", 2, 20);
    int seed = integer("seed", 0, Integer.MAX_VALUE);
    int iterations = integer("max_iterations", 1, 1000);
    String scaling = String.valueOf(parameter("scaling"));
    if (!scaling.equals("Standardize") && !scaling.equals("None")) throw invalid("Choose Standardize or None for feature scaling.");
    List<Point> points = new ArrayList<>();
    Set<List<Double>> distinct = new HashSet<>();
    for (int row = 0; row < x.size(); row++) {
      Double first = numeric(x.get(row)), second = numeric(y.get(row));
      String label = labels.isEmpty() ? null : group(labels.get(row));
      if (first == null || second == null) continue;
      if (points.size() == MAX_POINTS) throw invalid("K-means preview supports at most " + MAX_POINTS + " complete observations. Aggregate your data first.");
      // Treat signed zero as the same coordinate when validating distinct points.
      if (first == 0) first = 0.0;
      if (second == 0) second = 0.0;
      points.add(new Point(label == null ? "Row " + (row + 1) : label, first, second));
      distinct.add(List.of(first, second));
    }
    if (distinct.size() < clusters) throw invalid("Choose no more clusters than the number of distinct complete feature pairs (" + distinct.size() + ").");
    if (scaling.equals("Standardize")) standardize(points);
    requireFiniteDistances(points);
    KMeansPlusPlusClusterer<Point> algorithm = new KMeansPlusPlusClusterer<>(clusters, iterations,
        new EuclideanDistance(), new Well19937c(seed), KMeansPlusPlusClusterer.EmptyClusterStrategy.LARGEST_VARIANCE);
    List<CentroidCluster<Point>> result;
    try { result = algorithm.cluster(points); }
    catch (RuntimeException exception) { throw invalid("Clustering could not produce a reliable result. Rescale your features or choose fewer clusters."); }
    for (CentroidCluster<Point> cluster : result) {
      for (double coordinate : cluster.getCenter().getPoint()) {
        if (!Double.isFinite(coordinate)) throw invalid("The feature range is too large for reliable clustering. Rescale the numeric inputs.");
      }
    }
    result.sort(Comparator.<CentroidCluster<Point>>comparingDouble(cluster -> cluster.getCenter().getPoint()[0])
        .thenComparingDouble(cluster -> cluster.getCenter().getPoint()[1]));
    Map<Point, String> assignments = new IdentityHashMap<>();
    for (int index = 0; index < result.size(); index++) {
      for (Point point : result.get(index).getPoints()) assignments.put(point, "Cluster " + (index + 1));
    }
    for (Point point : points) {
      if (!assignments.containsKey(point)) throw invalid("A cluster assignment is missing. Try fewer clusters.");
      append("observation", point.label);
      append("cluster", assignments.get(point));
      append("x", point.x); append("y", point.y);
      append("count", points.size()); append("excluded_count", x.size() - points.size());
    }
  }

  private static void requireFiniteDistances(List<Point> points) {
    double[] minima = {Double.POSITIVE_INFINITY, Double.POSITIVE_INFINITY};
    double[] maxima = {Double.NEGATIVE_INFINITY, Double.NEGATIVE_INFINITY};
    for (Point point : points) {
      for (int column = 0; column < 2; column++) {
        minima[column] = Math.min(minima[column], point.coordinates[column]);
        maxima[column] = Math.max(maxima[column], point.coordinates[column]);
      }
    }
    double firstRange = maxima[0] - minima[0], secondRange = maxima[1] - minima[1];
    // Commons Math's Euclidean distance squares coordinate differences.
    double squaredRange = firstRange * firstRange + secondRange * secondRange;
    if (!Double.isFinite(squaredRange) || squaredRange == 0) {
      throw invalid("The feature range is too large for reliable clustering. Use Standardize or rescale the numeric inputs.");
    }
  }

  private static void standardize(List<Point> points) {
    double[] means = new double[2], deviations = new double[2];
    for (int column = 0; column < 2; column++) {
      DescriptiveStatistics stats = new DescriptiveStatistics();
      for (Point point : points) stats.addValue(point.coordinates[column]);
      means[column] = stats.getMean();
      deviations[column] = Math.sqrt(stats.getPopulationVariance());
      if (!Double.isFinite(means[column]) || !Double.isFinite(deviations[column])) throw invalid("The feature range is too large to standardize. Rescale the numeric inputs.");
      if (deviations[column] == 0 && stats.getMax() != stats.getMin()) throw invalid("The feature variation is too small to standardize reliably. Rescale the numeric inputs.");
    }
    for (Point point : points) {
      for (int column = 0; column < 2; column++) {
        point.coordinates[column] = deviations[column] == 0 ? 0 : (point.coordinates[column] - means[column]) / deviations[column];
        if (!Double.isFinite(point.coordinates[column])) throw invalid("The feature range is too large to standardize. Rescale the numeric inputs.");
      }
    }
  }

  private static final class Point implements Clusterable {
    final String label;
    final double x, y;
    final double[] coordinates;
    Point(String label, double x, double y) { this.label = label; this.x = x; this.y = y; this.coordinates = new double[] {x, y}; }
    @Override public double[] getPoint() { return coordinates; }
  }
}
