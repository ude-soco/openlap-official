package com.openlap.user.dto.request;

import com.openlap.analytics_statements.dtos.request.LrsConsumerRequest;
import com.openlap.analytics_statements.dtos.request.LrsProviderRequest;
import java.util.List;
import javax.validation.Valid;
import javax.validation.constraints.Email;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;
import lombok.*;

@Data
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UserUpdateRequest {

  @NotBlank(message = "Name is mandatory")
  @Size(min = 2, max = 50, message = "First name must be between 5 and 50 characters")
  private String name;

  @Email(message = "Email should be valid")
  @NotBlank(message = "Email is mandatory")
  @Size(min = 5, max = 100, message = "Email must be between 5 and 100 characters")
  private String email;

  @NotBlank(message = "Password is mandatory")
  @Size(min = 5, max = 20, message = "Password must be between 5 and 20 characters")
  private String password;

  @NotBlank(message = "Password confirmation is mandatory")
  @Size(min = 5, max = 20, message = "Password must be between 5 and 20 characters")
  private String confirmPassword;

  @Valid private List<LrsProviderRequest> lrsProviderRequestList;

  @Valid private List<LrsConsumerRequest> lrsConsumerRequestList;
}
