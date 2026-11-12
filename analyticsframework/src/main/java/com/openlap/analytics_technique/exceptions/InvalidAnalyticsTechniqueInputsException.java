package com.openlap.analytics_technique.exceptions;

import com.openlap.infrastructure.exception.ValidationException;

/**
 * The analytics-technique input mapping is invalid → HTTP 400 (normalized from the previous 409,
 * which mislabelled a bad-input case as a conflict). Rendered by the unified error handler.
 */
public class InvalidAnalyticsTechniqueInputsException extends ValidationException {
  public InvalidAnalyticsTechniqueInputsException(String message) {
    super("ANALYTICS_TECHNIQUE_INVALID_INPUT", message);
  }

  public InvalidAnalyticsTechniqueInputsException(String message, Throwable cause) {
    super("ANALYTICS_TECHNIQUE_INVALID_INPUT", message, cause);
  }
}
