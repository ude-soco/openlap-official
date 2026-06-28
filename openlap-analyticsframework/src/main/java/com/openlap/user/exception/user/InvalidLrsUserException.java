package com.openlap.user.exception.user;

import com.openlap.infrastructure.exception.ValidationException;

/**
 * The supplied user/identifier does not belong to the LRS → HTTP 400 (validation error).
 *
 * <p>Normalized from the legacy 404 mapping in PR4.1.
 */
public class InvalidLrsUserException extends ValidationException {
  public InvalidLrsUserException(String message) {
    super("INVALID_LRS_USER", message);
  }

  public InvalidLrsUserException(String message, Throwable cause) {
    super("INVALID_LRS_USER", message, cause);
  }
}
