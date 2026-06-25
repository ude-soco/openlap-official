package com.openlap.user.exception.user;

import com.openlap.infrastructure.exception.ConflictException;

/**
 * Mutually-exclusive user details supplied (e.g. both LRS provider and consumer).
 *
 * <p>Status is preserved at HTTP 409 (its prior mapping) by extending {@code ConflictException}.
 * Semantically this is a validation failure (400); status normalization is deferred — see the PR4
 * report.
 */
public class InvalidUserDetailsException extends ConflictException {
  public InvalidUserDetailsException(String message) {
    super("INVALID_USER_DETAILS", message);
  }

  public InvalidUserDetailsException(String message, Throwable cause) {
    super("INVALID_USER_DETAILS", message, cause);
  }
}
