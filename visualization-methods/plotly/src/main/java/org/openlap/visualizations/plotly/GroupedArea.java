package org.openlap.visualizations.plotly;

import org.openlap.visualizations.common.ChartKind;

public final class GroupedArea extends PlotlyChart {
  @Override
  protected ChartKind kind() {
    return ChartKind.GROUPED_AREA;
  }
}
