package com.openlap.visualization_methods.entities;

import lombok.*;

@Data
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor

public class ChartConfiguration {
    private boolean isShowHideLegendAvailable;
    private boolean isLegendPositionChangeable;
    private boolean isLegendPositionBottomAvailable;
    private boolean isLegendPositionTopAvailable;
    private boolean isLegendPositionLeftAvailable;
    private boolean isLegendPositionRightAvailable;
    private boolean isShowHideAxesAvailable;
    private boolean isShowHideXAxisAvailable;
    private boolean isShowHideYAxisAvailable;
    private boolean isChartTitleAvailable;
    private boolean isChartSubtitleAvailable;
    private boolean isTitleAndSubtitlePositionChangeable;
    private boolean isTitleAndSubtitlePositionCenterAvailable;
    private boolean isTitleAndSubtitlePositionLeftAvailable;
    private boolean isTitleAndSubtitlePositionRightAvailable;
    private boolean isShowHideLabelsAvailable;
    private boolean isShowHideLabelsBackgroundAvailable;
    private boolean isLabelsPositionChangeable;
    private boolean isLabelsPositionTopAvailable;
    private boolean isLabelsPositionBottomAvailable;
    private boolean isLabelsPositionCenterAvailable;
    private boolean isSeriesColorChangeable;
    private boolean isSeriesSingleColor;
    private boolean isSeriesMultipleColor;
    private boolean isSortingOrderChangeable;
    private boolean isSortingOrderAscendingAvailable;
    private boolean isSortingOrderDescendingAvailable;
    private boolean isCategoriesFilteringAvailable;
}
