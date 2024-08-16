package com.openlap.analytics_module.exceptions.indicator;

import lombok.extern.slf4j.Slf4j;

@Slf4j
public class IndicatorNotFoundException extends RuntimeException {
  public IndicatorNotFoundException(String message) {
    super(message);
    log.error(message);
  }

  public IndicatorNotFoundException(String message, Throwable cause) {
    super(message, cause);
    log.error(message, cause);
  }
}
