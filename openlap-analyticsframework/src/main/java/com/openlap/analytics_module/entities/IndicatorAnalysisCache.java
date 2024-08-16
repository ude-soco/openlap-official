package com.openlap.analytics_module.entities;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Document("analytics-indicator-analysis-cache")
public class IndicatorAnalysisCache {
  @Id private String id;
  private String analyzedData;
  private LocalDateTime createdOn;
}
