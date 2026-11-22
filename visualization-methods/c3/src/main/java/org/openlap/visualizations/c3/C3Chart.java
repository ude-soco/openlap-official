package org.openlap.visualizations.c3;

import org.openlap.visualizations.common.BundledChart;

abstract class C3Chart extends BundledChart {
  @Override
  protected final String renderer() {
    return "OpenLAPC3";
  }
}
