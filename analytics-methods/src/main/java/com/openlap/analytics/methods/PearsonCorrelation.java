package com.openlap.analytics.methods;

import org.apache.commons.math3.stat.correlation.PearsonsCorrelation;

public final class PearsonCorrelation extends CorrelationMethod {
  public PearsonCorrelation() { super(); }
  @Override public String getAnalyticsMethodName() { return "Pearson correlation"; }
  @Override public String getAnalyticsMethodDescription() {
    return "Measure linear association between two numeric measurements aligned by observation. Use one prepared row per learner when comparing learners. Complete pairs are counted, missing pairs are excluded together. Requires three pairs and variation in both measurements; correlation does not establish causation.";
  }
  @Override double correlation(double[] x, double[] y) { return new PearsonsCorrelation().correlation(x, y); }
}
