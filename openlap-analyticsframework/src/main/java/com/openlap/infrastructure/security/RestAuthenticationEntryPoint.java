package com.openlap.infrastructure.security;

import com.openlap.infrastructure.error.ErrorResponseWriter;
import java.io.IOException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

/**
 * Renders the unified error envelope when an unauthenticated request hits a protected endpoint
 * (missing JWT, or a malformed {@code Authorization} header that left the context anonymous).
 *
 * <p>Status is intentionally kept at <strong>403</strong> to preserve the project's prior behaviour
 * (the default {@code Http403ForbiddenEntryPoint}). Only the response body changes. Status
 * normalization (401) is deferred to the later security P1 task.
 */
@Component
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {

  private final ErrorResponseWriter writer;

  public RestAuthenticationEntryPoint(ErrorResponseWriter writer) {
    this.writer = writer;
  }

  @Override
  public void commence(
      HttpServletRequest request, HttpServletResponse response, AuthenticationException authException)
      throws IOException {
    writer.write(request, response, HttpStatus.FORBIDDEN, "AUTH_REQUIRED", "Authentication is required.");
  }
}
