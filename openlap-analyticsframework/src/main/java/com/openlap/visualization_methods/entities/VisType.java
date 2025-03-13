package com.openlap.visualization_methods.entities;

import javax.validation.constraints.NotNull;

import com.openlap.template.model.ChartConfiguration;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.DBRef;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Document("visualization-type")
public class VisType {
  @Id private String id;
  @DBRef private VisLibrary visualizationLib;

  @NotNull(message = "'name' attribute is required")
  private String name;

  private ChartConfiguration chartConfiguration;

  @NotNull(message = "'implementingClass' attribute is required")
  private String implementingClass;
  // ? Description could be added in the future
}
