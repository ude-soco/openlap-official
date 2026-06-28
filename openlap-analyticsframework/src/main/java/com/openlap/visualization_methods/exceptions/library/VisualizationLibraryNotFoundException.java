package com.openlap.visualization_methods.exceptions.library;

import com.openlap.infrastructure.exception.NotFoundException;

/** Requested visualization library does not exist → HTTP 404. Rendered by the unified handler. */
public class VisualizationLibraryNotFoundException extends NotFoundException {
  public VisualizationLibraryNotFoundException(String message) {
    super("VISUALIZATION_LIBRARY_NOT_FOUND", message);
  }

  public VisualizationLibraryNotFoundException(String message, Throwable cause) {
    super("VISUALIZATION_LIBRARY_NOT_FOUND", message, cause);
  }
}
