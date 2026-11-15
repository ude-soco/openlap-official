package com.openlap.analytics_module.entities;

import com.openlap.analytics_module.entities.utility_entities.AnalyticsTechniqueReference;
import com.openlap.analytics_module.entities.utility_entities.IndicatorType;
import com.openlap.analytics_module.entities.utility_entities.IndicatorsToMerge;
import com.openlap.analytics_module.entities.utility_entities.VisualizationTechniqueReference;
import com.openlap.user.entities.User;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

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
@Document("analytics-indicator")
public class Indicator {
  // For BASIC, COMPOSITE & MULTI
  @Id private String id;
  private String name;
  private IndicatorType indicatorType;
  @DBRef private User createdBy;
  private VisualizationTechniqueReference visualizationTechniqueReference;
  private LocalDateTime createdOn;
  private Integer timesExecuted;
  @DBRef private AnalyticsGoal goalRef;
  private String configurationRequest;

  // Community IDs are opaque public references; provenance contains no author identity.
  private String communityId;
  private String communitySourceId;
  private String communitySourceVersion;
  private boolean communityDependency;
  private String communityCopyPending;

  /** Preserve the existing saved-definition constructor for plugins and legacy services. */
  public Indicator(String id, String name, IndicatorType indicatorType, User createdBy,
      VisualizationTechniqueReference visualizationTechniqueReference, LocalDateTime createdOn,
      Integer timesExecuted, AnalyticsGoal goalRef, String configurationRequest,
      String indicatorQuery, AnalyticsTechniqueReference analyticsTechniqueReference,
      String columnToMerge, List<IndicatorsToMerge> indicators) {
    this.id = id;
    this.name = name;
    this.indicatorType = indicatorType;
    this.createdBy = createdBy;
    this.visualizationTechniqueReference = visualizationTechniqueReference;
    this.createdOn = createdOn;
    this.timesExecuted = timesExecuted;
    this.goalRef = goalRef;
    this.configurationRequest = configurationRequest;
    this.indicatorQuery = indicatorQuery;
    this.analyticsTechniqueReference = analyticsTechniqueReference;
    this.columnToMerge = columnToMerge;
    this.indicators = indicators;
  }

  // Only for BASIC
  private String indicatorQuery;

  // Only for BASIC & MULTI_LEVEL
  private AnalyticsTechniqueReference analyticsTechniqueReference;

  // Only for COMPOSITE & MULTI_LEVEL
  private String columnToMerge;
  private List<IndicatorsToMerge> indicators;
}
