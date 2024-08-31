package com.openlap.user.controller;

import com.openlap.response.ApiSuccess;
import com.openlap.user.dto.request.RoleRequest;
import com.openlap.user.dto.request.RoleToUserRequest;
import com.openlap.user.entities.User;
import com.openlap.user.services.UserRoleService;
import javax.validation.Valid;

import com.openlap.user.services.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/roles")
@RequiredArgsConstructor
@Validated
public class RoleController {
  private final UserRoleService userRoleService;
  private final UserService userService;

  /** This API is to create a new role. Only users with SUPER_ADMIN role can create a new role */
  @PostMapping("/create")
  public ResponseEntity<?> saveRole(@RequestBody @Valid RoleRequest role) {
    userRoleService.saveRole(role);
    HttpStatus status = HttpStatus.CREATED;
    return ResponseEntity.status(status).body(new ApiSuccess(status, "Role created successfully."));
  }

  /**
   * This API is to add a new role to an existing user. Only users with SUPER_ADMIN privileges can
   * assign a new role to a user
   */
  @PostMapping("/add")
  public ResponseEntity<?> addRoleToUser(@RequestBody @Valid RoleToUserRequest form) {
    User user = userService.getUserByEmail(form.getUserEmail());
    userRoleService.addRoleToUser(user, form.getRole());
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(new ApiSuccess(status, "Role added to user successfully."));
  }
}
