package com.openlap.analytics_technique.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.openlap.analytics_module.entities.utility_entities.IndicatorType;
import java.util.List;
import lombok.*;
import org.bson.Document;

@Data
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class AnalyticsTechniqueResponse {
  private String id;
  private String name;
  private String description;

  @JsonInclude(JsonInclude.Include.NON_EMPTY)
  private List<IndicatorType> recommendedFor;

  @JsonInclude(JsonInclude.Include.NON_NULL)
  private BasicInputRequirement basicInputRequirement;

  @JsonInclude(JsonInclude.Include.NON_EMPTY)
  private Document metadata;

  public AnalyticsTechniqueResponse(String id, String name, String description) {
    this(id, name, description, List.of(), null, null);
  }

  public enum BasicInputRequirement {
    EVENTS, CATEGORY, TIMESTAMP, OUTCOME, SCORE, SCORE_AND_CATEGORY
  }
}
