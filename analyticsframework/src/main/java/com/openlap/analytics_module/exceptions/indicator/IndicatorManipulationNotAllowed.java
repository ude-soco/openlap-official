package com.openlap.analytics_module.exceptions.indicator;

import com.openlap.infrastructure.exception.ForbiddenException;

/**
 * Caller is not permitted to manipulate the indicator (e.g. modify one they do not own) → HTTP 403.
 * Rendered by the unified error handler.
 */
public class IndicatorManipulationNotAllowed extends ForbiddenException {
  public IndicatorManipulationNotAllowed(String message) {
    super("INDICATOR_MANIPULATION_NOT_ALLOWED", message);
  }

  public IndicatorManipulationNotAllowed(String message, Throwable cause) {
    super("INDICATOR_MANIPULATION_NOT_ALLOWED", message, cause);
  }
}
