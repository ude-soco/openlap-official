package com.openlap.exception;

import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import com.openlap.analytics_technique.exceptions.AnalyticsMethodClassLoaderException;
import com.openlap.visualization_methods.exceptions.VisualizationClassLoaderException;
import java.util.HashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<?> handleValidationExceptions(MethodArgumentNotValidException ex) {
    Map<String, Object> errors = new HashMap<>();
    ex.getBindingResult()
        .getAllErrors()
        .forEach(
            (error) -> {
              String fieldName = ((FieldError) error).getField();
              String errorMessage = error.getDefaultMessage();
              errors.put(fieldName, errorMessage);
            });
    ApiError apiError = new ApiError(HttpStatus.BAD_REQUEST, errors);
    return new ResponseEntity<>(apiError, apiError.getHttpStatus());
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  public ResponseEntity<?> handleHttpMessageNotReadable(HttpMessageNotReadableException ex) {
    Map<String, Object> errors = new HashMap<>();
    Throwable cause = ex.getCause();
    if (cause instanceof InvalidFormatException) {
      InvalidFormatException invalidFormatException = (InvalidFormatException) cause;
      String fieldName =
          invalidFormatException.getPath().stream()
              .map(ref -> ref.getFieldName())
              .reduce((first, second) -> second)
              .orElse("unknown field");
      String errorMessage =
          "Invalid value for field: "
              + fieldName
              + ". "
              + invalidFormatException.getOriginalMessage();
      errors.put(fieldName, errorMessage);
    } else {
      errors.put("error", "Malformed JSON request");
    }
    ApiError apiError = new ApiError(HttpStatus.BAD_REQUEST, errors);
    return new ResponseEntity<>(apiError, apiError.getHttpStatus());
  }

  @ExceptionHandler(DatabaseOperationException.class)
  public ResponseEntity<?> handleDatabaseOperationException(DatabaseOperationException ex) {
    Map<String, Object> errors = new HashMap<>();
    errors.put("databaseError", ex.getMessage());
    ApiError apiError = new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, errors);
    return new ResponseEntity<>(apiError, apiError.getHttpStatus());
  }

  @ExceptionHandler(ServiceException.class)
  public ResponseEntity<?> handleServiceException(ServiceException ex) {
    Map<String, Object> errors = new HashMap<>();
    errors.put("serverError", ex.getMessage());
    ApiError apiError = new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, errors);
    return new ResponseEntity<>(apiError, apiError.getHttpStatus());
  }

  @ExceptionHandler(VisualizationClassLoaderException.class)
  public ResponseEntity<?> handleVisualizationClassLoaderException(
      VisualizationClassLoaderException ex) {
    Map<String, Object> errors = new HashMap<>();
    errors.put("fileManagerError", ex.getMessage());
    ApiError apiError = new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, errors);
    return new ResponseEntity<>(apiError, apiError.getHttpStatus());
  }

  @ExceptionHandler(AnalyticsMethodClassLoaderException.class)
  public ResponseEntity<?> handleAnalyticsMethodClassLoaderException(
      AnalyticsMethodClassLoaderException ex) {
    Map<String, Object> errors = new HashMap<>();
    errors.put("analyticsMethodLoaderException", ex.getMessage());
    ApiError apiError = new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, errors);
    return new ResponseEntity<>(apiError, apiError.getHttpStatus());
  }
}
