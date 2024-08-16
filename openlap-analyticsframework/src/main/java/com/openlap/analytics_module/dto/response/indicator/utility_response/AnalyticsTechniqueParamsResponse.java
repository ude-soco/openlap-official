package com.openlap.analytics_module.dto.response.indicator.utility_response;

import lombok.*;

@Data
@Setter
@Getter
@AllArgsConstructor
@NoArgsConstructor
public class AnalyticsTechniqueParamsResponse<T> {
  private String id;
  private String title;
  private T value;
}
