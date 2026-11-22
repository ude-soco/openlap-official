package org.openlap.visualizations.plotly;

import org.openlap.visualizations.common.ChartKind;

public final class Area extends PlotlyChart {
  @Override
  protected ChartKind kind() {
    return ChartKind.AREA;
  }
}
