package org.openlap.visualizations.apexcharts;

import org.openlap.visualizations.common.BundledChart;

abstract class ApexChart extends BundledChart {
  @Override
  protected final String renderer() {
    return "OpenLAPApex";
  }
}
