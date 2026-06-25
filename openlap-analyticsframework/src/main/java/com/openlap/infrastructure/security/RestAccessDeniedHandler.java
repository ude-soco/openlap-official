package com.openlap.infrastructure.security;

import com.openlap.infrastructure.error.ErrorResponseWriter;
import java.io.IOException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

/**
 * Renders the unified error envelope when an authenticated principal lacks the required authority
 * (HTTP 403). The internal {@link AccessDeniedException} message is never exposed to the client.
 */
@Component
public class RestAccessDeniedHandler implements AccessDeniedHandler {

  private final ErrorResponseWriter writer;

  public RestAccessDeniedHandler(ErrorResponseWriter writer) {
    this.writer = writer;
  }

  @Override
  public void handle(
      HttpServletRequest request,
      HttpServletResponse response,
      AccessDeniedException accessDeniedException)
      throws IOException {
    writer.write(request, response, HttpStatus.FORBIDDEN, "ACCESS_DENIED", "Access is denied.");
  }
}
