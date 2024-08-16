package com.openlap.analytics_technique.exceptions;

public class AnalyticsTechniqueNotFoundException extends RuntimeException {
  public AnalyticsTechniqueNotFoundException(String message) {
    super(message);
  }

  public AnalyticsTechniqueNotFoundException(String message, Throwable cause) {
    super(message, cause);
  }
}
