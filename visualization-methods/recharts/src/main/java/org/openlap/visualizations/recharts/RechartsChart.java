package org.openlap.visualizations.recharts;

import org.openlap.visualizations.common.BundledChart;

abstract class RechartsChart extends BundledChart {
  @Override
  protected final String renderer() {
    return "OpenLAPRecharts";
  }
}
