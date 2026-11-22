package org.openlap.visualizations.plotly;

import org.openlap.visualizations.common.BundledChart;

abstract class PlotlyChart extends BundledChart {
  @Override
  protected final String renderer() {
    return "OpenLAPPlotly";
  }
}
