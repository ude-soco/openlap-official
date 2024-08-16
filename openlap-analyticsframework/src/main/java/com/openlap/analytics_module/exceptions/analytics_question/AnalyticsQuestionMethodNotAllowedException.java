package com.openlap.analytics_module.exceptions.analytics_question;

import lombok.extern.slf4j.Slf4j;

@Slf4j
public class AnalyticsQuestionMethodNotAllowedException extends RuntimeException {
  public AnalyticsQuestionMethodNotAllowedException(String message) {
    super(message);
    log.error(message);
  }

  public AnalyticsQuestionMethodNotAllowedException(String message, Throwable cause) {
    super(message, cause);
    log.error(message, cause);
  }
}
