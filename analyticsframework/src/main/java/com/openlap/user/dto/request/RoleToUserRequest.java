package com.openlap.user.dto.request;

import com.openlap.user.entities.RoleType;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class RoleToUserRequest {
  @NotNull(message = "Role name is mandatory")
  private RoleType role;

  @NotBlank(message = "User email is mandatory")
  @Email(message = "Invalid email format")
  private String userEmail;
}
