package com.openlap.analytics_module.dto.response.indicator.utility_response;

import java.util.List;
import lombok.*;

@Data
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AnalyticsTechniqueStatementResponse {
  private List<String> platforms;
  private List<String> activityTypes;
  private List<String> actionOnActivities;
  private List<String> activities;
  private String durationFrom;
  private String durationUntil;
}
