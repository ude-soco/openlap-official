package com.openlap.analytics_module.dto.response.indicator;

import com.openlap.analytics_technique.dto.response.AnalyticsTechniqueResponse;
import com.openlap.dataset.OpenLAPColumnConfigData;
import java.util.List;
import lombok.*;

@Data
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class CompatibleIndicatorsCompositeResponse {
  private List<IndicatorWithCodeResponse> indicators;
  private AnalyticsTechniqueResponse analyticsTechnique;
  private List<OpenLAPColumnConfigData> analyticsOutputs;
}
