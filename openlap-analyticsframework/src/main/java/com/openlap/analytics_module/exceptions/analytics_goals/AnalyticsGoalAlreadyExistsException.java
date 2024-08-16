package com.openlap.analytics_module.exceptions.analytics_goals;

import lombok.extern.slf4j.Slf4j;

@Slf4j
public class AnalyticsGoalAlreadyExistsException extends RuntimeException {
  public AnalyticsGoalAlreadyExistsException(String message) {
    super(message);
    log.error(message);
  }

  public AnalyticsGoalAlreadyExistsException(String message, Throwable cause) {
    super(message, cause);
    log.error(message);
  }
}
