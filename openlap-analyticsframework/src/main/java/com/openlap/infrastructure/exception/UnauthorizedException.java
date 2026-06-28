package com.openlap.infrastructure.exception;

import java.util.Map;
import org.springframework.http.HttpStatus;

/** Authentication is missing or invalid → HTTP 401. */
public class UnauthorizedException extends OpenLapException {
  private static final HttpStatus STATUS = HttpStatus.UNAUTHORIZED;
  private static final String DEFAULT_CODE = "UNAUTHORIZED";

  public UnauthorizedException(String message) {
    super(STATUS, DEFAULT_CODE, message);
  }

  public UnauthorizedException(String code, String message) {
    super(STATUS, code, message);
  }

  public UnauthorizedException(String code, String message, Map<String, Object> details) {
    super(STATUS, code, message, details);
  }

  public UnauthorizedException(String code, String message, Throwable cause) {
    super(STATUS, code, message, null, cause);
  }
}
