package com.openlap.analytics_module.exceptions.analytics_question;

import lombok.extern.slf4j.Slf4j;

@Slf4j
public class AnalyticsQuestionAlreadyExistsException extends RuntimeException {
  public AnalyticsQuestionAlreadyExistsException(String message) {
    super(message);
    log.error(message);
  }

  public AnalyticsQuestionAlreadyExistsException(String message, Throwable cause) {
    super(message, cause);
    log.error(message);
  }
}
