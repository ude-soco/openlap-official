package com.openlap.infrastructure.web;

import com.openlap.analytics_module.exceptions.indicator.IndicatorNotFoundException;
import com.openlap.exception.ServiceException;
import com.openlap.infrastructure.exception.NotFoundException;
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

  // These endpoints exist only to engage @Valid/@RequestBody/@RequestParam binding so the
  // tests can drive the error paths. They return a constant rather than echoing the bound
  // input back into the response (which CodeQL flags as reflected XSS); no test asserts the
  // happy-path body, so binding/validation behaviour is unchanged.
  @PostMapping("/valid")
  public String valid(@Valid @RequestBody Dto dto) {
    return "ok";
  }

  @PostMapping("/body")
  public String body(@RequestBody Dto dto) {
    return "ok";
  }

  @GetMapping("/param")
  public String param(@RequestParam("q") String q) {
    return "ok";
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

  /**
   * analytics_module is now migrated: {@link IndicatorNotFoundException} extends the shared
   * NotFoundException, so it is rendered by the unified handler (no legacy module advice anymore).
   */
  @GetMapping("/migrated-indicator")
  public void migratedIndicator() {
    throw new IndicatorNotFoundException("indicator not found");
  }

  @Data
  static class Dto {
    @NotBlank(message = "name is mandatory")
    private String name;
  }
}
