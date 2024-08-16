package com.openlap.analytics_technique.exceptions;

import lombok.extern.slf4j.Slf4j;

@Slf4j
public class AnalyticsMethodClassLoaderException extends RuntimeException {
  public AnalyticsMethodClassLoaderException(String message) {
    super(message);
    log.error(message);
  }

  public AnalyticsMethodClassLoaderException(String message, Throwable cause) {
    super(message, cause);
    log.error(message, cause);
  }
}
