package com.openlap.configurations;

import com.openlap.template.model.ChartConfiguration;
import org.bson.Document;
import org.springframework.core.convert.converter.Converter;
import org.springframework.data.convert.ReadingConverter;

/** Reads the published template's constructor without relying on absent parameter-name metadata. */
@ReadingConverter
final class ChartConfigurationReadConverter implements Converter<Document, ChartConfiguration> {
  @Override
  public ChartConfiguration convert(Document source) {
    return new ChartConfiguration(
        flag(source, "isShowHideLegendAvailable"),
        flag(source, "isLegendPositionChangeable"),
        flag(source, "isLegendPositionBottomAvailable"),
        flag(source, "isLegendPositionTopAvailable"),
        flag(source, "isLegendPositionLeftAvailable"),
        flag(source, "isLegendPositionRightAvailable"),
        flag(source, "isShowHideAxesAvailable"),
        flag(source, "isShowHideXAxisAvailable"),
        flag(source, "isShowHideYAxisAvailable"),
        flag(source, "isChartTitleAvailable"),
        flag(source, "isChartSubtitleAvailable"),
        flag(source, "isTitleAndSubtitlePositionChangeable"),
        flag(source, "isTitleAndSubtitlePositionCenterAvailable"),
        flag(source, "isTitleAndSubtitlePositionLeftAvailable"),
        flag(source, "isTitleAndSubtitlePositionRightAvailable"),
        flag(source, "isShowHideLabelsAvailable"),
        flag(source, "isShowHideLabelsBackgroundAvailable"),
        flag(source, "isLabelsPositionChangeable"),
        flag(source, "isLabelsPositionTopAvailable"),
        flag(source, "isLabelsPositionBottomAvailable"),
        flag(source, "isLabelsPositionCenterAvailable"),
        flag(source, "isSeriesColorChangeable"),
        flag(source, "isSeriesSingleColor"),
        flag(source, "isSeriesMultipleColor"),
        flag(source, "isSortingOrderChangeable"),
        flag(source, "isSortingOrderAscendingAvailable"),
        flag(source, "isSortingOrderDescendingAvailable"),
        flag(source, "isCategoriesFilteringAvailable"));
  }

  private static boolean flag(Document source, String name) {
    Object value = source.get(name);
    // Absent optional capabilities remain disabled, including documents from older templates.
    if (value == null) return false;
    if (!(value instanceof Boolean)) {
      throw new IllegalArgumentException("Stored chart configuration flags must be boolean.");
    }
    return (Boolean) value;
  }
}
