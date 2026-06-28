package com.openlap.infrastructure.exception;

import java.util.Map;
import org.springframework.http.HttpStatus;

/** Business-rule validation failure → HTTP 400. */
public class ValidationException extends OpenLapException {
  private static final HttpStatus STATUS = HttpStatus.BAD_REQUEST;
  private static final String DEFAULT_CODE = "VALIDATION_FAILED";

  public ValidationException(String message) {
    super(STATUS, DEFAULT_CODE, message);
  }

  public ValidationException(String code, String message) {
    super(STATUS, code, message);
  }

  public ValidationException(String code, String message, Map<String, Object> details) {
    super(STATUS, code, message, details);
  }

  public ValidationException(String code, String message, Throwable cause) {
    super(STATUS, code, message, null, cause);
  }
}
