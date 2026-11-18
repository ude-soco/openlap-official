package com.openlap.analytics.methods;

import com.openlap.dataset.OpenLAPColumnDataType;
import java.util.List;
import org.apache.commons.math3.stat.descriptive.DescriptiveStatistics;
import org.apache.commons.math3.stat.descriptive.rank.Percentile;

abstract class SummaryMethod extends AnalyticalMethod {
  SummaryMethod() {
    super("descriptive");
    input("values", OpenLAPColumnDataType.Numeric, true, "Numeric measurement", "A numeric measurement for each observation, such as a score or a prepared learner count. Empty measurements are excluded.");
    output("group", OpenLAPColumnDataType.Text, "Group", "The group of observations summarized by this row.");
    output("count", OpenLAPColumnDataType.Numeric, "Analysed observations", "Number of nonmissing numeric measurements in this summary row.");
    output("excluded_count", OpenLAPColumnDataType.Numeric, "Excluded observations", "Number of missing numeric measurements excluded from this summary row.");
    output("sum", OpenLAPColumnDataType.Numeric, "Sum", "Sum of the observed numeric measurements. Empty when no measurements are available.");
    output("mean", OpenLAPColumnDataType.Numeric, "Mean", "Arithmetic mean of the numeric measurements.");
    output("median", OpenLAPColumnDataType.Numeric, "Median", "50th percentile, using R-7 interpolation.");
    output("minimum", OpenLAPColumnDataType.Numeric, "Minimum", "Smallest numeric measurement.");
    output("maximum", OpenLAPColumnDataType.Numeric, "Maximum", "Largest numeric measurement.");
    output("range", OpenLAPColumnDataType.Numeric, "Range", "Maximum minus minimum. Zero when only one measurement is available.");
    output("variance", OpenLAPColumnDataType.Numeric, "Sample variance", "Sample variance (n - 1 denominator). Empty when fewer than two measurements are available.");
    output("standard_deviation", OpenLAPColumnDataType.Numeric, "Sample standard deviation", "Sample standard deviation (n - 1 denominator). Empty when fewer than two measurements are available.");
    output("q1", OpenLAPColumnDataType.Numeric, "First quartile", "25th percentile, using R-7 interpolation.");
    output("q3", OpenLAPColumnDataType.Numeric, "Third quartile", "75th percentile, using R-7 interpolation.");
    output("iqr", OpenLAPColumnDataType.Numeric, "Interquartile range", "Third quartile minus first quartile.");
  }

  final void summary(String group, List<Double> values, int excluded) {
    append("group", group);
    append("count", values.size());
    append("excluded_count", excluded);
    if (values.isEmpty()) {
      for (String key : List.of("sum", "mean", "median", "minimum", "maximum", "range", "variance", "standard_deviation", "q1", "q3", "iqr")) append(key, null);
      return;
    }
    double[] numbers = values.stream().mapToDouble(Double::doubleValue).toArray();
    DescriptiveStatistics stats = new DescriptiveStatistics(numbers);
    Percentile percentiles = new Percentile().withEstimationType(Percentile.EstimationType.R_7);
    double q1 = percentiles.evaluate(numbers, 25);
    double q3 = percentiles.evaluate(numbers, 75);
    append("sum", stats.getSum());
    append("mean", stats.getMean());
    append("median", percentiles.evaluate(numbers, 50));
    append("minimum", stats.getMin());
    append("maximum", stats.getMax());
    append("range", stats.getMax() - stats.getMin());
    append("variance", numbers.length > 1 ? stats.getVariance() : null);
    append("standard_deviation", numbers.length > 1 ? stats.getStandardDeviation() : null);
    append("q1", q1);
    append("q3", q3);
    append("iqr", q3 - q1);
  }
}
