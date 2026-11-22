package org.openlap.visualizations.recharts;

import org.openlap.visualizations.common.ChartKind;

public final class ScatterPlot extends RechartsChart {
  @Override
  protected ChartKind kind() {
    return ChartKind.SCATTER;
  }
}
