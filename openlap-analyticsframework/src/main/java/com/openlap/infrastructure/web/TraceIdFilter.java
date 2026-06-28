package com.openlap.infrastructure.web;

import com.openlap.infrastructure.error.ApiErrorResponseFactory;
import java.io.IOException;
import java.util.UUID;
import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Assigns a correlation id to every request: reuses an inbound {@code X-Request-Id} /
 * {@code X-Correlation-Id} header or generates one, stores it in the MDC under {@code traceId},
 * echoes it on the {@code X-Request-Id} response header, and clears the MDC afterwards.
 *
 * <p>Runs at highest precedence so the id is available to all downstream filters (including the
 * security chain) and to the error handlers.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class TraceIdFilter extends OncePerRequestFilter {

  public static final String REQUEST_ID_HEADER = "X-Request-Id";
  public static final String CORRELATION_ID_HEADER = "X-Correlation-Id";

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    String traceId =
        firstNonBlank(request.getHeader(REQUEST_ID_HEADER), request.getHeader(CORRELATION_ID_HEADER));
    if (traceId == null) {
      traceId = UUID.randomUUID().toString();
    }
    MDC.put(ApiErrorResponseFactory.TRACE_ID_MDC_KEY, traceId);
    response.setHeader(REQUEST_ID_HEADER, traceId);
    try {
      filterChain.doFilter(request, response);
    } finally {
      MDC.remove(ApiErrorResponseFactory.TRACE_ID_MDC_KEY);
    }
  }

  private static String firstNonBlank(String first, String second) {
    if (first != null && !first.trim().isEmpty()) {
      return first;
    }
    if (second != null && !second.trim().isEmpty()) {
      return second;
    }
    return null;
  }
}
