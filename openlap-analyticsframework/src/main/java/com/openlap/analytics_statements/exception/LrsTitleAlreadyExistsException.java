package com.openlap.analytics_statements.exception;

import lombok.extern.slf4j.Slf4j;

@Slf4j
public class LrsTitleAlreadyExistsException extends RuntimeException {
  public LrsTitleAlreadyExistsException(String message) {
    super(message);
    log.error(message);
  }

  public LrsTitleAlreadyExistsException(String message, Throwable cause) {
    super(message, cause);
    log.error(message, cause);
  }
}
