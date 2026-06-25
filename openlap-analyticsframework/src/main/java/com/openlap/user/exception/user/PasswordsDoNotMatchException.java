package com.openlap.user.exception.user;

import com.openlap.infrastructure.exception.ConflictException;

/**
 * Password and confirmation do not match.
 *
 * <p>Status is preserved at HTTP 409 (its prior mapping) by extending {@code ConflictException}.
 * Semantically this is a validation failure (400); status normalization is deferred — see the PR4
 * report.
 */
public class PasswordsDoNotMatchException extends ConflictException {
  public PasswordsDoNotMatchException(String message) {
    super("PASSWORDS_DO_NOT_MATCH", message);
  }

  public PasswordsDoNotMatchException(String message, Throwable cause) {
    super("PASSWORDS_DO_NOT_MATCH", message, cause);
  }
}
