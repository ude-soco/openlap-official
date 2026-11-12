package com.openlap.user.services;

import com.openlap.user.dto.request.RoleRequest;
import com.openlap.user.entities.RoleType;
import com.openlap.user.entities.User;
import java.util.Set;

public interface UserRoleService {
  void saveRole(RoleRequest role);

  void addRoleToUser(User user, RoleType roleName);

  void removeRoleFromUser(User user, RoleType roleName);

  /**
   * Replaces a user's role set with the given roles (admin operation). Enforces guardrails: the set
   * must be non-empty, ROLE_USER and ROLE_USER_WITHOUT_LRS cannot be combined, and the last
   * remaining ROLE_SUPER_ADMIN cannot be removed.
   */
  void replaceUserRoles(User user, Set<RoleType> roles);
}
