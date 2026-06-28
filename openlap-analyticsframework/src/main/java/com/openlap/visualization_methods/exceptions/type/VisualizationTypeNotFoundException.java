package com.openlap.visualization_methods.exceptions.type;

import com.openlap.infrastructure.exception.NotFoundException;

/** Requested visualization type does not exist → HTTP 404. Rendered by the unified handler. */
public class VisualizationTypeNotFoundException extends NotFoundException {
  public VisualizationTypeNotFoundException(String message) {
    super("VISUALIZATION_TYPE_NOT_FOUND", message);
  }

  public VisualizationTypeNotFoundException(String message, Throwable cause) {
    super("VISUALIZATION_TYPE_NOT_FOUND", message, cause);
  }
}
