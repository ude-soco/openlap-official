package com.openlap.exception;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import org.junit.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

public class GlobalExceptionHandlerTest {
  @Test
  public void invalidPluginExceptionUsesUnprocessableEntity() {
    GlobalExceptionHandler handler = new GlobalExceptionHandler();

    ResponseEntity<?> response =
        handler.handleInvalidPluginException(new InvalidPluginException("bad plugin"));

    assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, response.getStatusCode());
    assertTrue(response.getBody() instanceof ApiError);
    ApiError error = (ApiError) response.getBody();
    assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, error.getHttpStatus());
    assertEquals("bad plugin", error.getErrors().get("pluginUploadError"));
  }
}
