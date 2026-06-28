package com.openlap.visualization_methods.exceptions;

import com.openlap.infrastructure.exception.InfrastructureException;

/**
 * Loading a visualization-method class/jar failed → HTTP 500 (status preserved). Rendered by the
 * unified error handler. The underlying cause is logged centrally and never exposed to clients.
 */
public class VisualizationClassLoaderException extends InfrastructureException {
  public VisualizationClassLoaderException(String message) {
    // Cast disambiguates the (code, message, Throwable) overload from (code, message, Map).
    super("VISUALIZATION_METHOD_CLASS_LOAD_FAILED", message, (Throwable) null);
  }

  public VisualizationClassLoaderException(String message, Throwable cause) {
    super("VISUALIZATION_METHOD_CLASS_LOAD_FAILED", message, cause);
  }
}
