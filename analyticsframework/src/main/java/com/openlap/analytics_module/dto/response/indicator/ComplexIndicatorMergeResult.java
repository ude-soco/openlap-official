package com.openlap.analytics_module.dto.response.indicator;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.openlap.dataset.OpenLAPColumnConfigData;
import com.openlap.dataset.OpenLAPDataSet;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

/** A normal typed dataset, with the provenance needed to explain a combination in the editor. */
@Getter
@Setter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ComplexIndicatorMergeResult extends OpenLAPDataSet {
  private int rowCount;
  private List<String> columnOrder = new ArrayList<>();
  private List<FilledCell> filledCells = new ArrayList<>();
  private List<SourceSummary> sources = new ArrayList<>();
  private OpenLAPDataSet chartData;

  @Override
  public List<OpenLAPColumnConfigData> getColumnsConfigurationData() {
    return columnOrder.stream().map(id -> getColumns().get(id).getConfigurationData()).toList();
  }

  public record FilledCell(int rowIndex, String columnId, String indicatorId) {}
  public record SourceSummary(
      String indicatorId, String label, int inputRows, int includedRows, int excludedRows) {}
}
