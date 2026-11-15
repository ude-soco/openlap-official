package com.openlap.analytics_module.dto.requests.indicator;

import com.openlap.dataset.OpenLAPColumnConfigData;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.*;

@Data
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class IndicatorsToMergeRequest {
  @NotBlank(message = "Indicator ID is mandatory")
  private String indicatorId;

  @Valid // It ensures that columnToMerge is validated if it's provided
  private OpenLAPColumnConfigData columnToMerge;

  @Size(max = 32, message = "Select at most 32 measures per indicator")
  private List<String> measureColumnIds;

  @Size(max = 100, message = "Series labels must be at most 100 characters")
  private String label;

  public IndicatorsToMergeRequest(String indicatorId, OpenLAPColumnConfigData columnToMerge) {
    this.indicatorId = indicatorId;
    this.columnToMerge = columnToMerge;
  }
}
