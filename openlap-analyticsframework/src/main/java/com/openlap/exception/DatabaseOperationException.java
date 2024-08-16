package com.openlap.exception;

import lombok.extern.slf4j.Slf4j;

@Slf4j
public class DatabaseOperationException extends RuntimeException {
  public DatabaseOperationException(String message) {
    super(message);
    log.error(message);
  }

  public DatabaseOperationException(String message, Throwable cause) {
    super(message, cause);
    log.error(message, cause);
  }
}
