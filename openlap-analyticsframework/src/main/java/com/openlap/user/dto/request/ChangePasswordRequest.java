package com.openlap.user.dto.request;

import com.openlap.user.validation.ValidPassword;
import javax.validation.constraints.NotBlank;
import lombok.*;

/**
 * Request to change the authenticated user's password. The new password is checked against the
 * OpenLAP password policy ({@link ValidPassword}); the confirmation match and the current-password
 * verification are performed in the service.
 */
@Data
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ChangePasswordRequest {

  @NotBlank(message = "Current password is mandatory")
  private String currentPassword;

  @NotBlank(message = "Password is mandatory")
  @ValidPassword
  private String newPassword;

  @NotBlank(message = "Password confirmation is mandatory")
  private String confirmNewPassword;
}
