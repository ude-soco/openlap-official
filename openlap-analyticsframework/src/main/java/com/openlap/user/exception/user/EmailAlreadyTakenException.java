package com.openlap.user.exception.user;

import com.openlap.infrastructure.exception.ConflictException;

/** Registration with an already-used email → HTTP 409 (status preserved). */
public class EmailAlreadyTakenException extends ConflictException {
  public EmailAlreadyTakenException(String message) {
    super("EMAIL_ALREADY_TAKEN", message);
  }

  public EmailAlreadyTakenException(String message, Throwable cause) {
    super("EMAIL_ALREADY_TAKEN", message, cause);
  }
}
