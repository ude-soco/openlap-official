package com.openlap.analytics_module.exceptions.indicator;

import lombok.extern.slf4j.Slf4j;

@Slf4j
public class PreviewNotPossibleException extends RuntimeException {
  public PreviewNotPossibleException(String message) {
    super(message);
    log.error(message);
  }

  public PreviewNotPossibleException(String message, Throwable cause) {
    super(message, cause);
    log.error(message, cause);
  }
}
