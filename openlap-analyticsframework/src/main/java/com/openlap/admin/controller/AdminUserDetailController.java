package com.openlap.admin.controller;

import com.openlap.response.ApiSuccess;
import com.openlap.user.dto.request.AdminUpdateRolesRequest;
import com.openlap.user.dto.request.AdminUpdateUserStatusRequest;
import com.openlap.user.dto.request.AdminUpdateUserRequest;
import com.openlap.user.dto.response.AdminUserDetailResponse;
import com.openlap.user.services.UserService;
import javax.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Admin user administration for a single user: read detail, update basic info (name/email), and
 * replace roles, and deactivate/reactivate users. Admin-only via the {@code /v1/admin/**} rule in
 * {@code SecurityConfig}. Does NOT change passwords, delete users, or touch LRS credentials. All
 * responses use the secret-free {@link AdminUserDetailResponse}.
 */
@RestController
@RequestMapping("/v1/admin/users")
@RequiredArgsConstructor
public class AdminUserDetailController {

  private final UserService userService;

  @GetMapping("/{id}")
  public ResponseEntity<?> getUserDetail(@PathVariable String id) {
    AdminUserDetailResponse user = userService.getUserDetailById(id);
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status).body(new ApiSuccess(status, "User found.", user));
  }

  /** Updates a user's name/email (admin; no password required and password never changed). */
  @PatchMapping("/{id}")
  public ResponseEntity<?> updateUser(
      @PathVariable String id, @Valid @RequestBody AdminUpdateUserRequest request) {
    AdminUserDetailResponse user = userService.updateUserByAdmin(id, request);
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status).body(new ApiSuccess(status, "User updated.", user));
  }

  /** Replaces a user's role set (admin; guardrails enforced in the service). */
  @PatchMapping("/{id}/roles")
  public ResponseEntity<?> updateUserRoles(
      @PathVariable String id, @Valid @RequestBody AdminUpdateRolesRequest request) {
    AdminUserDetailResponse user = userService.replaceUserRoles(id, request.getRoles());
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status).body(new ApiSuccess(status, "Roles updated.", user));
  }

  /**
   * Soft-deactivates/reactivates a user. Deactivation blocks future login and token refresh; already
   * issued access tokens continue working until expiry (no immediate token revocation in this
   * phase).
   */
  @PatchMapping("/{id}/status")
  public ResponseEntity<?> updateUserStatus(
      @PathVariable String id, @Valid @RequestBody AdminUpdateUserStatusRequest request) {
    AdminUserDetailResponse user = userService.setUserEnabled(id, request.getEnabled());
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status).body(new ApiSuccess(status, "Status updated.", user));
  }
}
