package org.openlap.visualizations.recharts;

import org.openlap.visualizations.common.ChartKind;

public final class Area extends RechartsChart {
  @Override
  protected ChartKind kind() {
    return ChartKind.AREA;
  }
}
