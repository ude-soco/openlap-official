package com.openlap.analytics_statements.exception;

import lombok.extern.slf4j.Slf4j;

@Slf4j
public class LrsNotFoundException extends RuntimeException {
  public LrsNotFoundException(String message) {
    super(message);
    log.error(message);
  }

  public LrsNotFoundException(String message, Throwable cause) {
    super(message, cause);
    log.error(message, cause);
  }
}
