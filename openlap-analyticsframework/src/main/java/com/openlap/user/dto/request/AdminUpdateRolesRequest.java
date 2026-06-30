package com.openlap.user.dto.request;

import com.openlap.user.entities.RoleType;
import java.util.Set;
import javax.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Admin request to replace a user's role set. Using a {@code Set<RoleType>} makes invalid role
 * strings fail deserialization (HTTP 400), and {@code @NotEmpty} rejects an empty set. Further
 * guardrails (last super admin, invalid combinations) are enforced in the service.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminUpdateRolesRequest {

  @NotEmpty(message = "At least one role is required")
  private Set<RoleType> roles;
}
