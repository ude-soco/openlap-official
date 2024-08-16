package com.openlap.analytics_module.entities;

import com.openlap.user.entities.User;
import java.time.LocalDate;
import java.util.List;
import javax.validation.constraints.NotNull;
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
@Document("analytics-question")
public class AnalyticsQuestion {
  @Id private String id;

  @NotNull(message = "Name is mandatory")
  private String name;

  @DBRef private User createdBy;

  private LocalDate createdOn;

  private Integer count;
  @DBRef private AnalyticsGoal goalRef;

  @DBRef private List<Indicator> indicators;
}
