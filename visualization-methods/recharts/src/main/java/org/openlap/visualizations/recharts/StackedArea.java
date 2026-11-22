package org.openlap.visualizations.recharts;

import org.openlap.visualizations.common.ChartKind;

public final class StackedArea extends RechartsChart {
  @Override
  protected ChartKind kind() {
    return ChartKind.STACKED_AREA;
  }
}
