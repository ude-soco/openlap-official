package org.openlap.visualizations.apexcharts;

import org.openlap.visualizations.common.ChartKind;

public final class ScatterPlot extends ApexChart {
  @Override
  protected ChartKind kind() {
    return ChartKind.SCATTER;
  }
}
