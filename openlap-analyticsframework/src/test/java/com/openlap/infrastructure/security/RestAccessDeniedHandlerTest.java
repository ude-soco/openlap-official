package com.openlap.infrastructure.security;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.openlap.infrastructure.error.ApiErrorResponseFactory;
import com.openlap.infrastructure.error.ErrorResponseWriter;
import org.junit.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.access.AccessDeniedException;

/** Unit test for the REST access-denied handler (authenticated but unauthorized). */
public class RestAccessDeniedHandlerTest {

  private final ObjectMapper objectMapper = new ObjectMapper();
  private final RestAccessDeniedHandler handler =
      new RestAccessDeniedHandler(
          new ErrorResponseWriter(new ApiErrorResponseFactory(true), objectMapper));

  @Test
  public void handleRendersForbiddenWithoutLeakingInternalMessage() throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/roles");
    request.setRequestURI("/api/v1/roles");
    MockHttpServletResponse response = new MockHttpServletResponse();

    handler.handle(request, response, new AccessDeniedException("super secret internal detail"));

    assertThat(response.getStatus()).isEqualTo(403);
    JsonNode body = objectMapper.readTree(response.getContentAsString());
    assertThat(body.get("code").asText()).isEqualTo("ACCESS_DENIED");
    assertThat(body.get("message").asText()).isEqualTo("Access is denied.");
    assertThat(response.getContentAsString()).doesNotContain("super secret internal detail");
    assertThat(body.has("cause")).isFalse();
  }
}
