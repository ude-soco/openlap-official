package com.openlap.user.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.ArrayList;
import java.util.List;
import lombok.*;

/**
 * Admin-facing user listing item. Exposes only safe, non-sensitive fields (id, name, email, role
 * names). Never includes the password hash, security internals, or LRS credentials/secrets.
 */
@Data
@Getter
@Setter
@NoArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AdminUserResponse {
  private String id;
  private String name;
  private String email;
  private List<String> roles = new ArrayList<>();
  private boolean enabled = true;

  public AdminUserResponse(String id, String name, String email, List<String> roles) {
    this(id, name, email, roles, true);
  }

  public AdminUserResponse(
      String id, String name, String email, List<String> roles, boolean enabled) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.roles = roles;
    this.enabled = enabled;
  }
}
