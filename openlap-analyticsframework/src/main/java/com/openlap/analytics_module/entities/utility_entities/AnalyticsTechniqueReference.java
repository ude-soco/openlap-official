package com.openlap.analytics_module.entities.utility_entities;

import com.openlap.analytics_technique.entities.AnalyticsTechnique;
import lombok.*;
import org.springframework.data.mongodb.core.mapping.DBRef;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class AnalyticsTechniqueReference {
  private String additionalParams;
  private String queryToAnalyticsTechniqueMapping; // Only for BASIC and MULTI
  @DBRef private AnalyticsTechnique analyticsTechnique;
}
