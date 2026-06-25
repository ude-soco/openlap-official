package com.openlap.user.exception.user;

import com.openlap.infrastructure.exception.NotFoundException;

/**
 * The supplied user/identifier does not belong to the LRS.
 *
 * <p>Status is preserved at HTTP 404 (its prior mapping) by extending {@code NotFoundException}.
 * Semantically this is a validation failure (400); status normalization is deferred — see the PR4
 * report.
 */
public class InvalidLrsUserException extends NotFoundException {
  public InvalidLrsUserException(String message) {
    super("INVALID_LRS_USER", message);
  }

  public InvalidLrsUserException(String message, Throwable cause) {
    super("INVALID_LRS_USER", message, cause);
  }
}
