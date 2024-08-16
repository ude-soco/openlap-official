package com.openlap.analytics_module.entities;

import javax.validation.constraints.NotNull;
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
@Document("analytics-goal")
public class AnalyticsGoal {
  @Id private String id;

  @NotNull(message = "'name' attribute is required")
  private String name;

  @NotNull(message = "'description' attribute of is required")
  private String description;

  @NotNull(message = "'author' attribute is required")
  private String author;

  @NotNull(message = "'active' attribute is required")
  private boolean active;

  //  private String analyticsMethods;
}
