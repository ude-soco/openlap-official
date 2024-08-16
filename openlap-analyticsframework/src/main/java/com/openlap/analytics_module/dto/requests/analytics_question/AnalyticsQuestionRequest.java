package com.openlap.analytics_module.dto.requests.analytics_question;

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
public class AnalyticsQuestionRequest {
  @NotBlank(message = "Goal id is mandatory")
  private String goalId;

  @NotBlank(message = "Question is mandatory")
  private String question;

  @NotNull(message = "Indicators cannot be null")
  @Valid
  private List<@NotBlank(message = "Indicator cannot be blank") String> indicators;
}
