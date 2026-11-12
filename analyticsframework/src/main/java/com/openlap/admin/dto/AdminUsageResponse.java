package com.openlap.admin.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Aggregated, read-only usage counts for the admin dashboard. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminUsageResponse {
  private List<UsageCount> visualizationLibraries;
  private List<UsageCount> visualizationTypes;
  private List<UsageCount> analyticsMethods;
  private long savedIndicatorCount;
  private long uniqueCreatorCount;

  public AdminUsageResponse(List<UsageCount> libraries, List<UsageCount> types, List<UsageCount> methods) {
    this(libraries, types, methods, 0L, 0L);
  }
}
