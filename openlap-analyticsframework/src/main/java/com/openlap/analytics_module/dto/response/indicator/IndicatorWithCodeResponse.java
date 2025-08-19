package com.openlap.analytics_module.dto.response.indicator;

import com.openlap.analytics_module.entities.utility_entities.AnalyticsTechniqueReference;
import com.openlap.analytics_module.entities.utility_entities.IndicatorType;
import java.time.LocalDate;
import java.time.LocalDateTime;

import com.openlap.analytics_technique.entities.AnalyticsTechnique;
import com.openlap.dataset.OpenLAPDataSet;
import lombok.*;

@Data
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class IndicatorWithCodeResponse {
  private String id;
  private IndicatorType type;
  private String createdBy;
  private String name;
  private LocalDateTime createdOn;
  private AnalyticsTechnique analyticsTechnique;
  private String indicatorCode;
}
