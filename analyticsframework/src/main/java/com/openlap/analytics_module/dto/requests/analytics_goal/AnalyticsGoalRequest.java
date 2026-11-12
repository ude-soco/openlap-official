package com.openlap.analytics_module.dto.requests.analytics_goal;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class AnalyticsGoalRequest {
  @NotBlank(message = "Goal name is mandatory")
  private String category;

  @NotBlank(message = "Goal name is mandatory")
  private String verb;

  @NotBlank(message = "Goal description is mandatory")
  private String description;

  @NotNull(message = "Goal status is mandatory")
  private GoalStatus status;
}
