package com.openlap.analytics_module.entities;

import com.openlap.analytics_module.entities.utility_entities.IndicatorType;
import com.openlap.user.entities.User;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.DBRef;
import org.springframework.data.mongodb.core.mapping.Document;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Document("analytics-indicator-drafts")
public class IndicatorDrafts {
  @Id private String id;
  private String session;
  private IndicatorType indicatorType;
  @DBRef private User createdBy;
  private LocalDateTime lastUpdated;
  private String route;
}
