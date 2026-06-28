package com.openlap.analytics_module.exceptions;

import com.openlap.analytics_module.exceptions.analytics_goals.AnalyticsGoalAlreadyExistsException;
import com.openlap.analytics_module.exceptions.analytics_question.AnalyticsQuestionAlreadyExistsException;
import com.openlap.analytics_module.exceptions.analytics_question.AnalyticsQuestionMethodNotAllowedException;
import com.openlap.analytics_module.exceptions.analytics_question.AnalyticsQuestionNotFoundException;
import com.openlap.analytics_module.exceptions.indicator.IndicatorManipulationNotAllowed;
import com.openlap.analytics_module.exceptions.indicator.IndicatorNotFoundException;
import com.openlap.analytics_module.exceptions.indicator.PreviewNotPossibleException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Test-only controller that throws each analytics_module exception so the error-mapping contract can
 * be asserted through the real handler chain. Test sources only.
 *
 * <p>Note: the module has two distinct {@code AnalyticsQuestionNotFoundException} classes (one in
 * the analytics_goals package, one in analytics_question). The goals-package variant is referenced
 * fully-qualified to avoid an import clash.
 */
@RestController
@RequestMapping("/analytics-module-error-test")
public class AnalyticsModuleErrorTestController {

  // --- goal group ---
  @GetMapping("/goal-question-not-found")
  public void goalQuestionNotFound() {
    throw new com.openlap.analytics_module.exceptions.analytics_goals
        .AnalyticsQuestionNotFoundException("Analytics question with id 'X' not found");
  }

  @GetMapping("/goal-already-exists")
  public void goalAlreadyExists() {
    throw new AnalyticsGoalAlreadyExistsException("Analytics goal already exists");
  }

  // --- question group ---
  @GetMapping("/question-not-found")
  public void questionNotFound() {
    throw new AnalyticsQuestionNotFoundException("Analytics question with id 'X' not found");
  }

  @GetMapping("/question-already-exists")
  public void questionAlreadyExists() {
    throw new AnalyticsQuestionAlreadyExistsException("Analytics question already exists");
  }

  @GetMapping("/question-method-not-allowed")
  public void questionMethodNotAllowed() {
    throw new AnalyticsQuestionMethodNotAllowedException(
        "You do not have the permission to update question");
  }

  // --- indicator group ---
  @GetMapping("/indicator-not-found")
  public void indicatorNotFound() {
    throw new IndicatorNotFoundException("Indicator with id 'X' not found");
  }

  @GetMapping("/indicator-manipulation")
  public void indicatorManipulation() {
    throw new IndicatorManipulationNotAllowed(
        "You do not have permission to modify this indicator");
  }

  @GetMapping("/preview-not-possible")
  public void previewNotPossible() {
    throw new PreviewNotPossibleException(
        "Duplication not possible. User do not belong to the same LRS");
  }
}
