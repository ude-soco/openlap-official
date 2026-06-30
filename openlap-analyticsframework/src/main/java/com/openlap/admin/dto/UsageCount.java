package com.openlap.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Usage of a single catalog item (visualization library/type or analytics method)
 * across saved indicators. {@code id} is the catalog item's id; {@code
 * indicatorCount} is how many saved indicators reference it; {@code
 * uniqueUserCount} is the number of distinct creators of those indicators.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UsageCount {
  private String id;
  private int indicatorCount;
  private int uniqueUserCount;
}
