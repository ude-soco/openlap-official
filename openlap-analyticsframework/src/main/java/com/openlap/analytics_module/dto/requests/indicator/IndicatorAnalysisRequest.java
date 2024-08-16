package com.openlap.analytics_module.dto.requests.indicator;

import com.openlap.analytics_statements.dtos.request.StatementsRequest;
import com.openlap.dataset.OpenLAPPortConfig;
import com.openlap.dynamicparam.OpenLAPDynamicParam;
import java.util.ArrayList;
import java.util.List;
import javax.validation.Valid;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import lombok.*;

@Data
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class IndicatorAnalysisRequest {
  @NotNull(message = "Indicator query is mandatory")
  @Valid
  private StatementsRequest indicatorQuery;

  @NotBlank(message = "Analytics technique ID is mandatory")
  private String analyticsTechniqueId;

  @NotNull(message = "Analytics technique mapping is mandatory")
  @Valid
  private OpenLAPPortConfig analyticsTechniqueMapping;

  @Valid private List<OpenLAPDynamicParam> analyticsTechniqueParams = new ArrayList<>();
}
