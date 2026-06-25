package com.openlap.infrastructure.error;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import java.util.Map;
import lombok.Builder;
import lombok.Getter;

/**
 * The project's unified error envelope.
 *
 * <p>Always carries {@code timestamp, status, error, code, message, path}. {@code traceId} is
 * present when a correlation id is available; {@code details} is omitted when empty. The original
 * {@code Throwable} cause is <strong>never</strong> a field here, so it can never be serialized to a
 * client.
 *
 * <p>{@code httpStatus} and {@code errors} are legacy compatibility aliases populated by {@link
 * ApiErrorResponseFactory} only when {@code openlap.api.error.legacy-compat=true}.
 */
@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonPropertyOrder({
  "timestamp",
  "status",
  "error",
  "code",
  "message",
  "path",
  "traceId",
  "details",
  "httpStatus",
  "errors"
})
public class ApiErrorResponse {

  /** ISO-8601 instant in UTC, e.g. {@code 2026-06-25T20:31:08.082Z}. */
  private final String timestamp;

  /** Numeric HTTP status, e.g. {@code 404}. */
  private final int status;

  /** {@code HttpStatus} name, e.g. {@code NOT_FOUND}. */
  private final String error;

  /** Stable, machine-readable application code, e.g. {@code USER_NOT_FOUND}. */
  private final String code;

  /** Client-safe human message. */
  private final String message;

  /** Request URI (includes the {@code /api} context path). */
  private final String path;

  /** Correlation id; omitted when none is available. */
  private final String traceId;

  /** Optional structured details (e.g. field errors). Omitted when null or empty. */
  @JsonInclude(JsonInclude.Include.NON_EMPTY)
  private final Map<String, Object> details;

  // ---- Legacy compatibility aliases (null unless legacy-compat is enabled) ----

  /** Legacy alias of {@code error} (enum name) for clients of the old {@code ApiError}. */
  private final String httpStatus;

  /** Legacy alias of {@code details} (flat map form) for clients of the old {@code ApiError}. */
  private final Map<String, Object> errors;
}
