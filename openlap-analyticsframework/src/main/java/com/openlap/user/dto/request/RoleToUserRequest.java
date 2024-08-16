package com.openlap.user.dto.request;

import com.openlap.user.entities.RoleType;

import javax.validation.Valid;
import javax.validation.constraints.Email;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import lombok.Data;

@Data
public class RoleToUserRequest {
  @NotNull(message = "Role name is mandatory")
  private RoleType role;

  @NotBlank(message = "User email is mandatory")
  @Email(message = "Invalid email format")
  private String userEmail;
}
