package com.openlap.user.dto.request;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;
import lombok.*;

/** Request to update the authenticated user's display name. */
@Data
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UpdateProfileRequest {

  @NotBlank(message = "Name is mandatory")
  @Size(min = 2, max = 50, message = "First name must be between 5 and 50 characters")
  private String name;
}
