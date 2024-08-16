package com.openlap.analytics_module.dto.response.analytics_question;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.openlap.analytics_module.dto.response.indicator.IndicatorWithCodeResponse;
import java.time.LocalDate;
import java.util.List;
import lombok.*;

@Data
@Setter
@Getter
@AllArgsConstructor
@NoArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AnalyticsQuestionResponse {
  private String id;
  private String question;
  private Integer count;
  private String createdBy;
  private LocalDate createdOn;
  private String goal;
  private List<IndicatorWithCodeResponse> indicators;
}
