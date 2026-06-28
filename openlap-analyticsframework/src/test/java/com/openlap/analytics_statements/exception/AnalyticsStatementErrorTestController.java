package com.openlap.analytics_statements.exception;

import com.openlap.exception.DatabaseOperationException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Test-only controller that throws each analytics_statements exception so the error-mapping
 * contract can be asserted through the real handler chain. Test sources only.
 *
 * <p>{@code DatabaseOperationException} is the shared legacy exception ({@code com.openlap.exception})
 * used by several modules; it is intentionally NOT migrated in this PR and is included only to
 * document that its behaviour is unchanged.
 */
@RestController
@RequestMapping("/analytics-statement-error-test")
public class AnalyticsStatementErrorTestController {

  @GetMapping("/lrs-not-found")
  public void lrsNotFound() {
    throw new LrsNotFoundException("LRS id not found");
  }

  @GetMapping("/lrs-already-exists")
  public void lrsAlreadyExists() {
    throw new LrsTitleAlreadyExistsException(
        "LRS with this title already exist. Please choose another title.");
  }

  @GetMapping("/lrs-manipulation")
  public void lrsManipulation() {
    throw new LrsManipulationException("You do not have permission to update the LRS");
  }

  @GetMapping("/database-failure")
  public void databaseFailure() {
    throw new DatabaseOperationException("Unable to delete LRS store.");
  }
}
