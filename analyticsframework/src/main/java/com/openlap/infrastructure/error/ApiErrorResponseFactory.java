package com.openlap.infrastructure.error;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/**
 * Builds {@link ApiErrorResponse} instances from their parts, stamping the timestamp, pulling the
 * {@code traceId} from the MDC, and (when enabled) populating the legacy compatibility aliases.
 *
 * <p>The legacy-compat behaviour is controlled by {@code openlap.api.error.legacy-compat} (default
 * {@code true} during migration). When enabled, every error also carries {@code httpStatus} (enum
 * name) and {@code errors} (flat map) so existing clients of the old {@code ApiError} keep working.
 * The {@code cause} is never added.
 */
@Component
public class ApiErrorResponseFactory {

  /** MDC key under which {@code TraceIdFilter} stores the correlation id. */
  public static final String TRACE_ID_MDC_KEY = "traceId";

  private final boolean legacyCompat;

  public ApiErrorResponseFactory(
      @Value("${openlap.api.error.legacy-compat:true}") boolean legacyCompat) {
    this.legacyCompat = legacyCompat;
  }

  public ApiErrorResponse create(
      HttpStatus status, String code, String message, String path, Map<String, Object> details) {
    Map<String, Object> safeDetails = (details == null || details.isEmpty()) ? null : details;
    String traceId = MDC.get(TRACE_ID_MDC_KEY);

    ApiErrorResponse.ApiErrorResponseBuilder builder =
        ApiErrorResponse.builder()
            .timestamp(Instant.now().toString())
            .status(status.value())
            .error(status.name())
            .code(code)
            .message(message)
            .path(path)
            .traceId(traceId)
            .details(safeDetails);

    if (legacyCompat) {
      builder.httpStatus(status.name());
      builder.errors(toLegacyErrors(safeDetails));
    }
    return builder.build();
  }

  /**
   * Mirrors the old {@code ApiError.errors} contract (a flat, never-null map). Field errors are
   * flattened to {@code field -> message}; any other details are copied as-is.
   */
  private Map<String, Object> toLegacyErrors(Map<String, Object> details) {
    Map<String, Object> errors = new LinkedHashMap<>();
    if (details == null) {
      return errors;
    }
    Object fieldErrors = details.get("fieldErrors");
    if (fieldErrors instanceof List) {
      for (Object element : (List<?>) fieldErrors) {
        if (element instanceof Map) {
          Map<?, ?> fieldError = (Map<?, ?>) element;
          Object field = fieldError.get("field");
          if (field != null) {
            errors.put(String.valueOf(field), fieldError.get("message"));
          }
        }
      }
    } else {
      errors.putAll(details);
    }
    return errors;
  }
}
