package org.openlap.visualizations.common;

public enum ChartKind {
  BAR("bar", "Bar Chart"),
  LINE("line", "Line Chart"),
  AREA("area", "Area Chart"),
  PIE("pie", "Pie Chart"),
  DONUT("donut", "Donut Chart"),
  SCATTER("scatter", "Scatter Plot"),
  GROUPED_AREA("grouped-area", "Grouped Area Chart"),
  STACKED_AREA("stacked-area", "Stacked Area Chart"),
  MULTI_LINE("multi-line", "Multi Line Chart");

  final String id;
  final String title;

  ChartKind(String id, String title) {
    this.id = id;
    this.title = title;
  }

  boolean usesSeries() {
    return this == GROUPED_AREA || this == STACKED_AREA || this == MULTI_LINE;
  }

  boolean usesSlices() {
    return this == PIE || this == DONUT;
  }
}
