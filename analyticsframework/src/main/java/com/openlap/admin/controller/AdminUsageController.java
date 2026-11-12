package com.openlap.admin.controller;

import com.openlap.admin.dto.AdminUsageResponse;
import com.openlap.admin.services.AdminUsageService;
import com.openlap.response.ApiSuccess;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Admin usage analytics (read-only). Reports how often each visualization
 * library, visualization type, and analytics method is referenced by saved
 * indicators, plus the number of distinct users. Admin-only via the
 * {@code /v1/admin/**} rule in {@code SecurityConfig} (URL-based authorization).
 */
@RestController
@RequestMapping("/v1/admin/usage")
@RequiredArgsConstructor
public class AdminUsageController {

  private final AdminUsageService adminUsageService;

  @GetMapping
  public ResponseEntity<?> getUsage() {
    AdminUsageResponse usage = adminUsageService.getUsage();
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status).body(new ApiSuccess(status, "Usage computed.", usage));
  }
}
