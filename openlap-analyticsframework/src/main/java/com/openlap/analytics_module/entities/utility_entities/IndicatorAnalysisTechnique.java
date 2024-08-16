package com.openlap.analytics_module.entities.utility_entities;

import com.openlap.dataset.OpenLAPPortConfig;
import com.openlap.dynamicparam.OpenLAPDynamicParam;
import java.util.ArrayList;
import java.util.List;
import lombok.*;

@Data
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class IndicatorAnalysisTechnique {
  private String analyticsTechniqueId;
  private OpenLAPPortConfig analyticsTechniqueMapping;
  private List<OpenLAPDynamicParam> analyticsTechniqueParams = new ArrayList<>();
}
