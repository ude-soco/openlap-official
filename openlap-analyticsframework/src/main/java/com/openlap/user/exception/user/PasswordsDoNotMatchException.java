package com.openlap.user.exception.user;

import lombok.extern.slf4j.Slf4j;

@Slf4j
public class PasswordsDoNotMatchException extends RuntimeException {
  public PasswordsDoNotMatchException(String message) {
    super(message);
    log.error(message);
  }

  public PasswordsDoNotMatchException(String message, Throwable cause) {
    super(message, cause);
    log.error(message, cause);
  }
}
