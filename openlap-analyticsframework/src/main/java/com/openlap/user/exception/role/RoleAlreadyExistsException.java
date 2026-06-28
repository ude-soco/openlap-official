package com.openlap.user.exception.role;

import com.openlap.infrastructure.exception.ConflictException;

/** Role already exists → HTTP 409 (status preserved). */
public class RoleAlreadyExistsException extends ConflictException {
  public RoleAlreadyExistsException(String message) {
    super("ROLE_ALREADY_EXISTS", message);
  }

  public RoleAlreadyExistsException(String message, Throwable cause) {
    super("ROLE_ALREADY_EXISTS", message, cause);
  }
}
