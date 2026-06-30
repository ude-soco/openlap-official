package com.openlap.admin.controller;

import com.openlap.response.ApiSuccess;
import com.openlap.user.dto.response.AdminUserDetailResponse;
import com.openlap.user.services.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Admin user detail (read-only). Returns one user's safe fields (id, name, email, roles) and their
 * LRS connections via secret-free DTOs. Admin-only via the {@code /v1/admin/**} rule in {@code
 * SecurityConfig}. No write actions.
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
}
