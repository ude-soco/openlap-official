package com.openlap.user.exception.user;

import lombok.extern.slf4j.Slf4j;

@Slf4j
public class InvalidLrsUserException extends RuntimeException {
  public InvalidLrsUserException(String message) {
    super(message);
    log.error(message);
  }

  public InvalidLrsUserException(String message, Throwable cause) {
    super(message, cause);
    log.error(message, cause);
  }
}
