package org.openlap.visualizations.plotly;

import org.openlap.visualizations.common.ChartKind;

public final class StackedArea extends PlotlyChart {
  @Override
  protected ChartKind kind() {
    return ChartKind.STACKED_AREA;
  }
}
