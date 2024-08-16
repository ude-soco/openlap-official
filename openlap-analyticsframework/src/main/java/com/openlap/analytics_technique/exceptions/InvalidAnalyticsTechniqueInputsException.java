package com.openlap.analytics_technique.exceptions;

import lombok.extern.slf4j.Slf4j;

@Slf4j
public class InvalidAnalyticsTechniqueInputsException extends RuntimeException {
  public InvalidAnalyticsTechniqueInputsException(String message) {
    super(message);
    log.error(message);
  }

  public InvalidAnalyticsTechniqueInputsException(String message, Throwable cause) {
    super(message, cause);
    log.error(message, cause);
  }
}
