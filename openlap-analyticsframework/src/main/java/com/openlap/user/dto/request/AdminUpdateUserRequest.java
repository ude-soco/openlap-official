package com.openlap.user.dto.request;

import javax.validation.constraints.Email;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Admin request to update another user's basic information. Unlike the self-service email update,
 * this does NOT require the current password and never touches the password. Name and a valid email
 * are required; email uniqueness is enforced in the service (and skipped when unchanged).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminUpdateUserRequest {

  @NotBlank(message = "Name is mandatory")
  @Size(min = 1, max = 100, message = "Name must be between 1 and 100 characters")
  private String name;

  @Email(message = "Email should be valid")
  @NotBlank(message = "Email is mandatory")
  @Size(min = 5, max = 100, message = "Email must be between 5 and 100 characters")
  private String email;
}
