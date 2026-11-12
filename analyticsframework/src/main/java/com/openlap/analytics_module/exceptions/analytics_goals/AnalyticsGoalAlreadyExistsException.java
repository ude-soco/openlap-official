package com.openlap.analytics_module.exceptions.analytics_goals;

import com.openlap.infrastructure.exception.ConflictException;

/** An analytics goal with the same identity already exists → HTTP 409. Rendered by the unified handler. */
public class AnalyticsGoalAlreadyExistsException extends ConflictException {
  public AnalyticsGoalAlreadyExistsException(String message) {
    super("ANALYTICS_GOAL_ALREADY_EXISTS", message);
  }

  public AnalyticsGoalAlreadyExistsException(String message, Throwable cause) {
    super("ANALYTICS_GOAL_ALREADY_EXISTS", message, cause);
  }
}
