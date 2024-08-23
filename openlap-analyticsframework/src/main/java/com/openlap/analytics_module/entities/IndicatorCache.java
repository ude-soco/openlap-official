package com.openlap.analytics_module.entities;

import java.time.LocalDateTime;

import com.openlap.dataset.OpenLAPDataSet;
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
@Document("analytics-indicator-cache")
public class IndicatorCache {
  @Id private String id;
  private String indicatorCode;
  private String analyzedDataset;
  private LocalDateTime createdOn;
}
