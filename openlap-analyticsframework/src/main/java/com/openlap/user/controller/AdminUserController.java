package com.openlap.user.controller;

import com.openlap.response.ApiSuccess;
import com.openlap.user.dto.response.AdminUserResponse;
import com.openlap.user.services.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Admin-only user administration.
 *
 * <p>Read-only in this iteration: lists OpenLAP users with safe fields only (id, name, email,
 * roles). Access is restricted to {@code ROLE_SUPER_ADMIN} centrally in {@code SecurityConfig} (the
 * project uses URL-based authorization, not method security), via an exact-match rule on {@code
 * /v1/users} that is ordered before the broader {@code /v1/users/my/**} self-service rule.
 */
@RestController
@RequestMapping("/v1/users")
@RequiredArgsConstructor
public class AdminUserController {

  // Mirror the page-size guard used by IndicatorController for consistency.
  private static final int MIN_SIZE = 1;
  private static final int MAX_SIZE = 100;

  private final UserService userService;

  /** Lists all users (admin only), paginated and sorted by name. Exposes only safe fields. */
  @GetMapping
  public ResponseEntity<?> listUsers(
      @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size) {
    if (page < 0) {
      page = 0;
    }
    if (size < MIN_SIZE) {
      size = MIN_SIZE;
    } else if (size > MAX_SIZE) {
      size = MAX_SIZE;
    }
    Pageable pageable = PageRequest.of(page, size, Sort.by("name").ascending());
    Page<AdminUserResponse> users = userService.listUsers(pageable);
    String message = users.getContent().isEmpty() ? "No users found." : "Users found.";
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status).body(new ApiSuccess(status, message, users));
  }
}
