package org.openlap.visualizations.c3;

import org.openlap.visualizations.common.ChartKind;

public final class ScatterPlot extends C3Chart {
  @Override
  protected ChartKind kind() {
    return ChartKind.SCATTER;
  }
}
