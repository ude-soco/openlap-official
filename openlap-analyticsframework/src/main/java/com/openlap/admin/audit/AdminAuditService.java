package com.openlap.admin.audit;

import java.util.Map;
import javax.servlet.http.HttpServletRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface AdminAuditService {

  void logSuccess(
      HttpServletRequest request,
      String action,
      String resourceType,
      String resourceId,
      String resourceLabel,
      Map<String, Object> metadata);

  void logFailure(
      HttpServletRequest request,
      String action,
      String resourceType,
      String resourceId,
      String resourceLabel,
      String message,
      Map<String, Object> metadata);

  Page<AdminAuditLogResponse> listAuditLogs(Pageable pageable);
}
