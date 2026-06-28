package com.openlap.visualization_methods.exceptions.library;

import com.openlap.infrastructure.exception.ValidationException;

/**
 * The visualization input mapping is invalid → HTTP 400 (normalized from the previous 409, which
 * mislabelled a bad-input case as a conflict). Rendered by the unified error handler.
 */
public class InvalidVisualizationInputsException extends ValidationException {
  public InvalidVisualizationInputsException(String message) {
    super("VISUALIZATION_METHOD_INVALID_INPUT", message);
  }

  public InvalidVisualizationInputsException(String message, Throwable cause) {
    super("VISUALIZATION_METHOD_INVALID_INPUT", message, cause);
  }
}
