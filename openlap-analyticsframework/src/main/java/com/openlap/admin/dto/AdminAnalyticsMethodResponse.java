package com.openlap.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Admin view of an analytics method, including the soft-disable {@code enabled} flag. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminAnalyticsMethodResponse {
  private String id;
  private String name;
  private String description;
  private boolean enabled;
}
