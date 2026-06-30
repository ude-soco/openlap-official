package com.openlap.user.dto.request;

import javax.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Admin request to deactivate/reactivate a user: {@code { "enabled": true|false }}. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminUpdateUserStatusRequest {

  @NotNull(message = "enabled is required")
  private Boolean enabled;
}
