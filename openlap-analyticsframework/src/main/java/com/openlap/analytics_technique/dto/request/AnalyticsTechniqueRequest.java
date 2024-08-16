package com.openlap.analytics_technique.dto.request;

import javax.validation.constraints.NotBlank;
import lombok.*;

@Data
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AnalyticsTechniqueRequest {
  @NotBlank(message = "'name' attribute is required")
  private String name;

  @NotBlank(message = "'description' attribute is required")
  private String description;

  @NotBlank(message = "'type' attribute is required")
  private String type;

  @NotBlank(message = "'creator' attribute is required")
  private String creator;

  @NotBlank(message = "'fileName' attribute is required")
  private String fileName;

  @NotBlank(message = "'implementingClass' attribute is required")
  private String implementingClass;

  @NotBlank(message = "'outputs' attribute is required")
  private String outputs;
}
