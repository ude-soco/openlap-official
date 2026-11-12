package com.openlap.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Admin view of a visualization library, including the soft-disable {@code enabled} flag. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminVisLibraryResponse {
  private String id;
  private String creator;
  private String name;
  private String description;
  private boolean enabled;
  private String artifactId;

  public AdminVisLibraryResponse(String id, String creator, String name, String description, boolean enabled) {
    this.id = id; this.creator = creator; this.name = name; this.description = description; this.enabled = enabled;
  }
}
