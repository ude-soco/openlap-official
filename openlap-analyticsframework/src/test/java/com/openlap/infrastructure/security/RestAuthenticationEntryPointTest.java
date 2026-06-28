package com.openlap.infrastructure.security;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.openlap.infrastructure.error.ApiErrorResponseFactory;
import com.openlap.infrastructure.error.ErrorResponseWriter;
import org.junit.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.InsufficientAuthenticationException;

/** Unit test for the REST authentication entry point (missing/invalid auth). */
public class RestAuthenticationEntryPointTest {

  private final ObjectMapper objectMapper = new ObjectMapper();
  private final RestAuthenticationEntryPoint entryPoint =
      new RestAuthenticationEntryPoint(
          new ErrorResponseWriter(new ApiErrorResponseFactory(true), objectMapper));

  @Test
  public void commenceRendersForbiddenUnifiedEnvelope() throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/users/my");
    request.setRequestURI("/api/v1/users/my");
    MockHttpServletResponse response = new MockHttpServletResponse();

    entryPoint.commence(request, response, new InsufficientAuthenticationException("no auth"));

    // Status preserved at 403 (prior Http403ForbiddenEntryPoint behaviour).
    assertThat(response.getStatus()).isEqualTo(403);
    JsonNode body = objectMapper.readTree(response.getContentAsString());
    assertThat(body.get("code").asText()).isEqualTo("AUTH_REQUIRED");
    assertThat(body.get("status").asInt()).isEqualTo(403);
    assertThat(body.has("cause")).isFalse();
  }
}
