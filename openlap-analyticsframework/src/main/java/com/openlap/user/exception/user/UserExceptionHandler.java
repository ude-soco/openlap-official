package com.openlap.user.exception.user;

import com.openlap.exception.ExceptionResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
public class UserExceptionHandler {

  @ExceptionHandler(value = {UserNotFoundException.class})
  public ResponseEntity<Object> handleUserNotFoundException(UserNotFoundException ex) {
    HttpStatus httpStatus = HttpStatus.NOT_FOUND;
    ExceptionResponse exceptionResponse =
        new ExceptionResponse(ex.getMessage(), ex.getCause(), httpStatus);
    return new ResponseEntity<>(exceptionResponse, httpStatus);
  }

  @ExceptionHandler(value = {InvalidLrsUserException.class})
  public ResponseEntity<Object> handleInvalidLrsUserException(InvalidLrsUserException ex) {
    HttpStatus httpStatus = HttpStatus.NOT_FOUND;
    ExceptionResponse exceptionResponse =
        new ExceptionResponse(ex.getMessage(), ex.getCause(), httpStatus);
    return new ResponseEntity<>(exceptionResponse, httpStatus);
  }

  @ExceptionHandler(value = {EmailAlreadyTakenException.class})
  public ResponseEntity<Object> handleEmailAlreadyTakenException(EmailAlreadyTakenException ex) {
    HttpStatus httpStatus = HttpStatus.CONFLICT;
    ExceptionResponse exceptionResponse =
        new ExceptionResponse(ex.getMessage(), ex.getCause(), httpStatus);
    return new ResponseEntity<>(exceptionResponse, httpStatus);
  }

  @ExceptionHandler(value = {InvalidUserDetailsException.class})
  public ResponseEntity<Object> handleInvalidUserDetailsException(InvalidUserDetailsException ex) {
    HttpStatus httpStatus = HttpStatus.CONFLICT;
    ExceptionResponse exceptionResponse =
        new ExceptionResponse(ex.getMessage(), ex.getCause(), httpStatus);
    return new ResponseEntity<>(exceptionResponse, httpStatus);
  }

  @ExceptionHandler(value = {PasswordsDoNotMatchException.class})
  public ResponseEntity<Object> handlePasswordsDoNotMatchException(
      PasswordsDoNotMatchException ex) {
    HttpStatus httpStatus = HttpStatus.CONFLICT;
    ExceptionResponse exceptionResponse =
        new ExceptionResponse(ex.getMessage(), ex.getCause(), httpStatus);
    return new ResponseEntity<>(exceptionResponse, httpStatus);
  }
}
