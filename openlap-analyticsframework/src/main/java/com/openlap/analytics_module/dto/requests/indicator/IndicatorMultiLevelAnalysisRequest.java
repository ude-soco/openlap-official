package com.openlap.analytics_module.dto.requests.indicator;

import com.openlap.dataset.OpenLAPPortConfig;
import com.openlap.dynamicparam.OpenLAPDynamicParam;
import java.util.ArrayList;
import java.util.List;
import javax.validation.Valid;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotEmpty;
import javax.validation.constraints.NotNull;
import lombok.*;

@Data
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class IndicatorMultiLevelAnalysisRequest {
  @Valid
  @NotEmpty(message = "List of indicators is mandatory")
  private List<IndicatorsToMergeRequest> indicators;

  @NotBlank(message = "Analytics technique ID is mandatory")
  private String analyticsTechniqueId;

  @NotNull(message = "Analytics technique mapping is mandatory")
  @Valid
  private OpenLAPPortConfig analyticsTechniqueMapping;

  @Valid private List<OpenLAPDynamicParam> analyticsTechniqueParams = new ArrayList<>();
}
