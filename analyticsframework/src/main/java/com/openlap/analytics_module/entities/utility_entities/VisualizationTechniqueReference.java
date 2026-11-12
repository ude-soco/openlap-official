package com.openlap.analytics_module.entities.utility_entities;

import com.openlap.visualization_methods.entities.VisLibrary;
import com.openlap.visualization_methods.entities.VisType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.mongodb.core.mapping.DBRef;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class VisualizationTechniqueReference {
  private String additionalParams;
  private String analyticsTechniqueToVisualizationMapping;
  @DBRef private VisLibrary visLibrary;
  @DBRef private VisType visType;
}
