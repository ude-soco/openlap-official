package com.openlap.analytics_module.dto.response.indicator;

import com.openlap.dataset.OpenLAPColumnConfigData;
import java.util.List;

import com.openlap.dataset.OpenLAPDataSet;
import lombok.*;

@Data
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class CompatibleIndicatorsColumnsMergeForMultiLevel {
  private String indicatorId;
  private String name;
  private List<OpenLAPColumnConfigData> columnsToMerge;
  private OpenLAPDataSet analyzedDataset;
}
