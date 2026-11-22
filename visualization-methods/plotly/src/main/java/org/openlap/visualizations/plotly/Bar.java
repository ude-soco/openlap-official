package org.openlap.visualizations.plotly;

import org.openlap.visualizations.common.ChartKind;

public final class Bar extends PlotlyChart {
  @Override
  protected ChartKind kind() {
    return ChartKind.BAR;
  }
}
