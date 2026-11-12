package com.openlap.admin.audit;

import java.time.Instant;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document("admin-audit-log")
public class AdminAuditLog {

  @Id private String id;
  private Instant timestamp;
  private String actorUserId;
  private String actorEmail;
  private String action;
  private String resourceType;
  private String resourceId;
  private String resourceLabel;
  private String outcome;
  private String message;
  private Map<String, Object> metadata;
}
