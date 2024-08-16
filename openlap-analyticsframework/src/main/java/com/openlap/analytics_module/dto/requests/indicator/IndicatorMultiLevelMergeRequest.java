package com.openlap.analytics_module.dto.requests.indicator;

import java.util.List;
import javax.validation.Valid;
import javax.validation.constraints.NotEmpty;
import lombok.*;

@Data
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class IndicatorMultiLevelMergeRequest {
  @Valid
  @NotEmpty(message = "List of indicators is mandatory")
  private List<IndicatorsToMergeRequest> indicators;
}
