package com.openlap.infrastructure.exception;

/**
 * A database/persistence operation failed → HTTP 500. Rendered by the unified error handler with
 * code {@code DATABASE_OPERATION_FAILED}. The underlying cause is logged centrally and never
 * exposed to clients.
 *
 * <p>Relocated from the retired {@code com.openlap.exception} package; it is now an {@link
 * InfrastructureException} so it flows through the unified error envelope like every other
 * application exception.
 */
public class DatabaseOperationException extends InfrastructureException {
  public DatabaseOperationException(String message) {
    // Cast disambiguates the (code, message, Throwable) overload from (code, message, Map).
    super("DATABASE_OPERATION_FAILED", message, (Throwable) null);
  }

  public DatabaseOperationException(String message, Throwable cause) {
    super("DATABASE_OPERATION_FAILED", message, cause);
  }
}
