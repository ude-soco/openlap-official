package com.openlap.analytics_module.dto.requests.indicator;

import com.openlap.dataset.OpenLAPColumnConfigData;
import javax.validation.Valid;
import javax.validation.constraints.NotBlank;
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
}
