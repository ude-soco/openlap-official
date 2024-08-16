package com.openlap.user.exception.role;

import lombok.extern.slf4j.Slf4j;

@Slf4j
public class RoleAlreadyExistsException extends RuntimeException {
  public RoleAlreadyExistsException(String message) {
    super(message);
    log.error(message);
  }

  public RoleAlreadyExistsException(String message, Throwable cause) {
    super(message, cause);
    log.error(message, cause);
  }
}
