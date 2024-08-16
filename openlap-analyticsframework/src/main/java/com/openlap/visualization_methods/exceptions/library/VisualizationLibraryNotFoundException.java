package com.openlap.visualization_methods.exceptions.library;

import lombok.extern.slf4j.Slf4j;

@Slf4j
public class VisualizationLibraryNotFoundException extends RuntimeException {
  public VisualizationLibraryNotFoundException(String message) {
    super(message);
    log.error(message);
  }

  public VisualizationLibraryNotFoundException(String message, Throwable cause) {
    super(message, cause);
    log.error(message, cause);
  }
}
