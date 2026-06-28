package com.openlap.analytics_technique.exceptions;

import com.openlap.infrastructure.exception.NotFoundException;

/** Requested analytics technique does not exist → HTTP 404. Rendered by the unified handler. */
public class AnalyticsTechniqueNotFoundException extends NotFoundException {
  public AnalyticsTechniqueNotFoundException(String message) {
    super("ANALYTICS_TECHNIQUE_NOT_FOUND", message);
  }

  public AnalyticsTechniqueNotFoundException(String message, Throwable cause) {
    super("ANALYTICS_TECHNIQUE_NOT_FOUND", message, cause);
  }
}
