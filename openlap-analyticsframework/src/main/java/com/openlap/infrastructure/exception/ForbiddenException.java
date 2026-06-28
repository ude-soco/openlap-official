package com.openlap.infrastructure.exception;

import java.util.Map;
import org.springframework.http.HttpStatus;

/** Authenticated but not permitted → HTTP 403. */
public class ForbiddenException extends OpenLapException {
  private static final HttpStatus STATUS = HttpStatus.FORBIDDEN;
  private static final String DEFAULT_CODE = "FORBIDDEN";

  public ForbiddenException(String message) {
    super(STATUS, DEFAULT_CODE, message);
  }

  public ForbiddenException(String code, String message) {
    super(STATUS, code, message);
  }

  public ForbiddenException(String code, String message, Map<String, Object> details) {
    super(STATUS, code, message, details);
  }

  public ForbiddenException(String code, String message, Throwable cause) {
    super(STATUS, code, message, null, cause);
  }
}
