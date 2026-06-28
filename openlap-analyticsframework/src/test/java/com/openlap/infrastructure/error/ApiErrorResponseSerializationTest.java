package com.openlap.infrastructure.error;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.Test;

/** Pure serialization tests for the unified error envelope. */
public class ApiErrorResponseSerializationTest {

  private final ObjectMapper objectMapper = new ObjectMapper();

  @Test
  public void serializesAllRequiredFields() throws Exception {
    ApiErrorResponse response =
        ApiErrorResponse.builder()
            .timestamp("2026-06-25T20:31:08.082Z")
            .status(404)
            .error("NOT_FOUND")
            .code("USER_NOT_FOUND")
            .message("User not found.")
            .path("/api/v1/users/my")
            .traceId("abc123")
            .build();

    String json = objectMapper.writeValueAsString(response);

    assertThat(json)
        .contains("\"timestamp\":\"2026-06-25T20:31:08.082Z\"")
        .contains("\"status\":404")
        .contains("\"error\":\"NOT_FOUND\"")
        .contains("\"code\":\"USER_NOT_FOUND\"")
        .contains("\"message\":\"User not found.\"")
        .contains("\"path\":\"/api/v1/users/my\"")
        .contains("\"traceId\":\"abc123\"");
  }

  @Test
  public void omitsNullAndEmptyDetailsAndTraceId() throws Exception {
    ApiErrorResponse response =
        ApiErrorResponse.builder()
            .timestamp("t")
            .status(500)
            .error("INTERNAL_SERVER_ERROR")
            .code("INTERNAL_ERROR")
            .message("boom")
            .path("/x")
            .details(Collections.emptyMap())
            .build();

    String json = objectMapper.writeValueAsString(response);

    assertThat(json).doesNotContain("traceId").doesNotContain("details");
  }

  @Test
  public void includesDetailsWhenPresent() throws Exception {
    Map<String, Object> details = new LinkedHashMap<>();
    details.put("parameter", "q");
    ApiErrorResponse response =
        ApiErrorResponse.builder().timestamp("t").status(400).error("BAD_REQUEST").code("MISSING_PARAMETER").message("m").path("/x").details(details).build();

    String json = objectMapper.writeValueAsString(response);

    assertThat(json).contains("\"details\":{\"parameter\":\"q\"}");
  }

  @Test
  public void includesLegacyAliasesWhenSet() throws Exception {
    Map<String, Object> errors = new LinkedHashMap<>();
    errors.put("name", "name is mandatory");
    ApiErrorResponse response =
        ApiErrorResponse.builder().timestamp("t").status(400).error("BAD_REQUEST").code("VALIDATION_FAILED").message("m").path("/x").httpStatus("BAD_REQUEST").errors(errors).build();

    String json = objectMapper.writeValueAsString(response);

    assertThat(json).contains("\"httpStatus\":\"BAD_REQUEST\"").contains("\"errors\":{\"name\":\"name is mandatory\"}");
  }

  @Test
  public void neverSerializesCause() throws Exception {
    ApiErrorResponse response =
        ApiErrorResponse.builder().timestamp("t").status(500).error("INTERNAL_SERVER_ERROR").code("INTERNAL_ERROR").message("m").path("/x").build();

    String json = objectMapper.writeValueAsString(response);

    assertThat(json).doesNotContain("cause");
  }
}
