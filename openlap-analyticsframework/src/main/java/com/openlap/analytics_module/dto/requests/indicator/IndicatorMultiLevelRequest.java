package com.openlap.analytics_module.dto.requests.indicator;

import com.openlap.analytics_module.custom_annotators.ValidIndicatorType;
import com.openlap.analytics_module.entities.utility_entities.IndicatorType;
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
public class IndicatorMultiLevelRequest {

  @NotBlank(message = "Name is mandatory")
  private String name;

  @NotNull(message = "Indicator type is mandatory")
  @ValidIndicatorType(value = IndicatorType.MULTI_LEVEL)
  private IndicatorType indicatorType;

  @NotBlank(message = "Visualization library ID is mandatory")
  private String visualizationLibraryId;

  @NotBlank(message = "Visualization type ID is mandatory")
  private String visualizationTypeId;

  private Object visualizationParams;

  @NotNull(message = "Visualization mapping is mandatory")
  @Valid
  private OpenLAPPortConfig visualizationMapping;

  @NotBlank(message = "Analytics technique ID is mandatory")
  private String analyticsTechniqueId;

  @NotNull(message = "Analytics technique mapping is mandatory")
  @Valid
  private OpenLAPPortConfig analyticsTechniqueMapping;

  @Valid private List<OpenLAPDynamicParam> analyticsTechniqueParams = new ArrayList<>();

  @Valid
  @NotEmpty(message = "List of indicators is mandatory")
  private List<IndicatorsToMergeRequest> indicators = new ArrayList<>();
}
