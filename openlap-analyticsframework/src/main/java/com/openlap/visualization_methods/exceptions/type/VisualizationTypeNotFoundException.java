package com.openlap.visualization_methods.exceptions.type;

import lombok.extern.slf4j.Slf4j;

@Slf4j
public class VisualizationTypeNotFoundException extends RuntimeException {

  public VisualizationTypeNotFoundException(String message) {
    super(message);
    log.error(message);
  }

  public VisualizationTypeNotFoundException(String message, Throwable cause) {
    super(message, cause);
    log.error(message, cause);
  }
}
