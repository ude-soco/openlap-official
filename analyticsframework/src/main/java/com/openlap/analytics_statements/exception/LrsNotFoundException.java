package com.openlap.analytics_statements.exception;

import com.openlap.infrastructure.exception.NotFoundException;

/** Requested LRS store does not exist → HTTP 404. Rendered by the unified error handler. */
public class LrsNotFoundException extends NotFoundException {
  public LrsNotFoundException(String message) {
    super("LRS_NOT_FOUND", message);
  }

  public LrsNotFoundException(String message, Throwable cause) {
    super("LRS_NOT_FOUND", message, cause);
  }
}
