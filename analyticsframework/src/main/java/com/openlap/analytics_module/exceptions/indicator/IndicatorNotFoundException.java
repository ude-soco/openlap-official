package com.openlap.analytics_module.exceptions.indicator;

import com.openlap.infrastructure.exception.NotFoundException;

/** Requested indicator does not exist → HTTP 404. Rendered by the unified handler. */
public class IndicatorNotFoundException extends NotFoundException {
  public IndicatorNotFoundException(String message) {
    super("INDICATOR_NOT_FOUND", message);
  }

  public IndicatorNotFoundException(String message, Throwable cause) {
    super("INDICATOR_NOT_FOUND", message, cause);
  }
}
