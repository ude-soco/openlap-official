package com.openlap.analytics_module.exceptions.analytics_question;

import com.openlap.infrastructure.exception.ConflictException;

/** An analytics question with the same identity already exists → HTTP 409. Rendered by the unified handler. */
public class AnalyticsQuestionAlreadyExistsException extends ConflictException {
  public AnalyticsQuestionAlreadyExistsException(String message) {
    super("ANALYTICS_QUESTION_ALREADY_EXISTS", message);
  }

  public AnalyticsQuestionAlreadyExistsException(String message, Throwable cause) {
    super("ANALYTICS_QUESTION_ALREADY_EXISTS", message, cause);
  }
}
