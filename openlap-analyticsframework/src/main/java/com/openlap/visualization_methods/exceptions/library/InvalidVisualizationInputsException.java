package com.openlap.visualization_methods.exceptions.library;

import lombok.extern.slf4j.Slf4j;

@Slf4j
public class InvalidVisualizationInputsException extends RuntimeException {
  public InvalidVisualizationInputsException(String message) {
    super(message);
    log.error(message);
  }

  public InvalidVisualizationInputsException(String message, Throwable cause) {
    super(message, cause);
    log.error(message, cause);
  }
}
