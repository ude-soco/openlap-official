package com.openlap.infrastructure.exception;

import java.util.Map;
import org.springframework.http.HttpStatus;

/** Requested entity does not exist → HTTP 404. */
public class NotFoundException extends OpenLapException {
  private static final HttpStatus STATUS = HttpStatus.NOT_FOUND;
  private static final String DEFAULT_CODE = "NOT_FOUND";

  public NotFoundException(String message) {
    super(STATUS, DEFAULT_CODE, message);
  }

  public NotFoundException(String code, String message) {
    super(STATUS, code, message);
  }

  public NotFoundException(String code, String message, Map<String, Object> details) {
    super(STATUS, code, message, details);
  }

  public NotFoundException(String code, String message, Throwable cause) {
    super(STATUS, code, message, null, cause);
  }
}
