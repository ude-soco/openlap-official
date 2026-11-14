package com.openlap.analytics_module.exceptions.indicator;

import com.openlap.infrastructure.exception.OpenLapException;
import java.util.Map;
import org.springframework.http.HttpStatus;

/** Client-safe composition failures, rendered through the common API envelope. */
public class ComplexIndicatorException extends OpenLapException {
  public ComplexIndicatorException(HttpStatus status, String code, String message) {
    super(status, code, message);
  }

  public ComplexIndicatorException(HttpStatus status, String code, String message,
      Map<String, Object> details) {
    super(status, code, message, details);
  }

  public static ComplexIndicatorException invalid(String message) {
    return new ComplexIndicatorException(HttpStatus.BAD_REQUEST, "INVALID_COMPOSITION", message);
  }
}
