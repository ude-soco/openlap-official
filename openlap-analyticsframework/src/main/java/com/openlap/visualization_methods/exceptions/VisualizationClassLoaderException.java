package com.openlap.visualization_methods.exceptions;

import lombok.extern.slf4j.Slf4j;

@Slf4j
public class VisualizationClassLoaderException extends RuntimeException {
  public VisualizationClassLoaderException(String message) {
    super(message);
    log.error(message);
  }

  public VisualizationClassLoaderException(String message, Throwable cause) {
    super(message, cause);
    log.error(message, cause);
  }
}
