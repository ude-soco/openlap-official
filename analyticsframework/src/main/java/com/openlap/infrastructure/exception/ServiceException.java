package com.openlap.infrastructure.exception;

/**
 * A general service/internal failure → HTTP 500. Rendered by the unified error handler with code
 * {@code SERVICE_ERROR}. The underlying cause is logged centrally and never exposed to clients.
 *
 * <p>Relocated from the retired {@code com.openlap.exception} package; it is now an {@link
 * InfrastructureException} so it flows through the unified error envelope like every other
 * application exception.
 */
public class ServiceException extends InfrastructureException {
  public ServiceException(String message) {
    // Cast disambiguates the (code, message, Throwable) overload from (code, message, Map).
    super("SERVICE_ERROR", message, (Throwable) null);
  }

  public ServiceException(String message, Throwable cause) {
    super("SERVICE_ERROR", message, cause);
  }
}
