package com.openlap.analytics.methods;

import org.apache.commons.math3.stat.correlation.SpearmansCorrelation;

public final class SpearmanCorrelation extends CorrelationMethod {
  public SpearmanCorrelation() { super(); }
  @Override public String getAnalyticsMethodName() { return "Spearman rank correlation"; }
  @Override public String getAnalyticsMethodDescription() {
    return "Measure monotonic association using ranks, with tied values assigned their average rank. Both measurements must describe the same observation in each row. Missing pairs are excluded together. Requires three pairs and variation in both measurements; correlation does not establish causation.";
  }
  @Override double correlation(double[] x, double[] y) { return new SpearmansCorrelation().correlation(x, y); }
}
