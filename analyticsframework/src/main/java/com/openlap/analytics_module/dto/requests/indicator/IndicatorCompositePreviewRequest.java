package com.openlap.analytics_module.dto.requests.indicator;

import com.openlap.dataset.OpenLAPColumnConfigData;
import com.openlap.dataset.OpenLAPPortConfig;
import java.util.ArrayList;
import java.util.List;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class IndicatorCompositePreviewRequest {

  @NotBlank(message = "Visualization library ID is mandatory")
  private String visualizationLibraryId;

  @NotBlank(message = "Visualization type ID is mandatory")
  private String visualizationTypeId;

  private Object visualizationParams;

  @NotNull(message = "Visualization mapping is mandatory")
  @Valid
  private OpenLAPPortConfig visualizationMapping;

  // Only for COMPOSITE
  @Valid private OpenLAPColumnConfigData columnToMerge;

  @Valid
  @NotEmpty(message = "List of indicators is mandatory")
  private List<IndicatorsToMergeRequest> indicators = new ArrayList<>();
}
