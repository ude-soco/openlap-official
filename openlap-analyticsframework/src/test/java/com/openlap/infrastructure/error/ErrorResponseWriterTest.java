package com.openlap.infrastructure.error;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.After;
import org.junit.Test;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

/** Unit tests for the shared error writer (used by security components and the catch-all). */
public class ErrorResponseWriterTest {

  private final ObjectMapper objectMapper = new ObjectMapper();

  @After
  public void clearMdc() {
    MDC.clear();
  }

  private static MockHttpServletRequest request() {
    MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/x");
    request.setRequestURI("/api/v1/x");
    return request;
  }

  @Test
  public void writesUnifiedEnvelopeWithStatusAndContentType() throws Exception {
    ErrorResponseWriter writer =
        new ErrorResponseWriter(new ApiErrorResponseFactory(true), objectMapper);
    MockHttpServletResponse response = new MockHttpServletResponse();

    writer.write(request(), response, HttpStatus.FORBIDDEN, "INVALID_TOKEN", "Invalid access token.");

    assertThat(response.getStatus()).isEqualTo(403);
    assertThat(response.getContentType()).contains("application/json");
    JsonNode body = objectMapper.readTree(response.getContentAsString());
    assertThat(body.get("status").asInt()).isEqualTo(403);
    assertThat(body.get("error").asText()).isEqualTo("FORBIDDEN");
    assertThat(body.get("code").asText()).isEqualTo("INVALID_TOKEN");
    assertThat(body.get("message").asText()).isEqualTo("Invalid access token.");
    assertThat(body.get("path").asText()).isEqualTo("/api/v1/x");
    assertThat(body.has("cause")).isFalse();
    assertThat(body.has("httpStatus")).isTrue(); // legacy compat alias
  }

  @Test
  public void includesTraceIdFromMdc() throws Exception {
    MDC.put(ApiErrorResponseFactory.TRACE_ID_MDC_KEY, "trace-1");
    ErrorResponseWriter writer =
        new ErrorResponseWriter(new ApiErrorResponseFactory(true), objectMapper);
    MockHttpServletResponse response = new MockHttpServletResponse();

    writer.write(request(), response, HttpStatus.UNAUTHORIZED, "AUTH_REQUIRED", "m");

    JsonNode body = objectMapper.readTree(response.getContentAsString());
    assertThat(body.get("traceId").asText()).isEqualTo("trace-1");
  }

  @Test
  public void compatDisabledOmitsAliases() throws Exception {
    ErrorResponseWriter writer =
        new ErrorResponseWriter(new ApiErrorResponseFactory(false), objectMapper);
    MockHttpServletResponse response = new MockHttpServletResponse();

    writer.write(request(), response, HttpStatus.FORBIDDEN, "ACCESS_DENIED", "m");

    JsonNode body = objectMapper.readTree(response.getContentAsString());
    assertThat(body.has("httpStatus")).isFalse();
    assertThat(body.has("errors")).isFalse();
  }
}
