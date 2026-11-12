package com.openlap.analytics_module.exceptions.analytics_question;

import com.openlap.infrastructure.exception.ForbiddenException;

/**
 * Caller is not permitted to perform the requested operation on the question (e.g. update/delete a
 * question they do not own) → HTTP 403. Rendered by the unified error handler.
 */
public class AnalyticsQuestionMethodNotAllowedException extends ForbiddenException {
  public AnalyticsQuestionMethodNotAllowedException(String message) {
    super("ANALYTICS_QUESTION_METHOD_NOT_ALLOWED", message);
  }

  public AnalyticsQuestionMethodNotAllowedException(String message, Throwable cause) {
    super("ANALYTICS_QUESTION_METHOD_NOT_ALLOWED", message, cause);
  }
}
