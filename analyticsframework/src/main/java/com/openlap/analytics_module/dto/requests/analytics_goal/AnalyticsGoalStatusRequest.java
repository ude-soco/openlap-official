package com.openlap.analytics_module.dto.requests.analytics_goal;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import lombok.*;

@Data
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class AnalyticsGoalStatusRequest {
  @NotBlank(message = "Goal ID is mandatory")
  private String goalId;

  @NotNull(message = "Goal status is mandatory")
  private GoalStatus status;
}
