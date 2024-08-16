package com.openlap.analytics_technique.entities;

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
@Document("analytics-technique")
public class AnalyticsTechnique {
  @Id private String id;

  @NotNull(message = "'name' attribute is required")
  private String name;

  @NotNull(message = "'description' attribute is required")
  private String description;

  @NotNull(message = "'type' attribute is required")
  private String type;

  @NotNull(message = "'creator' attribute is required")
  private String creator;

  @NotNull(message = "'fileName' attribute is required")
  private String fileName;

  @NotNull(message = "'implementingClass' attribute is required")
  private String implementingClass;

  @NotNull(message = "'outputs' attribute is required")
  private String outputs;
}
