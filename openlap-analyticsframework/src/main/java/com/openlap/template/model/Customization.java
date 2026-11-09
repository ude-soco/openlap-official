package com.openlap.template.model;

/**
 * String-value compatibility bridge for the reviewed historical C3 plugin.
 *
 * <p>The template dependency no longer supplies this binary name. This original
 * implementation supports the constructor/accessors called by the nine chart
 * classes in the pinned historical artifact; it does not recreate an unknown
 * original implementation. Chart code supplies defaults and normalizes colors
 * and title placement itself. Keep those transformations in the chart code.
 */
public final class Customization {
  private final String width;
  private final String height;
  private final String showLegend;
  private final String legendPosition;
  private final String showXAxis;
  private final String showYAxis;
  private final String chartTitle;
  private String titleAndSubTitlePosition;
  private final String showLabels;
  private String colorsArray;
  private final String sortingOrder;
  private final String hiddenCategoriesIndexes;

  // All sixteen String slots preserve the historical JVM constructor descriptor.
  // The reviewed renderers do not read yLabel, chartSubtitle, showLabelsBackground
  // or labelsPosition through this model, so no additional API is invented here.
  public Customization(String width, String height, String yLabel,
      String showLegend, String legendPosition, String showXAxis, String showYAxis,
      String chartTitle, String chartSubtitle, String titleAndSubTitlePosition,
      String showLabels, String showLabelsBackground, String labelsPosition,
      String colorsArray, String sortingOrder, String hiddenCategoriesIndexes) {
    this.width = width;
    this.height = height;
    this.showLegend = showLegend;
    this.legendPosition = legendPosition;
    this.showXAxis = showXAxis;
    this.showYAxis = showYAxis;
    this.chartTitle = chartTitle;
    this.titleAndSubTitlePosition = titleAndSubTitlePosition;
    this.showLabels = showLabels;
    this.colorsArray = colorsArray;
    this.sortingOrder = sortingOrder;
    this.hiddenCategoriesIndexes = hiddenCategoriesIndexes;
  }

  public String getWidth() { return width; }
  public String getHeight() { return height; }
  public String getShowLegend() { return showLegend; }
  public String getLegendPosition() { return legendPosition; }
  public String getShowXAxis() { return showXAxis; }
  public String getShowYAxis() { return showYAxis; }
  public String getChartTitle() { return chartTitle; }
  public String getTitleAndSubTitlePosition() { return titleAndSubTitlePosition; }
  public String getShowLabels() { return showLabels; }
  public String getColorsArray() { return colorsArray; }
  public String getSortingOrder() { return sortingOrder; }
  public String getHiddenCategoriesIndexes() { return hiddenCategoriesIndexes; }
  public void setColorsArray(String value) { colorsArray = value; }
  public void setTitleAndSubTitlePosition(String value) { titleAndSubTitlePosition = value; }
}
