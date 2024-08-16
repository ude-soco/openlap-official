package com.openlap.analytics_technique.exceptions;

import com.openlap.exception.ExceptionResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
public class AnalyticsTechniqueExceptionHandler {
  @ExceptionHandler(value = {AnalyticsTechniqueNotFoundException.class})
  public ResponseEntity<Object> handleAnalyticsTechniqueNotFoundException(
      AnalyticsTechniqueNotFoundException ex) {
    HttpStatus httpStatus = HttpStatus.NOT_FOUND;
    ExceptionResponse exceptionResponse =
        new ExceptionResponse(ex.getMessage(), ex.getCause(), httpStatus);
    return new ResponseEntity<>(exceptionResponse, httpStatus);
  }

  @ExceptionHandler(value = {InvalidAnalyticsTechniqueInputsException.class})
  public ResponseEntity<Object> handleInvalidAnalyticsTechniqueInputsException(
      InvalidAnalyticsTechniqueInputsException ex) {
    HttpStatus httpStatus = HttpStatus.CONFLICT;
    ExceptionResponse exceptionResponse =
        new ExceptionResponse(ex.getMessage(), ex.getCause(), httpStatus);
    return new ResponseEntity<>(exceptionResponse, httpStatus);
  }

  @ExceptionHandler(value = {AnalyticsMethodClassLoaderException.class})
  public ResponseEntity<Object> handleAnalyticsMethodLoaderException(
      AnalyticsMethodClassLoaderException ex) {
    HttpStatus httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    ExceptionResponse exceptionResponse =
        new ExceptionResponse(ex.getMessage(), ex.getCause(), httpStatus);
    return new ResponseEntity<>(exceptionResponse, httpStatus);
  }
}
