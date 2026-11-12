package com.openlap.infrastructure.exception;

import java.util.Map;
import org.springframework.http.HttpStatus;

/**
 * Base type for all application (business + infrastructure) exceptions that should be rendered as
 * the unified error envelope by {@code GlobalApiExceptionHandler}.
 *
 * <p>Carries the HTTP status, a stable machine-readable {@code code}, a client-safe message, and
 * optional client-safe {@code details}. The {@link #getCause() cause} is for server-side logging
 * only and is <strong>never</strong> serialized into a client response.
 *
 * <p>This is foundation-only: no existing exception extends it yet. Modules migrate onto this
 * hierarchy in later, separate PRs.
 */
public abstract class OpenLapException extends RuntimeException {

  private final HttpStatus status;
  private final String code;
  /** transient: never leaks via Java serialization; also never serialized to JSON. */
  private final transient Map<String, Object> details;

  protected OpenLapException(HttpStatus status, String code, String message) {
    this(status, code, message, null, null);
  }

  protected OpenLapException(
      HttpStatus status, String code, String message, Map<String, Object> details) {
    this(status, code, message, details, null);
  }

  protected OpenLapException(
      HttpStatus status, String code, String message, Map<String, Object> details, Throwable cause) {
    super(message, cause);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  public HttpStatus getStatus() {
    return status;
  }

  public String getCode() {
    return code;
  }

  /** Optional, client-safe structured data (e.g. field errors). Never includes the cause/stack. */
  public Map<String, Object> getDetails() {
    return details;
  }
}
