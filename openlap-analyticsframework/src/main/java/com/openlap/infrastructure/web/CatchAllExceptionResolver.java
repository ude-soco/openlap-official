package com.openlap.infrastructure.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openlap.infrastructure.error.ApiErrorResponse;
import com.openlap.infrastructure.error.ApiErrorResponseFactory;
import java.io.IOException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerExceptionResolver;
import org.springframework.web.servlet.ModelAndView;

/**
 * True last-resort catch-all. Registered as a {@link HandlerExceptionResolver} at {@link
 * Ordered#LOWEST_PRECEDENCE}, so the DispatcherServlet invokes it only <em>after</em> the default
 * resolver composite (which processes every {@code @ControllerAdvice}, including the legacy module
 * and central handlers). It therefore handles only genuinely unhandled exceptions and can never
 * steal an exception that an existing handler already owns.
 *
 * <p>Renders the unified {@link ApiErrorResponse} envelope as a generic HTTP 500, logging the full
 * exception server-side with the {@code traceId}.
 */
@Slf4j
@Component
@Order(Ordered.LOWEST_PRECEDENCE)
public class CatchAllExceptionResolver implements HandlerExceptionResolver {

  private final ApiErrorResponseFactory factory;
  private final ObjectMapper objectMapper;

  public CatchAllExceptionResolver(ApiErrorResponseFactory factory, ObjectMapper objectMapper) {
    this.factory = factory;
    this.objectMapper = objectMapper;
  }

  @Override
  public ModelAndView resolveException(
      HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
    if (response.isCommitted()) {
      return null;
    }
    HttpStatus status = HttpStatus.INTERNAL_SERVER_ERROR;
    String traceId = MDC.get(ApiErrorResponseFactory.TRACE_ID_MDC_KEY);
    log.error(
        "[{}] Unhandled exception for {} {} -> 500", traceId, request.getMethod(), request.getRequestURI(), ex);

    ApiErrorResponse body =
        factory.create(
            status, "INTERNAL_ERROR", "An unexpected error occurred.", request.getRequestURI(), null);
    try {
      response.setStatus(status.value());
      response.setContentType(MediaType.APPLICATION_JSON_VALUE);
      objectMapper.writeValue(response.getWriter(), body);
    } catch (IOException io) {
      log.error("Failed to write catch-all error response", io);
    }
    return new ModelAndView(); // empty MAV signals "handled"
  }
}
