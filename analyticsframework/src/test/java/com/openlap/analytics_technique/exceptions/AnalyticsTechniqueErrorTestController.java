package com.openlap.analytics_technique.exceptions;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Test-only controller that throws each analytics_technique exception so the error-mapping contract
 * can be asserted through the real handler chain. Test sources only.
 */
@RestController
@RequestMapping("/analytics-technique-error-test")
public class AnalyticsTechniqueErrorTestController {

  @GetMapping("/not-found")
  public void notFound() {
    throw new AnalyticsTechniqueNotFoundException(
        "Analytics Technique with id 'X' not found");
  }

  @GetMapping("/invalid-input")
  public void invalidInput() {
    throw new InvalidAnalyticsTechniqueInputsException(
        "The mapping between the analytics technique mapping and query is invalid");
  }

  @GetMapping("/class-load")
  public void classLoad() {
    throw new AnalyticsMethodClassLoaderException("Unable to load analytics method class");
  }
}
