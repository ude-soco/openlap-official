package com.openlap.infrastructure.exception;

import java.util.Map;
import org.springframework.http.HttpStatus;

/** State/uniqueness conflict (e.g. duplicate) → HTTP 409. */
public class ConflictException extends OpenLapException {
  private static final HttpStatus STATUS = HttpStatus.CONFLICT;
  private static final String DEFAULT_CODE = "CONFLICT";

  public ConflictException(String message) {
    super(STATUS, DEFAULT_CODE, message);
  }

  public ConflictException(String code, String message) {
    super(STATUS, code, message);
  }

  public ConflictException(String code, String message, Map<String, Object> details) {
    super(STATUS, code, message, details);
  }

  public ConflictException(String code, String message, Throwable cause) {
    super(STATUS, code, message, null, cause);
  }
}
