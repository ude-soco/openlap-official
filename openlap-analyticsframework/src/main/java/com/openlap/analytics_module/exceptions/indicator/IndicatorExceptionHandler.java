package com.openlap.analytics_module.exceptions.indicator;

import com.openlap.exception.ExceptionResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
public class IndicatorExceptionHandler {

  @ExceptionHandler(value = {IndicatorNotFoundException.class})
  public ResponseEntity<Object> handleIndicatorNotFoundException(IndicatorNotFoundException ex) {
    HttpStatus httpStatus = HttpStatus.NOT_FOUND;
    ExceptionResponse exceptionResponse =
        new ExceptionResponse(ex.getMessage(), ex.getCause(), httpStatus);
    return new ResponseEntity<>(exceptionResponse, httpStatus);
  }

  @ExceptionHandler(value = {IndicatorManipulationNotAllowed.class})
  public ResponseEntity<Object> handleIndicatorManipulationNotAllowed(
      IndicatorManipulationNotAllowed ex) {
    HttpStatus httpStatus = HttpStatus.FORBIDDEN;
    ExceptionResponse exceptionResponse =
        new ExceptionResponse(ex.getMessage(), ex.getCause(), httpStatus);
    return new ResponseEntity<>(exceptionResponse, httpStatus);
  }

  @ExceptionHandler(value = {PreviewNotPossibleException.class})
  public ResponseEntity<Object> handlePreviewNotPossibleException(PreviewNotPossibleException ex) {
    HttpStatus httpStatus = HttpStatus.FORBIDDEN;
    ExceptionResponse exceptionResponse =
        new ExceptionResponse(ex.getMessage(), ex.getCause(), httpStatus);
    return new ResponseEntity<>(exceptionResponse, httpStatus);
  }
}
