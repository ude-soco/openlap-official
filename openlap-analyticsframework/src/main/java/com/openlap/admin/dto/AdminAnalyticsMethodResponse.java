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
  private String artifactId;

  public AdminAnalyticsMethodResponse(String id, String name, String description, boolean enabled) {
    this.id = id; this.name = name; this.description = description; this.enabled = enabled;
  }
}
