package com.openlap.admin.controller;

import com.openlap.admin.audit.AdminAuditService;
import com.openlap.response.ApiSuccess;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Read-only admin audit log endpoint. Protected by the /v1/admin/** SUPER_ADMIN rule. */
@RestController
@RequestMapping("/v1/admin/audit-logs")
@RequiredArgsConstructor
public class AdminAuditController {

  private final AdminAuditService adminAuditService;

  @GetMapping
  public ResponseEntity<?> listAuditLogs(
      @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "25") int size) {
    Pageable pageable = PageRequest.of(page, size);
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(new ApiSuccess(status, "Audit logs found.", adminAuditService.listAuditLogs(pageable)));
  }
}
