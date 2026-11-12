package com.openlap.user.exception.user;

import com.openlap.infrastructure.exception.ValidationException;

/**
 * The supplied current password does not match the stored password → HTTP 400 (validation error).
 *
 * <p>Used when verifying the current password before an email or password change.
 */
public class IncorrectPasswordException extends ValidationException {
  public IncorrectPasswordException(String message) {
    super("INCORRECT_PASSWORD", message);
  }

  public IncorrectPasswordException(String message, Throwable cause) {
    super("INCORRECT_PASSWORD", message, cause);
  }
}
