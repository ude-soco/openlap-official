package com.openlap.user.exception.role;

import com.openlap.infrastructure.exception.ForbiddenException;

/**
 * A role that is not permitted for the requested operation → HTTP 403 (forbidden).
 *
 * <p>Normalized from the legacy 409 mapping in PR4.1.
 */
public class RoleNotAllowedException extends ForbiddenException {
  public RoleNotAllowedException(String message) {
    super("ROLE_NOT_ALLOWED", message);
  }

  public RoleNotAllowedException(String message, Throwable cause) {
    super("ROLE_NOT_ALLOWED", message, cause);
  }
}
