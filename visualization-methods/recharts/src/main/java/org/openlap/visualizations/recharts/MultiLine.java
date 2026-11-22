package org.openlap.visualizations.recharts;

import org.openlap.visualizations.common.ChartKind;

public final class MultiLine extends RechartsChart {
  @Override
  protected ChartKind kind() {
    return ChartKind.MULTI_LINE;
  }
}
