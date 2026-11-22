package org.openlap.visualizations.apexcharts;

import org.openlap.visualizations.common.ChartKind;

public final class Line extends ApexChart {
  @Override
  protected ChartKind kind() {
    return ChartKind.LINE;
  }
}
