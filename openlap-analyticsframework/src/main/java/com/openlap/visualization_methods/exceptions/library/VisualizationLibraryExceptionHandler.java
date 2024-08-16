package com.openlap.visualization_methods.exceptions.library;

import com.openlap.exception.ExceptionResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
public class VisualizationLibraryExceptionHandler {
  @ExceptionHandler(value = {VisualizationLibraryNotFoundException.class})
  public ResponseEntity<Object> handleVisualizationLibraryNotFoundException(
      VisualizationLibraryNotFoundException ex) {
    HttpStatus httpStatus = HttpStatus.NOT_FOUND;
    ExceptionResponse exceptionResponse =
        new ExceptionResponse(ex.getMessage(), ex.getCause(), httpStatus);
    return new ResponseEntity<>(exceptionResponse, httpStatus);
  }

  @ExceptionHandler(value = {InvalidVisualizationInputsException.class})
  public ResponseEntity<Object> handleInvalidVisualizationInputsException(
      InvalidVisualizationInputsException ex) {
    HttpStatus httpStatus = HttpStatus.CONFLICT;
    ExceptionResponse exceptionResponse =
        new ExceptionResponse(ex.getMessage(), ex.getCause(), httpStatus);
    return new ResponseEntity<>(exceptionResponse, httpStatus);
  }
}
