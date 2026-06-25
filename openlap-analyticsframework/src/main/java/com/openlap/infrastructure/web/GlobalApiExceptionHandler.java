package com.openlap.infrastructure.web;

import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import com.openlap.infrastructure.error.ApiErrorResponse;
import com.openlap.infrastructure.error.ApiErrorResponseFactory;
import com.openlap.infrastructure.exception.OpenLapException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import javax.servlet.http.HttpServletRequest;
import javax.validation.ConstraintViolation;
import javax.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.BindException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Unified handler for {@link OpenLapException} and common framework exceptions, rendering every
 * error as the {@link ApiErrorResponse} envelope.
 *
 * <p>Ordered at {@link Ordered#HIGHEST_PRECEDENCE} so it wins over the legacy central handler for
 * the framework types they both declare (validation, malformed JSON). It only declares
 * <em>specific</em> types — never a broad {@code Exception} catch-all — so it can never intercept
 * the domain exceptions handled by the legacy module {@code @ControllerAdvice} classes. The true
 * catch-all lives in {@link CatchAllExceptionResolver}, which runs strictly after all advices.
 */
@Slf4j
@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
public class GlobalApiExceptionHandler {

  private final ApiErrorResponseFactory factory;

  public GlobalApiExceptionHandler(ApiErrorResponseFactory factory) {
    this.factory = factory;
  }

  @ExceptionHandler(OpenLapException.class)
  public ResponseEntity<ApiErrorResponse> handleOpenLap(
      OpenLapException ex, HttpServletRequest request) {
    log(ex.getStatus(), ex.getCode(), ex, request);
    return build(ex.getStatus(), ex.getCode(), ex.getMessage(), request, ex.getDetails());
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ApiErrorResponse> handleMethodArgumentNotValid(
      MethodArgumentNotValidException ex, HttpServletRequest request) {
    return validation(ex.getBindingResult().getFieldErrors(), ex, request);
  }

  @ExceptionHandler(BindException.class)
  public ResponseEntity<ApiErrorResponse> handleBind(BindException ex, HttpServletRequest request) {
    return validation(ex.getBindingResult().getFieldErrors(), ex, request);
  }

  @ExceptionHandler(ConstraintViolationException.class)
  public ResponseEntity<ApiErrorResponse> handleConstraintViolation(
      ConstraintViolationException ex, HttpServletRequest request) {
    List<Map<String, Object>> fieldErrors = new ArrayList<>();
    for (ConstraintViolation<?> violation : ex.getConstraintViolations()) {
      Map<String, Object> entry = new LinkedHashMap<>();
      entry.put(
          "field", violation.getPropertyPath() == null ? null : violation.getPropertyPath().toString());
      entry.put("message", violation.getMessage());
      fieldErrors.add(entry);
    }
    log(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", ex, request);
    return build(
        HttpStatus.BAD_REQUEST,
        "VALIDATION_FAILED",
        "Request validation failed.",
        request,
        wrapFieldErrors(fieldErrors));
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  public ResponseEntity<ApiErrorResponse> handleNotReadable(
      HttpMessageNotReadableException ex, HttpServletRequest request) {
    Map<String, Object> details = null;
    if (ex.getCause() instanceof InvalidFormatException) {
      InvalidFormatException ife = (InvalidFormatException) ex.getCause();
      String field =
          ife.getPath().stream()
              .map(reference -> reference.getFieldName())
              .reduce((first, second) -> second)
              .orElse("unknown field");
      Map<String, Object> entry = new LinkedHashMap<>();
      entry.put("field", field);
      entry.put("message", "Invalid value for field: " + field + ". " + ife.getOriginalMessage());
      List<Map<String, Object>> fieldErrors = new ArrayList<>();
      fieldErrors.add(entry);
      details = wrapFieldErrors(fieldErrors);
    }
    log(HttpStatus.BAD_REQUEST, "MALFORMED_REQUEST", ex, request);
    return build(HttpStatus.BAD_REQUEST, "MALFORMED_REQUEST", "Malformed JSON request.", request, details);
  }

  @ExceptionHandler(MissingServletRequestParameterException.class)
  public ResponseEntity<ApiErrorResponse> handleMissingParameter(
      MissingServletRequestParameterException ex, HttpServletRequest request) {
    Map<String, Object> details = new LinkedHashMap<>();
    details.put("parameter", ex.getParameterName());
    details.put("parameterType", ex.getParameterType());
    log(HttpStatus.BAD_REQUEST, "MISSING_PARAMETER", ex, request);
    return build(
        HttpStatus.BAD_REQUEST,
        "MISSING_PARAMETER",
        "Required request parameter '" + ex.getParameterName() + "' is missing.",
        request,
        details);
  }

  @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
  public ResponseEntity<ApiErrorResponse> handleUnsupportedMediaType(
      HttpMediaTypeNotSupportedException ex, HttpServletRequest request) {
    Map<String, Object> details = new LinkedHashMap<>();
    details.put("contentType", String.valueOf(ex.getContentType()));
    details.put("supported", ex.getSupportedMediaTypes());
    log(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "UNSUPPORTED_MEDIA_TYPE", ex, request);
    return build(
        HttpStatus.UNSUPPORTED_MEDIA_TYPE,
        "UNSUPPORTED_MEDIA_TYPE",
        "Content type is not supported.",
        request,
        details);
  }

  @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
  public ResponseEntity<ApiErrorResponse> handleMethodNotSupported(
      HttpRequestMethodNotSupportedException ex, HttpServletRequest request) {
    Map<String, Object> details = new LinkedHashMap<>();
    details.put("method", ex.getMethod());
    details.put("supported", ex.getSupportedMethods());
    log(HttpStatus.METHOD_NOT_ALLOWED, "METHOD_NOT_ALLOWED", ex, request);
    return build(
        HttpStatus.METHOD_NOT_ALLOWED,
        "METHOD_NOT_ALLOWED",
        "Request method is not supported.",
        request,
        details);
  }

  @ExceptionHandler(AccessDeniedException.class)
  public ResponseEntity<ApiErrorResponse> handleAccessDenied(
      AccessDeniedException ex, HttpServletRequest request) {
    log(HttpStatus.FORBIDDEN, "ACCESS_DENIED", ex, request);
    return build(HttpStatus.FORBIDDEN, "ACCESS_DENIED", "Access is denied.", request, null);
  }

  @ExceptionHandler(AuthenticationException.class)
  public ResponseEntity<ApiErrorResponse> handleAuthentication(
      AuthenticationException ex, HttpServletRequest request) {
    log(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", ex, request);
    return build(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Authentication is required.", request, null);
  }

  // ---- helpers ----

  private ResponseEntity<ApiErrorResponse> validation(
      List<FieldError> fieldErrors, Exception ex, HttpServletRequest request) {
    List<Map<String, Object>> mapped = new ArrayList<>();
    for (FieldError fieldError : fieldErrors) {
      Map<String, Object> entry = new LinkedHashMap<>();
      entry.put("field", fieldError.getField());
      entry.put("message", fieldError.getDefaultMessage());
      mapped.add(entry);
    }
    log(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", ex, request);
    return build(
        HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "Request validation failed.", request, wrapFieldErrors(mapped));
  }

  private static Map<String, Object> wrapFieldErrors(List<Map<String, Object>> fieldErrors) {
    if (fieldErrors == null || fieldErrors.isEmpty()) {
      return null;
    }
    Map<String, Object> details = new LinkedHashMap<>();
    details.put("fieldErrors", fieldErrors);
    return details;
  }

  private ResponseEntity<ApiErrorResponse> build(
      HttpStatus status, String code, String message, HttpServletRequest request, Map<String, Object> details) {
    ApiErrorResponse body = factory.create(status, code, message, request.getRequestURI(), details);
    return ResponseEntity.status(status).body(body);
  }

  private void log(HttpStatus status, String code, Exception ex, HttpServletRequest request) {
    String traceId = MDC.get(ApiErrorResponseFactory.TRACE_ID_MDC_KEY);
    if (status.is5xxServerError()) {
      log.error(
          "[{}] {} {} -> {} {}", traceId, request.getMethod(), request.getRequestURI(), code, status.value(), ex);
    } else {
      log.warn(
          "[{}] {} {} -> {} {} ({})",
          traceId,
          request.getMethod(),
          request.getRequestURI(),
          code,
          status.value(),
          ex.getMessage());
    }
  }
}
