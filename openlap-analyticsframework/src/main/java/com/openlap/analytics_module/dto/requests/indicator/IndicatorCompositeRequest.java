package com.openlap.analytics_module.dto.requests.indicator;

import com.openlap.analytics_module.custom_annotators.ValidIndicatorType;
import com.openlap.analytics_module.entities.utility_entities.IndicatorType;
import com.openlap.dataset.OpenLAPColumnConfigData;
import com.openlap.dataset.OpenLAPPortConfig;
import java.util.ArrayList;
import java.util.List;
import lombok.*;

import javax.validation.Valid;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotEmpty;
import javax.validation.constraints.NotNull;

@Data
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class IndicatorCompositeRequest {

  @NotBlank(message = "Name is mandatory")
  private String name;

  @NotNull(message = "Indicator type is mandatory")
  @ValidIndicatorType(value = IndicatorType.COMPOSITE)
  private IndicatorType indicatorType;

  @NotBlank(message = "Visualization library ID is mandatory")
  private String visualizationLibraryId;

  @NotBlank(message = "Visualization type ID is mandatory")
  private String visualizationTypeId;

  // Assuming this object doesn't need specific validation annotations
  private Object visualizationParams;

  @NotNull(message = "Visualization mapping is mandatory")
  @Valid
  private OpenLAPPortConfig visualizationMapping;

  // Only for COMPOSITE
  @Valid private OpenLAPColumnConfigData columnToMerge;

  // Only for COMPOSITE (without columnToMerge attribute) & MULTI
  @Valid
  @NotEmpty(message = "List of indicators is mandatory")
  private List<IndicatorsToMergeRequest> indicators = new ArrayList<>();
}
