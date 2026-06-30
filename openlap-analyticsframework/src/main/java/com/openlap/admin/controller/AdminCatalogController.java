package com.openlap.admin.controller;

import com.openlap.admin.dto.AdminCatalogStatusRequest;
import com.openlap.admin.services.AdminCatalogService;
import com.openlap.response.ApiSuccess;
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
 * Admin catalog management (read + soft-disable). Lists include disabled items; PATCH endpoints
 * toggle the {@code enabled} flag. Admin-only via the {@code /v1/admin/**} rule in {@code
 * SecurityConfig}. No hard delete, no upload, no plugin-loading changes.
 */
@RestController
@RequestMapping("/v1/admin")
@RequiredArgsConstructor
public class AdminCatalogController {

  private final AdminCatalogService adminCatalogService;

  @GetMapping("/visualizations/libraries")
  public ResponseEntity<?> listVisualizationLibraries() {
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(
            new ApiSuccess(
                status,
                "Visualization libraries found.",
                adminCatalogService.getVisualizationLibraries()));
  }

  @GetMapping("/visualizations/types")
  public ResponseEntity<?> listVisualizationTypes() {
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(
            new ApiSuccess(
                status, "Visualization types found.", adminCatalogService.getVisualizationTypes()));
  }

  @GetMapping("/analytics-methods")
  public ResponseEntity<?> listAnalyticsMethods() {
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(
            new ApiSuccess(
                status, "Analytics methods found.", adminCatalogService.getAnalyticsMethods()));
  }

  @PatchMapping("/visualizations/libraries/{id}/status")
  public ResponseEntity<?> setVisualizationLibraryStatus(
      @PathVariable String id, @Valid @RequestBody AdminCatalogStatusRequest request) {
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(
            new ApiSuccess(
                status,
                "Status updated.",
                adminCatalogService.setVisualizationLibraryEnabled(id, request.getEnabled())));
  }

  @PatchMapping("/visualizations/types/{id}/status")
  public ResponseEntity<?> setVisualizationTypeStatus(
      @PathVariable String id, @Valid @RequestBody AdminCatalogStatusRequest request) {
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(
            new ApiSuccess(
                status,
                "Status updated.",
                adminCatalogService.setVisualizationTypeEnabled(id, request.getEnabled())));
  }

  @PatchMapping("/analytics-methods/{id}/status")
  public ResponseEntity<?> setAnalyticsMethodStatus(
      @PathVariable String id, @Valid @RequestBody AdminCatalogStatusRequest request) {
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(
            new ApiSuccess(
                status,
                "Status updated.",
                adminCatalogService.setAnalyticsMethodEnabled(id, request.getEnabled())));
  }
}
