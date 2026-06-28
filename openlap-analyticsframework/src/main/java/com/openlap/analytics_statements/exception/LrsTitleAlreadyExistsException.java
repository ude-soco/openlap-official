package com.openlap.analytics_statements.exception;

import com.openlap.infrastructure.exception.ConflictException;

/** An LRS with the requested title already exists → HTTP 409. Rendered by the unified handler. */
public class LrsTitleAlreadyExistsException extends ConflictException {
  public LrsTitleAlreadyExistsException(String message) {
    super("LRS_ALREADY_EXISTS", message);
  }

  public LrsTitleAlreadyExistsException(String message, Throwable cause) {
    super("LRS_ALREADY_EXISTS", message, cause);
  }
}
