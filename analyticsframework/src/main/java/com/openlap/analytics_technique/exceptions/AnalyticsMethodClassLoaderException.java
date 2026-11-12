package com.openlap.analytics_technique.exceptions;

import com.openlap.infrastructure.exception.InfrastructureException;

/**
 * Loading an analytics-method class/jar failed → HTTP 500 (status preserved). Rendered by the
 * unified error handler. The underlying cause is logged centrally and never exposed to clients.
 */
public class AnalyticsMethodClassLoaderException extends InfrastructureException {
  public AnalyticsMethodClassLoaderException(String message) {
    // Cast disambiguates the (code, message, Throwable) overload from (code, message, Map).
    super("ANALYTICS_TECHNIQUE_CLASS_LOAD_FAILED", message, (Throwable) null);
  }

  public AnalyticsMethodClassLoaderException(String message, Throwable cause) {
    super("ANALYTICS_TECHNIQUE_CLASS_LOAD_FAILED", message, cause);
  }
}
