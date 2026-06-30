package com.openlap.admin.dto;

import javax.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Request body for the catalog enable/disable status endpoints: {@code { "enabled": true|false }}. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminCatalogStatusRequest {

  @NotNull(message = "enabled is required")
  private Boolean enabled;
}
