package com.openlap.admin.controller;

import com.openlap.admin.audit.AdminAuditActions;
import com.openlap.admin.audit.AdminAuditService;
import com.openlap.admin.audit.AdminResourceTypes;
import com.openlap.admin.dto.AdminAnalyticsMethodResponse;
import com.openlap.admin.dto.AdminCatalogStatusRequest;
import com.openlap.admin.dto.AdminVisLibraryResponse;
import com.openlap.admin.dto.AdminVisTypeResponse;
import com.openlap.admin.services.AdminCatalogService;
import com.openlap.response.ApiSuccess;
import java.util.LinkedHashMap;
import java.util.Map;
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
 * Admin catalog management (read + soft-disable). Lists include disabled items; PATCH endpoints
 * toggle the {@code enabled} flag. Admin-only via the {@code /v1/admin/**} rule in {@code
 * SecurityConfig}. No hard delete, no upload, no plugin-loading changes.
 */
@RestController
@RequestMapping("/v1/admin")
@RequiredArgsConstructor
@Slf4j
public class AdminCatalogController {

  private final AdminCatalogService adminCatalogService;
  private final AdminAuditService adminAuditService;

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
      HttpServletRequest httpRequest,
      @PathVariable String id,
      @Valid @RequestBody AdminCatalogStatusRequest request) {
    AdminVisLibraryResponse before = null;
    try {
      before = adminCatalogService.getVisualizationLibraryById(id);
      AdminVisLibraryResponse library =
          adminCatalogService.setVisualizationLibraryEnabled(id, request.getEnabled());
      safeLogSuccess(
          httpRequest,
          AdminAuditActions.VISUALIZATION_LIBRARY_STATUS_UPDATE,
          AdminResourceTypes.VISUALIZATION_LIBRARY,
          id,
          library.getName(),
          statusMetadata(enabled(before), library.isEnabled()));
      HttpStatus status = HttpStatus.OK;
      return ResponseEntity.status(status)
          .body(new ApiSuccess(status, "Status updated.", library));
    } catch (RuntimeException e) {
      safeLogFailure(
          httpRequest,
          AdminAuditActions.VISUALIZATION_LIBRARY_STATUS_UPDATE,
          AdminResourceTypes.VISUALIZATION_LIBRARY,
          id,
          libraryLabel(before),
          failureMessage(e),
          statusFailureMetadata(request.getEnabled(), enabled(before)));
      throw e;
    }
  }

  @PatchMapping("/visualizations/types/{id}/status")
  public ResponseEntity<?> setVisualizationTypeStatus(
      HttpServletRequest httpRequest,
      @PathVariable String id,
      @Valid @RequestBody AdminCatalogStatusRequest request) {
    AdminVisTypeResponse before = null;
    try {
      before = adminCatalogService.getVisualizationTypeById(id);
      AdminVisTypeResponse type =
          adminCatalogService.setVisualizationTypeEnabled(id, request.getEnabled());
      safeLogSuccess(
          httpRequest,
          AdminAuditActions.VISUALIZATION_TYPE_STATUS_UPDATE,
          AdminResourceTypes.VISUALIZATION_TYPE,
          id,
          type.getName(),
          statusMetadata(enabled(before), type.isEnabled()));
      HttpStatus status = HttpStatus.OK;
      return ResponseEntity.status(status).body(new ApiSuccess(status, "Status updated.", type));
    } catch (RuntimeException e) {
      safeLogFailure(
          httpRequest,
          AdminAuditActions.VISUALIZATION_TYPE_STATUS_UPDATE,
          AdminResourceTypes.VISUALIZATION_TYPE,
          id,
          typeLabel(before),
          failureMessage(e),
          statusFailureMetadata(request.getEnabled(), enabled(before)));
      throw e;
    }
  }

  @PatchMapping("/analytics-methods/{id}/status")
  public ResponseEntity<?> setAnalyticsMethodStatus(
      HttpServletRequest httpRequest,
      @PathVariable String id,
      @Valid @RequestBody AdminCatalogStatusRequest request) {
    AdminAnalyticsMethodResponse before = null;
    try {
      before = adminCatalogService.getAnalyticsMethodById(id);
      AdminAnalyticsMethodResponse method =
          adminCatalogService.setAnalyticsMethodEnabled(id, request.getEnabled());
      safeLogSuccess(
          httpRequest,
          AdminAuditActions.ANALYTICS_METHOD_STATUS_UPDATE,
          AdminResourceTypes.ANALYTICS_METHOD,
          id,
          method.getName(),
          statusMetadata(enabled(before), method.isEnabled()));
      HttpStatus status = HttpStatus.OK;
      return ResponseEntity.status(status).body(new ApiSuccess(status, "Status updated.", method));
    } catch (RuntimeException e) {
      safeLogFailure(
          httpRequest,
          AdminAuditActions.ANALYTICS_METHOD_STATUS_UPDATE,
          AdminResourceTypes.ANALYTICS_METHOD,
          id,
          methodLabel(before),
          failureMessage(e),
          statusFailureMetadata(request.getEnabled(), enabled(before)));
      throw e;
    }
  }

  private void safeLogSuccess(
      HttpServletRequest request,
      String action,
      String resourceType,
      String resourceId,
      String resourceLabel,
      Map<String, Object> metadata) {
    try {
      adminAuditService.logSuccess(
          request, action, resourceType, resourceId, resourceLabel, metadata);
    } catch (RuntimeException e) {
      log.warn("Admin audit logging failed for action '{}': {}", action, e.getMessage());
    }
  }

  private void safeLogFailure(
      HttpServletRequest request,
      String action,
      String resourceType,
      String resourceId,
      String resourceLabel,
      String message,
      Map<String, Object> metadata) {
    try {
      adminAuditService.logFailure(
          request, action, resourceType, resourceId, resourceLabel, message, metadata);
    } catch (RuntimeException auditException) {
      log.warn(
          "Admin audit failure logging failed for action '{}': {}",
          action,
          auditException.getMessage());
    }
  }

  private Map<String, Object> statusMetadata(Boolean oldEnabled, boolean newEnabled) {
    Map<String, Object> metadata = new LinkedHashMap<>();
    metadata.put("oldEnabled", oldEnabled);
    metadata.put("newEnabled", newEnabled);
    return metadata;
  }

  private Map<String, Object> statusFailureMetadata(
      Boolean requestedEnabled, Boolean oldEnabled) {
    Map<String, Object> metadata = new LinkedHashMap<>();
    if (oldEnabled != null) {
      metadata.put("oldEnabled", oldEnabled);
    }
    metadata.put("requestedEnabled", requestedEnabled);
    return metadata;
  }

  private Boolean enabled(AdminVisLibraryResponse item) {
    return item == null ? null : item.isEnabled();
  }

  private Boolean enabled(AdminVisTypeResponse item) {
    return item == null ? null : item.isEnabled();
  }

  private Boolean enabled(AdminAnalyticsMethodResponse item) {
    return item == null ? null : item.isEnabled();
  }

  private String libraryLabel(AdminVisLibraryResponse item) {
    return item == null ? null : item.getName();
  }

  private String typeLabel(AdminVisTypeResponse item) {
    return item == null ? null : item.getName();
  }

  private String methodLabel(AdminAnalyticsMethodResponse item) {
    return item == null ? null : item.getName();
  }

  private String failureMessage(RuntimeException e) {
    return e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
  }
}
