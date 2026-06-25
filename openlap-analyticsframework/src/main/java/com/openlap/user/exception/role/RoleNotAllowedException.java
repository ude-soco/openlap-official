package com.openlap.user.exception.role;

import com.openlap.infrastructure.exception.ConflictException;

/**
 * A role that is not permitted for the requested operation.
 *
 * <p>Status is preserved at HTTP 409 (its prior mapping) by extending {@code ConflictException}.
 * Semantically this is a forbidden operation (403); status normalization is deferred — see the PR4
 * report.
 */
public class RoleNotAllowedException extends ConflictException {
  public RoleNotAllowedException(String message) {
    super("ROLE_NOT_ALLOWED", message);
  }

  public RoleNotAllowedException(String message, Throwable cause) {
    super("ROLE_NOT_ALLOWED", message, cause);
  }
}
