package com.openlap.user.dto.request;

import com.openlap.user.entities.RoleType;
import javax.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class RoleRequest {
  @NotNull(message = "Role name is mandatory")
  private RoleType name;
}
