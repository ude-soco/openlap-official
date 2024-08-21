package com.openlap.analytics_module.entities;

import com.openlap.user.entities.User;
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
@Document("analytics-goal")
public class AnalyticsGoal {
  @Id private String id;
  private String category;
  private String verb;
  private String description;
  private boolean custom;
  private boolean active;
}
