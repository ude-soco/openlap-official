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

  /** Soft-disable flag. Boxed + default true so legacy documents (missing the field) read enabled. */
  private Boolean enabled = true;

  /** Added explicitly by artifact migration; catalog IDs and legacy paths remain intact. */
  private String artifactId;

  /** New entries remain invisible until their complete installation is ACTIVE. */
  private String installationId;

  /** Treats a missing/null flag (legacy documents) as enabled. */
  public boolean isEnabled() {
    return enabled == null || enabled;
  }
}
