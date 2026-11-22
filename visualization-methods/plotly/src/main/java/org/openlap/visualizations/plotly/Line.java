package org.openlap.visualizations.plotly;

import org.openlap.visualizations.common.ChartKind;

public final class Line extends PlotlyChart {
  @Override
  protected ChartKind kind() {
    return ChartKind.LINE;
  }
}
