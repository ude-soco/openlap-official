package com.openlap.analytics_module.dto.response.indicator;

import com.openlap.analytics_module.entities.utility_entities.IndicatorType;
import java.time.LocalDate;
import java.time.LocalDateTime;

import lombok.*;

@Data
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class IndicatorResponse {
  private String id;
  private IndicatorType type;
  private String createdBy;
  private String name;
  private LocalDateTime createdOn;
}
