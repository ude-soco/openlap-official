package com.openlap.exception;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.HashMap;
import java.util.Map;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@NoArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiError {
  private HttpStatus httpStatus;
  private Map<String, Object> errors;

  public ApiError(HttpStatus httpStatus, Map<String, Object> errors) {
    this.httpStatus = httpStatus;
    this.errors = errors != null ? errors : new HashMap<>();
  }
}
