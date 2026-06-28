package com.openlap.analytics_module.exceptions.indicator;

import com.openlap.infrastructure.exception.ForbiddenException;

/**
 * The indicator preview/duplication is not permitted for this caller (e.g. the user does not belong
 * to the same LRS) → HTTP 403 (status preserved). Rendered by the unified error handler.
 */
public class PreviewNotPossibleException extends ForbiddenException {
  public PreviewNotPossibleException(String message) {
    super("INDICATOR_PREVIEW_NOT_POSSIBLE", message);
  }

  public PreviewNotPossibleException(String message, Throwable cause) {
    super("INDICATOR_PREVIEW_NOT_POSSIBLE", message, cause);
  }
}
