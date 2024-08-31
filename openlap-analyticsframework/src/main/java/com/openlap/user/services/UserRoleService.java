package com.openlap.user.services;

import com.openlap.user.dto.request.RoleRequest;
import com.openlap.user.entities.RoleType;
import com.openlap.user.entities.User;

public interface UserRoleService {
  void saveRole(RoleRequest role);

  void addRoleToUser(User user, RoleType roleName);

  void removeRoleFromUser(User user, RoleType roleName);
}
