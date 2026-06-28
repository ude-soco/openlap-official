package com.openlap.analytics_module.exceptions.analytics_goals;

import com.openlap.infrastructure.exception.NotFoundException;

/**
 * Requested analytics question (referenced from a goal) does not exist → HTTP 404. Rendered by the
 * unified error handler.
 */
public class AnalyticsQuestionNotFoundException extends NotFoundException {
  public AnalyticsQuestionNotFoundException(String message) {
    super("ANALYTICS_QUESTION_NOT_FOUND", message);
  }

  public AnalyticsQuestionNotFoundException(String message, Throwable cause) {
    super("ANALYTICS_QUESTION_NOT_FOUND", message, cause);
  }
}
