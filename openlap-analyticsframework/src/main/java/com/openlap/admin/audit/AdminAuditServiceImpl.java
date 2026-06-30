package com.openlap.admin.audit;

import com.openlap.user.dto.request.TokenRequest;
import com.openlap.user.entities.User;
import com.openlap.user.repositories.UserRepository;
import com.openlap.user.services.TokenService;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import javax.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminAuditServiceImpl implements AdminAuditService {

  private static final String UNKNOWN = "unknown";
  private static final int MAX_MESSAGE_LENGTH = 500;

  private final AdminAuditLogRepository auditLogRepository;
  private final TokenService tokenService;
  private final UserRepository userRepository;

  @Override
  public void logSuccess(
      HttpServletRequest request,
      String action,
      String resourceType,
      String resourceId,
      String resourceLabel,
      Map<String, Object> metadata) {
    log(request, action, resourceType, resourceId, resourceLabel, AdminAuditOutcomes.SUCCESS, null,
        metadata);
  }

  @Override
  public void logFailure(
      HttpServletRequest request,
      String action,
      String resourceType,
      String resourceId,
      String resourceLabel,
      String message,
      Map<String, Object> metadata) {
    log(
        request,
        action,
        resourceType,
        resourceId,
        resourceLabel,
        AdminAuditOutcomes.FAILURE,
        truncate(message),
        metadata);
  }

  @Override
  public Page<AdminAuditLogResponse> listAuditLogs(Pageable pageable) {
    return auditLogRepository.findAllByOrderByTimestampDesc(pageable).map(AdminAuditLogResponse::from);
  }

  private void log(
      HttpServletRequest request,
      String action,
      String resourceType,
      String resourceId,
      String resourceLabel,
      String outcome,
      String message,
      Map<String, Object> metadata) {
    try {
      Actor actor = resolveActor(request);
      AdminAuditLog auditLog = new AdminAuditLog();
      auditLog.setTimestamp(Instant.now());
      auditLog.setActorUserId(actor.userId);
      auditLog.setActorEmail(actor.email);
      auditLog.setAction(action);
      auditLog.setResourceType(resourceType);
      auditLog.setResourceId(resourceId);
      auditLog.setResourceLabel(resourceLabel);
      auditLog.setOutcome(outcome);
      auditLog.setMessage(message);
      auditLog.setMetadata(sanitizeMetadata(metadata));
      auditLogRepository.save(auditLog);
    } catch (Exception e) {
      log.warn("Could not write admin audit log for action '{}': {}", action, e.getMessage());
    }
  }

  private Actor resolveActor(HttpServletRequest request) {
    try {
      TokenRequest tokenRequest = tokenService.verifyToken(request);
      String email = tokenRequest.getUserEmail();
      User actor = email == null ? null : userRepository.findByEmail(email);
      String userId = actor == null ? UNKNOWN : actor.getId();
      return new Actor(userId, email == null ? UNKNOWN : email);
    } catch (Exception e) {
      log.warn("Could not resolve audit actor: {}", e.getMessage());
      return new Actor(UNKNOWN, UNKNOWN);
    }
  }

  @SuppressWarnings("unchecked")
  private Map<String, Object> sanitizeMetadata(Map<String, Object> metadata) {
    if (metadata == null || metadata.isEmpty()) {
      return new LinkedHashMap<>();
    }
    Map<String, Object> sanitized = new LinkedHashMap<>();
    metadata.forEach(
        (key, value) -> {
          if (!isSecretKey(key)) {
            sanitized.put(key, sanitizeValue(value));
          }
        });
    return sanitized;
  }

  @SuppressWarnings("unchecked")
  private Object sanitizeValue(Object value) {
    if (value instanceof Map<?, ?>) {
      Map<String, Object> nested = new LinkedHashMap<>();
      ((Map<?, ?>) value)
          .forEach(
              (key, nestedValue) -> {
                String keyString = key == null ? null : key.toString();
                if (!isSecretKey(keyString)) {
                  nested.put(keyString, sanitizeValue(nestedValue));
                }
              });
      return nested;
    }
    if (value instanceof Iterable<?>) {
      List<Object> values = new ArrayList<>();
      for (Object item : (Iterable<?>) value) {
        values.add(sanitizeValue(item));
      }
      return values;
    }
    return value;
  }

  private boolean isSecretKey(String key) {
    if (key == null) {
      return true;
    }
    String normalized = key.replace("_", "").replace("-", "").toLowerCase(Locale.ROOT);
    return normalized.contains("password")
        || normalized.contains("token")
        || normalized.contains("jwt")
        || normalized.contains("secret")
        || normalized.contains("credential")
        || normalized.contains("authorization")
        || "basicauth".equals(normalized)
        || "basickey".equals(normalized);
  }

  private String truncate(String message) {
    if (message == null || message.length() <= MAX_MESSAGE_LENGTH) {
      return message;
    }
    return message.substring(0, MAX_MESSAGE_LENGTH);
  }

  private static class Actor {
    private final String userId;
    private final String email;

    private Actor(String userId, String email) {
      this.userId = userId;
      this.email = email;
    }
  }
}
