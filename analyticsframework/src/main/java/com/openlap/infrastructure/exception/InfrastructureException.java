package com.openlap.infrastructure.exception;

import java.util.Map;
import org.springframework.http.HttpStatus;

/** Unexpected infrastructure failure (DB, plugin loading, I/O) → HTTP 500. */
public class InfrastructureException extends OpenLapException {
  private static final HttpStatus STATUS = HttpStatus.INTERNAL_SERVER_ERROR;
  private static final String DEFAULT_CODE = "INTERNAL_ERROR";

  public InfrastructureException(String message) {
    super(STATUS, DEFAULT_CODE, message);
  }

  public InfrastructureException(String message, Throwable cause) {
    super(STATUS, DEFAULT_CODE, message, null, cause);
  }

  public InfrastructureException(String code, String message, Throwable cause) {
    super(STATUS, code, message, null, cause);
  }

  public InfrastructureException(String code, String message, Map<String, Object> details) {
    super(STATUS, code, message, details);
  }
}
