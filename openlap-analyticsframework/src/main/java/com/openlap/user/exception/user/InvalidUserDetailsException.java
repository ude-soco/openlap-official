package com.openlap.user.exception.user;

import com.openlap.infrastructure.exception.ValidationException;

/**
 * Mutually-exclusive user details supplied (e.g. both LRS provider and consumer) → HTTP 400
 * (validation error).
 *
 * <p>Normalized from the legacy 409 mapping in PR4.1.
 */
public class InvalidUserDetailsException extends ValidationException {
  public InvalidUserDetailsException(String message) {
    super("INVALID_USER_DETAILS", message);
  }

  public InvalidUserDetailsException(String message, Throwable cause) {
    super("INVALID_USER_DETAILS", message, cause);
  }
}
