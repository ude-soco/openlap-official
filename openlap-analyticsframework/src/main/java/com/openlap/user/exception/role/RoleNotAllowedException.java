package com.openlap.user.exception.role;

import lombok.extern.slf4j.Slf4j;

@Slf4j
public class RoleNotAllowedException extends RuntimeException {
  public RoleNotAllowedException(String message) {
    super(message);
    log.error(message);
  }

  public RoleNotAllowedException(String message, Throwable cause) {
    super(message, cause);
    log.error(message, cause);
  }
}
