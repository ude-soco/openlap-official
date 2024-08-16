package com.openlap.analytics_module.exceptions.analytics_question;

import lombok.extern.slf4j.Slf4j;

@Slf4j
public class AnalyticsQuestionNotFoundException extends RuntimeException {
  public AnalyticsQuestionNotFoundException(String message) {
    super(message);
    log.error(message);
  }

  public AnalyticsQuestionNotFoundException(String message, Throwable cause) {
    super(message, cause);
    log.error(message, cause);
  }
}
