package com.openlap.analytics_module.dto.requests.indicator;

import com.openlap.analytics_module.custom_annotators.ValidIndicatorType;
import com.openlap.analytics_module.entities.utility_entities.IndicatorType;
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
public class IndicatorBasicRequest {

  @NotBlank(message = "Name is mandatory")
  private String name;

  @NotNull(message = "Indicator type is mandatory")
  @ValidIndicatorType(value = IndicatorType.BASIC)
  private IndicatorType indicatorType;

  @NotBlank(message = "Visualization library ID is mandatory")
  private String visualizationLibraryId;

  @NotBlank(message = "Visualization type ID is mandatory")
  private String visualizationTypeId;

  private Object visualizationParams;

  @NotNull(message = "Visualization mapping is mandatory")
  @Valid
  private OpenLAPPortConfig visualizationMapping;

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
