package com.openlap.analytics_module.controllers;

import com.openlap.analytics_module.dto.requests.analytics_goal.AnalyticsGoalRequest;
import com.openlap.analytics_module.dto.requests.analytics_goal.AnalyticsGoalStatusRequest;
import com.openlap.analytics_module.services.AnalyticsGoalsService;
import com.openlap.response.ApiSuccess;
import javax.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/analytics/goals")
@RequiredArgsConstructor
@Validated
public class AnalyticsGoalsController {
  private final AnalyticsGoalsService analyticsGoalsService;

  @PostMapping("/create")
  public ResponseEntity<?> createAnalyticsGoal(
      @Valid @RequestBody AnalyticsGoalRequest analyticsGoalRequest) {
    HttpStatus status = HttpStatus.CREATED;
    return ResponseEntity.status(status)
        .body(
            new ApiSuccess(
                status,
                "Goal created",
                analyticsGoalsService.createAnalyticsGoal(analyticsGoalRequest)));
  }

  @GetMapping("/{goalId}")
  public ResponseEntity<?> getAnalyticsGoal(@PathVariable String goalId) {
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(
            new ApiSuccess(status, "Goal found.", analyticsGoalsService.getAnalyticsGoal(goalId)));
  }

  @PutMapping("/{goalId}")
  public ResponseEntity<?> updateAnalyticsGoal(
      @PathVariable String goalId, @RequestBody @Valid AnalyticsGoalRequest AnalyticsGoal) {
    analyticsGoalsService.updateAnalyticsGoal(goalId, AnalyticsGoal);
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status).body(new ApiSuccess(status, "Goal updated."));
  }

  @PutMapping("/status")
  public ResponseEntity<?> updateAnalyticsGoalStatus(
      @RequestBody @Valid AnalyticsGoalStatusRequest analyticsGoalStatusRequest) {
    analyticsGoalsService.updateAnalyticsGoalStatus(analyticsGoalStatusRequest);
    HttpStatus httpStatus = HttpStatus.OK;
    return ResponseEntity.status(httpStatus)
        .body(new ApiSuccess(httpStatus, "Goal status updated."));
  }

  @DeleteMapping("/{goalId}")
  public ResponseEntity<?> deleteAnalyticsGoal(@PathVariable String goalId) {
    analyticsGoalsService.deleteAnalyticsGoal(goalId);
    HttpStatus httpStatus = HttpStatus.OK;
    return ResponseEntity.status(httpStatus).body(new ApiSuccess(httpStatus, "Goal deleted."));
  }

  @GetMapping
  public ResponseEntity<?> getAllAnalyticsGoals() {
    HttpStatus httpStatus = HttpStatus.OK;
    return ResponseEntity.status(httpStatus)
        .body(new ApiSuccess(httpStatus, "Found all goals.", analyticsGoalsService.getAllGoals()));
  }

  @GetMapping("/active")
  public ResponseEntity<?> getAllActiveAnalyticsGoal() {
    HttpStatus httpStatus = HttpStatus.OK;
    return ResponseEntity.status(httpStatus)
        .body(
            new ApiSuccess(
                httpStatus,
                "Found all active goals.",
                analyticsGoalsService.getAllActiveAnalyticsGoals()));
  }

  @PostMapping("/populate")
  public ResponseEntity<?> populateAnalyticsGoal() {
    analyticsGoalsService.populateAnalyticsGoal();
    HttpStatus httpStatus = HttpStatus.OK;
    return ResponseEntity.status(httpStatus).body(new ApiSuccess(httpStatus, "Goals populated."));
  }
}
