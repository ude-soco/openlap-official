package com.openlap.visualization_methods.exceptions;

import com.openlap.visualization_methods.exceptions.library.InvalidVisualizationInputsException;
import com.openlap.visualization_methods.exceptions.library.VisualizationLibraryNotFoundException;
import com.openlap.visualization_methods.exceptions.type.VisualizationTypeNotFoundException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Test-only controller that throws each visualization_methods exception so the error-mapping
 * contract can be asserted through the real handler chain. Test sources only.
 */
@RestController
@RequestMapping("/visualization-error-test")
public class VisualizationErrorTestController {

  @GetMapping("/library-not-found")
  public void libraryNotFound() {
    throw new VisualizationLibraryNotFoundException(
        "Visualization library with id 'X' not found");
  }

  @GetMapping("/type-not-found")
  public void typeNotFound() {
    throw new VisualizationTypeNotFoundException("Visualization type with id 'X' not found");
  }

  @GetMapping("/invalid-input")
  public void invalidInput() {
    throw new InvalidVisualizationInputsException(
        "The mapping between the visualization inputs and analytics technique output is invalid.");
  }

  @GetMapping("/class-load")
  public void classLoad() {
    throw new VisualizationClassLoaderException("Unable to load visualization method class");
  }
}
