package com.openlap.infrastructure.error;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;

/**
 * Single mechanism for writing the unified {@link ApiErrorResponse} envelope directly to a servlet
 * response. Used by components that run outside Spring MVC's {@code @ControllerAdvice} flow — the
 * security filters, the {@link org.springframework.security.web.AuthenticationEntryPoint
 * AuthenticationEntryPoint} / {@link
 * org.springframework.security.web.access.AccessDeniedHandler AccessDeniedHandler}, and the
 * last-resort {@code CatchAllExceptionResolver} — so none of them hand-roll JSON.
 *
 * <p>The {@code Throwable} cause is never written; only a client-safe {@code code} + {@code
 * message} are surfaced.
 */
@Component
public class ErrorResponseWriter {

  private final ApiErrorResponseFactory factory;
  private final ObjectMapper objectMapper;

  public ErrorResponseWriter(ApiErrorResponseFactory factory, ObjectMapper objectMapper) {
    this.factory = factory;
    this.objectMapper = objectMapper;
  }

  public void write(
      HttpServletRequest request,
      HttpServletResponse response,
      HttpStatus status,
      String code,
      String message)
      throws IOException {
    if (response.isCommitted()) {
      return;
    }
    ApiErrorResponse body = factory.create(status, code, message, request.getRequestURI(), null);
    response.setStatus(status.value());
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    objectMapper.writeValue(response.getWriter(), body);
  }
}
