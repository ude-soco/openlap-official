package com.openlap.analytics_module.exceptions.analytics_goals;

import com.openlap.exception.ExceptionResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
public class AnalyticsGoalExceptionHandler {

  @ExceptionHandler(value = {AnalyticsQuestionNotFoundException.class})
  public ResponseEntity<Object> handleAnalyticsGoalNotFoundException(
      AnalyticsQuestionNotFoundException ex) {
    HttpStatus httpStatus = HttpStatus.NOT_FOUND;
    ExceptionResponse exceptionResponse =
        new ExceptionResponse(ex.getMessage(), ex.getCause(), httpStatus);
    return new ResponseEntity<>(exceptionResponse, httpStatus);
  }

  @ExceptionHandler(value = {AnalyticsGoalAlreadyExistsException.class})
  public ResponseEntity<Object> handleAnalyticsGoalAlreadyExistsException(
      AnalyticsQuestionNotFoundException ex) {
    HttpStatus httpStatus = HttpStatus.CONFLICT;
    ExceptionResponse exceptionResponse =
        new ExceptionResponse(ex.getMessage(), ex.getCause(), httpStatus);
    return new ResponseEntity<>(exceptionResponse, httpStatus);
  }
}
