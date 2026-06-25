package com.openlap.user.exception.user;

import com.openlap.infrastructure.exception.ValidationException;

/**
 * Password and confirmation do not match → HTTP 400 (validation error).
 *
 * <p>Normalized from the legacy 409 mapping in PR4.1.
 */
public class PasswordsDoNotMatchException extends ValidationException {
  public PasswordsDoNotMatchException(String message) {
    super("PASSWORDS_DO_NOT_MATCH", message);
  }

  public PasswordsDoNotMatchException(String message, Throwable cause) {
    super("PASSWORDS_DO_NOT_MATCH", message, cause);
  }
}
