package com.openlap.visualization_methods.exceptions.type;

import com.openlap.exception.ExceptionResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
public class VisualizationTypeExceptionHandler {
  @ExceptionHandler(value = {VisualizationTypeNotFoundException.class})
  public ResponseEntity<Object> handleVisualizationTypeNotFoundException(
      VisualizationTypeNotFoundException ex) {
    HttpStatus httpStatus = HttpStatus.NOT_FOUND;
    ExceptionResponse exceptionResponse =
        new ExceptionResponse(ex.getMessage(), ex.getCause(), httpStatus);
    return new ResponseEntity<>(exceptionResponse, httpStatus);
  }
}
