package com.openlap.analytics_module.exceptions.indicator;

import lombok.extern.slf4j.Slf4j;

@Slf4j
public class IndicatorManipulationNotAllowed extends RuntimeException {
  public IndicatorManipulationNotAllowed(String message) {
    super(message);
    log.warn(message);
  }

  public IndicatorManipulationNotAllowed(String message, Throwable cause) {
    super(message, cause);
    log.warn(message, cause);
  }
}
