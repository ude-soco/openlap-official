package org.openlap.visualizations.plotly;

import org.openlap.visualizations.common.ChartKind;

public final class MultiLine extends PlotlyChart {
  @Override
  protected ChartKind kind() {
    return ChartKind.MULTI_LINE;
  }
}
