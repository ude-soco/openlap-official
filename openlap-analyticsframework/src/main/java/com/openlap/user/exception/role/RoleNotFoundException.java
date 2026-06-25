package com.openlap.user.exception.role;

import com.openlap.infrastructure.exception.NotFoundException;

/** Role lookup failed → HTTP 404 (status preserved). Rendered by the unified error handler. */
public class RoleNotFoundException extends NotFoundException {
  public RoleNotFoundException(String message) {
    super("ROLE_NOT_FOUND", message);
  }

  public RoleNotFoundException(String message, Throwable cause) {
    super("ROLE_NOT_FOUND", message, cause);
  }
}
