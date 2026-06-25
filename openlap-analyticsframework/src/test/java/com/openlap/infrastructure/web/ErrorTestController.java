package com.openlap.infrastructure.web;

import com.openlap.exception.ServiceException;
import com.openlap.infrastructure.exception.NotFoundException;
import com.openlap.user.exception.user.UserNotFoundException;
import javax.validation.Valid;
import javax.validation.constraints.NotBlank;
import lombok.Data;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Test-only controller used to drive {@link GlobalApiExceptionHandler} and {@link
 * CatchAllExceptionResolver} through the real MVC stack. Lives in test sources only.
 */
@RestController
@RequestMapping("/test")
public class ErrorTestController {

  @PostMapping("/openlap-notfound")
  public void openlapNotFound() {
    throw new NotFoundException("USER_NOT_FOUND", "User not found.");
  }

  @PostMapping("/valid")
  public String valid(@Valid @RequestBody Dto dto) {
    return dto.getName();
  }

  @PostMapping("/body")
  public String body(@RequestBody Dto dto) {
    return dto.getName();
  }

  @GetMapping("/param")
  public String param(@RequestParam("q") String q) {
    return q;
  }

  @GetMapping("/boom")
  public void boom() {
    throw new IllegalStateException("kaboom");
  }

  /** Routed by the legacy central GlobalExceptionHandler (ApiError), not the new handler. */
  @GetMapping("/legacy-service")
  public void legacyService() {
    throw new ServiceException("legacy service failure");
  }

  /** Routed by the legacy module UserExceptionHandler (ExceptionResponse), not the new handler. */
  @GetMapping("/legacy-user")
  public void legacyUser() {
    throw new UserNotFoundException("legacy user not found");
  }

  @Data
  static class Dto {
    @NotBlank(message = "name is mandatory")
    private String name;
  }
}
