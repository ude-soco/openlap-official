package com.openlap.analytics_module.exceptions.analytics_question;

import com.openlap.infrastructure.exception.NotFoundException;

/** Requested analytics question does not exist → HTTP 404. Rendered by the unified handler. */
public class AnalyticsQuestionNotFoundException extends NotFoundException {
  public AnalyticsQuestionNotFoundException(String message) {
    super("ANALYTICS_QUESTION_NOT_FOUND", message);
  }

  public AnalyticsQuestionNotFoundException(String message, Throwable cause) {
    super("ANALYTICS_QUESTION_NOT_FOUND", message, cause);
  }
}
