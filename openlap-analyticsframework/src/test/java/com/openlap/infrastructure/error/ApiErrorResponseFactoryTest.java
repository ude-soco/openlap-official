package com.openlap.infrastructure.error;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.After;
import org.junit.Test;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;

/** Unit tests for the envelope factory: timestamp, traceId-from-MDC, and legacy aliases. */
public class ApiErrorResponseFactoryTest {

  @After
  public void clearMdc() {
    MDC.clear();
  }

  @Test
  public void populatesRequiredFields() {
    ApiErrorResponse response =
        new ApiErrorResponseFactory(true)
            .create(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found.", "/api/v1/users/my", null);

    assertThat(response.getStatus()).isEqualTo(404);
    assertThat(response.getError()).isEqualTo("NOT_FOUND");
    assertThat(response.getCode()).isEqualTo("USER_NOT_FOUND");
    assertThat(response.getMessage()).isEqualTo("User not found.");
    assertThat(response.getPath()).isEqualTo("/api/v1/users/my");
    assertThat(response.getTimestamp()).isNotBlank();
  }

  @Test
  public void readsTraceIdFromMdc() {
    MDC.put(ApiErrorResponseFactory.TRACE_ID_MDC_KEY, "trace-xyz");

    ApiErrorResponse response =
        new ApiErrorResponseFactory(true).create(HttpStatus.BAD_REQUEST, "X", "m", "/p", null);

    assertThat(response.getTraceId()).isEqualTo("trace-xyz");
  }

  @Test
  public void legacyCompatEnabledAddsAliases() {
    ApiErrorResponse response =
        new ApiErrorResponseFactory(true).create(HttpStatus.NOT_FOUND, "X", "m", "/p", null);

    assertThat(response.getHttpStatus()).isEqualTo("NOT_FOUND");
    assertThat(response.getErrors()).isNotNull(); // legacy ApiError.errors was never null
  }

  @Test
  public void legacyCompatDisabledOmitsAliases() {
    ApiErrorResponse response =
        new ApiErrorResponseFactory(false).create(HttpStatus.NOT_FOUND, "X", "m", "/p", null);

    assertThat(response.getHttpStatus()).isNull();
    assertThat(response.getErrors()).isNull();
  }

  @Test
  public void legacyErrorsFlattensFieldErrors() {
    List<Map<String, Object>> fieldErrors = new ArrayList<>();
    Map<String, Object> fe = new LinkedHashMap<>();
    fe.put("field", "name");
    fe.put("message", "name is mandatory");
    fieldErrors.add(fe);
    Map<String, Object> details = new LinkedHashMap<>();
    details.put("fieldErrors", fieldErrors);

    ApiErrorResponse response =
        new ApiErrorResponseFactory(true)
            .create(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "m", "/p", details);

    assertThat(response.getErrors()).containsEntry("name", "name is mandatory");
  }
}
