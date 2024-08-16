package com.openlap.user.exception.role;

import com.openlap.exception.ExceptionResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
public class RoleExceptionHandler {

  @ExceptionHandler(value = {RoleNotFoundException.class})
  public ResponseEntity<Object> handleRoleNotFoundException(RoleNotFoundException ex) {
    ExceptionResponse exceptionResponse =
        new ExceptionResponse(ex.getMessage(), ex.getCause(), HttpStatus.NOT_FOUND);
    return new ResponseEntity<>(exceptionResponse, HttpStatus.NOT_FOUND);
  }

  @ExceptionHandler(value = {RoleNotAllowedException.class})
  public ResponseEntity<Object> handleRoleNotAllowedException(RoleNotAllowedException ex) {
    ExceptionResponse exceptionResponse =
        new ExceptionResponse(ex.getMessage(), ex.getCause(), HttpStatus.CONFLICT);
    return new ResponseEntity<>(exceptionResponse, HttpStatus.CONFLICT);
  }

  @ExceptionHandler(value = {RoleAlreadyExistsException.class})
  public ResponseEntity<Object> handleRoleAlreadyExistsException(RoleAlreadyExistsException ex) {
    ExceptionResponse exceptionResponse =
        new ExceptionResponse(ex.getMessage(), ex.getCause(), HttpStatus.CONFLICT);
    return new ResponseEntity<>(exceptionResponse, HttpStatus.CONFLICT);
  }
}
