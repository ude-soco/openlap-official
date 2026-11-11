package com.openlap.analytics_module.dto.requests.indicator;

import com.openlap.analytics_module.entities.utility_entities.IndicatorType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class IndicatorDraftRequest {
  @NotBlank(message = "Session is mandatory")
  private String session;

  @NotNull(message = "Indicator type is mandatory")
  private IndicatorType indicatorType;

  @NotBlank(message = "Route is mandatory")
  private String route;
}
