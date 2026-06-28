package com.openlap.user.dto.request;

import javax.validation.constraints.Email;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;
import lombok.*;

/**
 * Request to update the authenticated user's email address. The current password is required
 * because the email is the login identity (re-authentication guards against session hijacking).
 */
@Data
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UpdateEmailRequest {

  @Email(message = "Email should be valid")
  @NotBlank(message = "Email is mandatory")
  @Size(min = 5, max = 100, message = "Email must be between 5 and 100 characters")
  private String newEmail;

  @NotBlank(message = "Current password is mandatory")
  private String currentPassword;
}
