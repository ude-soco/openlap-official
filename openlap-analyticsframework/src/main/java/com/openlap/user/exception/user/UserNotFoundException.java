package com.openlap.user.exception.user;

import com.openlap.infrastructure.exception.NotFoundException;

/** User lookup failed → HTTP 404 (status preserved). Rendered by the unified error handler. */
public class UserNotFoundException extends NotFoundException {
  public UserNotFoundException(String message) {
    super("USER_NOT_FOUND", message);
  }

  public UserNotFoundException(String message, Throwable cause) {
    super("USER_NOT_FOUND", message, cause);
  }
}
