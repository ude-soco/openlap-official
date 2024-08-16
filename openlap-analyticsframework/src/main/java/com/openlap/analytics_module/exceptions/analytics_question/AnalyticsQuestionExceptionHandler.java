package com.openlap.analytics_module.exceptions.analytics_question;

import com.openlap.exception.ExceptionResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
public class AnalyticsQuestionExceptionHandler {

  @ExceptionHandler(value = {AnalyticsQuestionNotFoundException.class})
  public ResponseEntity<Object> handleAnalyticsQuestionNotFoundException(
      AnalyticsQuestionNotFoundException ex) {
    HttpStatus httpStatus = HttpStatus.NOT_FOUND;
    ExceptionResponse exceptionResponse =
        new ExceptionResponse(ex.getMessage(), ex.getCause(), httpStatus);
    return new ResponseEntity<>(exceptionResponse, httpStatus);
  }

  @ExceptionHandler(value = {AnalyticsQuestionAlreadyExistsException.class})
  public ResponseEntity<Object> handleAnalyticsQuestionAlreadyExistsException(
      AnalyticsQuestionAlreadyExistsException ex) {
    HttpStatus httpStatus = HttpStatus.CONFLICT;
    ExceptionResponse exceptionResponse =
        new ExceptionResponse(ex.getMessage(), ex.getCause(), httpStatus);
    return new ResponseEntity<>(exceptionResponse, httpStatus);
  }

  @ExceptionHandler(value = {AnalyticsQuestionMethodNotAllowedException.class})
  public ResponseEntity<Object> handleAnalyticsQuestionUpdateNotAllowedException(
      AnalyticsQuestionMethodNotAllowedException ex) {
    HttpStatus httpStatus = HttpStatus.FORBIDDEN;
    ExceptionResponse exceptionResponse =
        new ExceptionResponse(ex.getMessage(), ex.getCause(), httpStatus);
    return new ResponseEntity<>(exceptionResponse, httpStatus);
  }
}
