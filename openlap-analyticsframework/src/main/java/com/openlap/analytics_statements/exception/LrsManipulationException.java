package com.openlap.analytics_statements.exception;

import lombok.extern.slf4j.Slf4j;

@Slf4j
public class LrsManipulationException extends RuntimeException {
  public LrsManipulationException(String message) {
    super(message);
    log.error(message);
  }

  public LrsManipulationException(String message, Throwable cause) {
    super(message, cause);
    log.error(message, cause);
  }
}
