package org.openlap.visualizations.c3;

import org.openlap.visualizations.common.ChartKind;

public final class StackedArea extends C3Chart {
  @Override
  protected ChartKind kind() {
    return ChartKind.STACKED_AREA;
  }
}
