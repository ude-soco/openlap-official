package com.openlap.user.services;

import com.openlap.user.dto.request.RoleRequest;
import com.openlap.user.entities.RoleType;

public interface UserRoleService {
  void saveRole(RoleRequest role);

  void addRoleToUser(String userEmail, RoleType roleName);
}
