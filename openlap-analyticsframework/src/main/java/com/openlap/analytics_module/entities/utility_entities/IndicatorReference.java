package com.openlap.analytics_module.entities.utility_entities;

import com.openlap.analytics_module.dto.requests.indicator.IndicatorsToMergeRequest;
import com.openlap.analytics_statements.dtos.request.StatementsRequest;
import com.openlap.dataset.OpenLAPColumnConfigData;
import com.openlap.dataset.OpenLAPPortConfig;
import com.openlap.dynamicparam.OpenLAPDynamicParam;
import java.util.ArrayList;
import java.util.List;
import lombok.*;

@Data
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class IndicatorReference {
  // For BASIC, COMPOSITE & MULTI
  private String name;
  private IndicatorType indicatorType;

  // VisualizationTechniqueReference
  private String visualizationLibraryId;
  private String visualizationTypeId;
  private Object visualizationParams;
  private OpenLAPPortConfig visualizationMapping;

  // Only for BASIC
  private StatementsRequest indicatorQuery;

  // Only for BASIC & MULTI
  private String analyticsTechniqueId;
  private OpenLAPPortConfig analyticsTechniqueMapping;
  private List<OpenLAPDynamicParam> analyticsTechniqueParams = new ArrayList<>();

  // Only for COMPOSITE
  private OpenLAPColumnConfigData columnToMerge;

  // Only for COMPOSITE (without columnToMerge attribute) & MULTI
  private List<IndicatorsToMergeRequest> indicators = new ArrayList<>();
}
