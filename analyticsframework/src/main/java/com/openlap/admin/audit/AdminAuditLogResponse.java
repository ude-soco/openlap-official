package com.openlap.admin.audit;

import java.time.Instant;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminAuditLogResponse {

  private Instant timestamp;
  private String actorEmail;
  private String action;
  private String resourceType;
  private String resourceId;
  private String resourceLabel;
  private String outcome;
  private String message;
  private Map<String, Object> metadata;

  public static AdminAuditLogResponse from(AdminAuditLog log) {
    return new AdminAuditLogResponse(
        log.getTimestamp(),
        log.getActorEmail(),
        log.getAction(),
        log.getResourceType(),
        log.getResourceId(),
        log.getResourceLabel(),
        log.getOutcome(),
        log.getMessage(),
        log.getMetadata());
  }
}
