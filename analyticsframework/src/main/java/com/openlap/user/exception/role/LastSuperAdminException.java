package com.openlap.user.exception.role;

import com.openlap.infrastructure.exception.ConflictException;

/**
 * Attempt to remove the role of the last remaining super admin → HTTP 409 (conflict). The system
 * must always retain at least one {@code ROLE_SUPER_ADMIN}.
 */
public class LastSuperAdminException extends ConflictException {
  public LastSuperAdminException(String message) {
    super("LAST_SUPER_ADMIN", message);
  }
}
