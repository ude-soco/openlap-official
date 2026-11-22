package org.openlap.visualizations.c3;

import org.openlap.visualizations.common.ChartKind;

public final class Pie extends C3Chart {
  @Override
  protected ChartKind kind() {
    return ChartKind.PIE;
  }
}
