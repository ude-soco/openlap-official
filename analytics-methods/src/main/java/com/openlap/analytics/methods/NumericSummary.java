package com.openlap.analytics.methods;

import java.util.ArrayList;
import java.util.List;

/** Summaries over actual numerical observations, rather than category frequencies. */
public final class NumericSummary extends SummaryMethod {
  public NumericSummary() { super(); }
  @Override public String getAnalyticsMethodName() { return "Summarize numeric values"; }
  @Override public String getAnalyticsMethodDescription() {
    return "Summarize a numerical measurement with count, sum, mean, median, range, sample variance, sample standard deviation and quartiles. One input row is one observation, such as a quiz attempt. Missing values are excluded and counted.";
  }
  @Override protected void implementationExecution() {
    resetOutput();
    List<?> input = data("values");
    if (input.size() > MAX_ROWS) throw invalid("This method supports at most " + MAX_ROWS + " observations per preview.");
    List<Double> values = new ArrayList<>();
    for (Object item : input) {
      Double value = numeric(item);
      if (value != null) values.add(value);
    }
    if (values.isEmpty()) throw invalid("No numeric measurements are available for this selection. Choose another input or adjust your filters.");
    summary("All observations", values, input.size() - values.size());
  }
}
