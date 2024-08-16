package com.openlap.analytics_statements.exception;

import com.openlap.exception.ExceptionResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
public class AnalyticsStatementExceptionHandler {
  @ExceptionHandler(value = {LrsNotFoundException.class})
  public ResponseEntity<Object> handleLrsNotFoundException(LrsNotFoundException ex) {
    HttpStatus httpStatus = HttpStatus.NOT_FOUND;
    ExceptionResponse exceptionResponse =
        new ExceptionResponse(ex.getMessage(), ex.getCause(), httpStatus);
    return new ResponseEntity<>(exceptionResponse, httpStatus);
  }

  @ExceptionHandler(value = {LrsManipulationException.class})
  public ResponseEntity<Object> handleLrsManipulationException(LrsManipulationException ex) {
    HttpStatus httpStatus = HttpStatus.FORBIDDEN;
    ExceptionResponse exceptionResponse =
        new ExceptionResponse(ex.getMessage(), ex.getCause(), httpStatus);
    return new ResponseEntity<>(exceptionResponse, httpStatus);
  }

  @ExceptionHandler(value = {LrsTitleAlreadyExistsException.class})
  public ResponseEntity<Object> handleLrsTitleAlreadyExistsException(
      LrsTitleAlreadyExistsException ex) {
    HttpStatus httpStatus = HttpStatus.CONFLICT;
    ExceptionResponse exceptionResponse =
        new ExceptionResponse(ex.getMessage(), ex.getCause(), httpStatus);
    return new ResponseEntity<>(exceptionResponse, httpStatus);
  }
}
