package com.openlap.analytics.methods;

import com.openlap.dataset.OpenLAPColumnDataType;
import java.util.ArrayList;
import java.util.List;

abstract class CorrelationMethod extends AnalyticalMethod {
  CorrelationMethod() {
    super("correlation");
    input("x", OpenLAPColumnDataType.Numeric, true, "First numeric measurement", "First measurement for each observation. Both columns must describe the same learner, activity or event in the same row.");
    input("y", OpenLAPColumnDataType.Numeric, true, "Second numeric measurement", "Second measurement for the same observation. Rows missing either measurement are excluded together.");
    output("comparison", OpenLAPColumnDataType.Text, "Comparison", "The two mapped numeric measurements.");
    output("correlation", OpenLAPColumnDataType.Numeric, "Correlation coefficient", "Association from -1 to 1. Association does not establish causation.");
    output("count", OpenLAPColumnDataType.Numeric, "Analysed observation pairs", "Number of complete pairs used to calculate the coefficient.");
    output("excluded_count", OpenLAPColumnDataType.Numeric, "Excluded observation pairs", "Number of rows missing at least one measurement, excluded as a pair.");
  }

  @Override protected final void implementationExecution() {
    resetOutput();
    List<?> rawX = data("x"), rawY = data("y");
    sameRows(rawX, rawY);
    List<Double> x = new ArrayList<>(), y = new ArrayList<>();
    for (int row = 0; row < rawX.size(); row++) {
      Double first = numeric(rawX.get(row)), second = numeric(rawY.get(row));
      if (first != null && second != null) { x.add(first); y.add(second); }
    }
    if (x.size() < 3) throw invalid("At least three complete observation pairs are needed for a correlation preview.");
    double[] first = x.stream().mapToDouble(Double::doubleValue).toArray();
    double[] second = y.stream().mapToDouble(Double::doubleValue).toArray();
    if (constant(first) || constant(second)) throw invalid("Correlation is undefined when either measurement has no variation. Choose measurements with different values.");
    double coefficient = correlation(first, second);
    if (!Double.isFinite(coefficient)) throw invalid("A reliable correlation could not be calculated. Check the numerical range and variation of both inputs.");
    append("comparison", "First and second measurements");
    append("correlation", Math.max(-1, Math.min(1, coefficient)));
    append("count", x.size());
    append("excluded_count", rawX.size() - x.size());
  }

  private static boolean constant(double[] values) {
    for (int index = 1; index < values.length; index++) if (values[index] != values[0]) return false;
    return true;
  }

  abstract double correlation(double[] x, double[] y);
}
