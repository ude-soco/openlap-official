package com.openlap.admin.controller;

import com.openlap.admin.audit.AdminAuditActions;
import com.openlap.admin.audit.AdminAuditService;
import com.openlap.admin.audit.AdminResourceTypes;
import com.openlap.response.ApiSuccess;
import com.openlap.user.dto.request.AdminUpdateRolesRequest;
import com.openlap.user.dto.request.AdminUpdateUserStatusRequest;
import com.openlap.user.dto.request.AdminUpdateUserRequest;
import com.openlap.user.dto.response.AdminUserDetailResponse;
import com.openlap.user.entities.RoleType;
import com.openlap.user.services.UserService;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import javax.servlet.http.HttpServletRequest;
import javax.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
@Slf4j
public class AdminUserDetailController {

  private final UserService userService;
  private final AdminAuditService adminAuditService;

  @GetMapping("/{id}")
  public ResponseEntity<?> getUserDetail(@PathVariable String id) {
    AdminUserDetailResponse user = userService.getUserDetailById(id);
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status).body(new ApiSuccess(status, "User found.", user));
  }

  /** Updates a user's name/email (admin; no password required and password never changed). */
  @PatchMapping("/{id}")
  public ResponseEntity<?> updateUser(
      HttpServletRequest httpRequest,
      @PathVariable String id,
      @Valid @RequestBody AdminUpdateUserRequest request) {
    AdminUserDetailResponse before = null;
    try {
      before = userService.getUserDetailById(id);
      AdminUserDetailResponse user = userService.updateUserByAdmin(id, request);
      safeLogSuccess(
          httpRequest,
          AdminAuditActions.USER_UPDATE,
          id,
          user.getEmail(),
          profileUpdateMetadata(before, user));
      HttpStatus status = HttpStatus.OK;
      return ResponseEntity.status(status).body(new ApiSuccess(status, "User updated.", user));
    } catch (RuntimeException e) {
      safeLogFailure(
          httpRequest,
          AdminAuditActions.USER_UPDATE,
          id,
          resourceLabel(before),
          failureMessage(e),
          profileFailureMetadata(request));
      throw e;
    }
  }

  /** Replaces a user's role set (admin; guardrails enforced in the service). */
  @PatchMapping("/{id}/roles")
  public ResponseEntity<?> updateUserRoles(
      HttpServletRequest httpRequest,
      @PathVariable String id,
      @Valid @RequestBody AdminUpdateRolesRequest request) {
    AdminUserDetailResponse before = null;
    try {
      before = userService.getUserDetailById(id);
      AdminUserDetailResponse user = userService.replaceUserRoles(id, request.getRoles());
      safeLogSuccess(
          httpRequest,
          AdminAuditActions.USER_ROLES_UPDATE,
          id,
          user.getEmail(),
          roleUpdateMetadata(before.getRoles(), user.getRoles()));
      HttpStatus status = HttpStatus.OK;
      return ResponseEntity.status(status).body(new ApiSuccess(status, "Roles updated.", user));
    } catch (RuntimeException e) {
      safeLogFailure(
          httpRequest,
          AdminAuditActions.USER_ROLES_UPDATE,
          id,
          resourceLabel(before),
          failureMessage(e),
          roleFailureMetadata(request.getRoles()));
      throw e;
    }
  }

  /**
   * Soft-deactivates/reactivates a user. Deactivation blocks future login and token refresh; already
   * issued access tokens continue working until expiry (no immediate token revocation in this
   * phase).
   */
  @PatchMapping("/{id}/status")
  public ResponseEntity<?> updateUserStatus(
      HttpServletRequest httpRequest,
      @PathVariable String id,
      @Valid @RequestBody AdminUpdateUserStatusRequest request) {
    AdminUserDetailResponse before = null;
    try {
      before = userService.getUserDetailById(id);
      AdminUserDetailResponse user = userService.setUserEnabled(id, request.getEnabled());
      safeLogSuccess(
          httpRequest,
          AdminAuditActions.USER_STATUS_UPDATE,
          id,
          user.getEmail(),
          statusUpdateMetadata(before.isEnabled(), user.isEnabled()));
      HttpStatus status = HttpStatus.OK;
      return ResponseEntity.status(status).body(new ApiSuccess(status, "Status updated.", user));
    } catch (RuntimeException e) {
      safeLogFailure(
          httpRequest,
          AdminAuditActions.USER_STATUS_UPDATE,
          id,
          resourceLabel(before),
          failureMessage(e),
          statusFailureMetadata(request.getEnabled(), before));
      throw e;
    }
  }

  private void safeLogSuccess(
      HttpServletRequest request,
      String action,
      String resourceId,
      String resourceLabel,
      Map<String, Object> metadata) {
    try {
      adminAuditService.logSuccess(
          request, action, AdminResourceTypes.USER, resourceId, resourceLabel, metadata);
    } catch (RuntimeException e) {
      log.warn("Admin audit logging failed for action '{}': {}", action, e.getMessage());
    }
  }

  private void safeLogFailure(
      HttpServletRequest request,
      String action,
      String resourceId,
      String resourceLabel,
      String message,
      Map<String, Object> metadata) {
    try {
      adminAuditService.logFailure(
          request, action, AdminResourceTypes.USER, resourceId, resourceLabel, message, metadata);
    } catch (RuntimeException auditException) {
      log.warn(
          "Admin audit failure logging failed for action '{}': {}",
          action,
          auditException.getMessage());
    }
  }

  private Map<String, Object> profileUpdateMetadata(
      AdminUserDetailResponse before, AdminUserDetailResponse after) {
    Map<String, Object> metadata = new LinkedHashMap<>();
    List<String> changedFields = new ArrayList<>();
    if (!Objects.equals(before.getName(), after.getName())) {
      changedFields.add("name");
      metadata.put("name", oldNew(before.getName(), after.getName()));
    }
    if (!Objects.equals(before.getEmail(), after.getEmail())) {
      changedFields.add("email");
      metadata.put("email", oldNew(before.getEmail(), after.getEmail()));
    }
    metadata.put("changedFields", changedFields);
    return metadata;
  }

  private Map<String, Object> profileFailureMetadata(AdminUpdateUserRequest request) {
    Map<String, Object> metadata = new LinkedHashMap<>();
    metadata.put("requestedName", request.getName());
    metadata.put("requestedEmail", request.getEmail());
    return metadata;
  }

  private Map<String, Object> roleUpdateMetadata(List<String> oldRoles, List<String> newRoles) {
    Map<String, Object> metadata = new LinkedHashMap<>();
    metadata.put("oldRoles", oldRoles);
    metadata.put("newRoles", newRoles);
    return metadata;
  }

  private Map<String, Object> roleFailureMetadata(Set<RoleType> requestedRoles) {
    Map<String, Object> metadata = new LinkedHashMap<>();
    metadata.put("requestedRoles", requestedRoles);
    return metadata;
  }

  private Map<String, Object> statusUpdateMetadata(boolean oldEnabled, boolean newEnabled) {
    Map<String, Object> metadata = new LinkedHashMap<>();
    metadata.put("oldEnabled", oldEnabled);
    metadata.put("newEnabled", newEnabled);
    return metadata;
  }

  private Map<String, Object> statusFailureMetadata(
      Boolean requestedEnabled, AdminUserDetailResponse before) {
    Map<String, Object> metadata = new LinkedHashMap<>();
    if (before != null) {
      metadata.put("oldEnabled", before.isEnabled());
    }
    metadata.put("requestedEnabled", requestedEnabled);
    return metadata;
  }

  private Map<String, Object> oldNew(Object oldValue, Object newValue) {
    Map<String, Object> value = new LinkedHashMap<>();
    value.put("old", oldValue);
    value.put("new", newValue);
    return value;
  }

  private String resourceLabel(AdminUserDetailResponse user) {
    return user == null ? null : user.getEmail();
  }

  private String failureMessage(RuntimeException e) {
    return e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
  }
}
