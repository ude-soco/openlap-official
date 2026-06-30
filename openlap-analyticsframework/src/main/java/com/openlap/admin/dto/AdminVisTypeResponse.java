package com.openlap.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Admin view of a visualization type, including the soft-disable {@code enabled} flag. Lightweight
 * (no chart-input loading) so disabled types — whose JARs may be problematic — are listed safely.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminVisTypeResponse {
  private String id;
  private String library;
  private String name;
  private String imageCode;
  private boolean enabled;
}
