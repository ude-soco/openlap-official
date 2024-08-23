package com.openlap.analytics_module.dto.response.indicator;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.openlap.analytics_module.dto.response.indicator.utility_response.AnalyticsTechniqueStatementResponse;
import com.openlap.analytics_module.entities.utility_entities.IndicatorType;
import com.openlap.dataset.OpenLAPColumnConfigData;
import com.openlap.dataset.OpenLAPPortConfig;
import com.openlap.dynamicparam.OpenLAPDynamicParam;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class IndicatorFullDetailResponse {
  private String id;
  private String name;
  private IndicatorType type;
  private String createdBy;
  private LocalDateTime createdOn;
  private Set<String> platforms;

  // Visualization
  private String visualizationLibrary;
  private String visualizationType;
  private Object visualizationParams;
  private OpenLAPPortConfig visualizationMapping;

  // Analytics Technique
  private String analyticsTechnique;
  private OpenLAPPortConfig analyticsTechniqueMapping;
  private List<OpenLAPDynamicParam> analyticsTechniqueParams;

  private AnalyticsTechniqueStatementResponse statementResponse;

  // Only for COMPOSITE
  private OpenLAPColumnConfigData columnToMerge;

  // Only for COMPOSITE (without columnToMerge attribute) & MULTI
  private List<String> indicators;

  private String indicatorCode;
}
