package com.openlap.analytics_statements.exception;

import com.openlap.infrastructure.exception.ForbiddenException;

/**
 * Caller is not permitted to manipulate the LRS, or a confirmation is required before a destructive
 * change → HTTP 403 (status preserved). Rendered by the unified error handler.
 */
public class LrsManipulationException extends ForbiddenException {
  public LrsManipulationException(String message) {
    super("LRS_MANIPULATION_NOT_ALLOWED", message);
  }

  public LrsManipulationException(String message, Throwable cause) {
    super("LRS_MANIPULATION_NOT_ALLOWED", message, cause);
  }
}
