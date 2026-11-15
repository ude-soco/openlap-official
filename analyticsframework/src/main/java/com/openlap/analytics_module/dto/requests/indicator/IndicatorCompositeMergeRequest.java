package com.openlap.analytics_module.dto.requests.indicator;

import com.openlap.dataset.OpenLAPColumnConfigData;
import java.util.ArrayList;
import java.util.List;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.*;

@Data
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class IndicatorCompositeMergeRequest {
  @Valid private OpenLAPColumnConfigData columnToMerge;

  @Valid
  @NotEmpty(message = "List of indicators is mandatory")
  @Size(min = 2, max = 10, message = "Choose between two and ten indicators")
  private List<IndicatorsToMergeRequest> indicators = new ArrayList<>();
}
