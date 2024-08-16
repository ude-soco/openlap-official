package com.openlap.user.exception.user;

import lombok.extern.slf4j.Slf4j;

@Slf4j
public class InvalidUserDetailsException extends RuntimeException {
  public InvalidUserDetailsException(String message) {
    super(message);
    log.error(message);
  }

  public InvalidUserDetailsException(String message, Throwable cause) {
    super(message, cause);
    log.error(message, cause);
  }
}
