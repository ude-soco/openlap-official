package com.openlap.analytics_technique.dto.response;

import com.openlap.dataset.OpenLAPColumnConfigData;
import com.openlap.dynamicparam.OpenLAPDynamicParam;
import lombok.*;

import java.util.List;

@Data
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class AnalyticsTechniqueInputParamResponse {
  private List<OpenLAPColumnConfigData> inputs;
  private List<OpenLAPDynamicParam> params;
}
