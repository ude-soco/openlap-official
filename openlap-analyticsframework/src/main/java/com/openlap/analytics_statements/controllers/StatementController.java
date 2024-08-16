package com.openlap.analytics_statements.controllers;

import com.openlap.analytics_statements.dtos.request.*;
import com.openlap.analytics_statements.services.StatementService;
import com.openlap.response.ApiSuccess;
import java.util.List;
import javax.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/statements")
@RequiredArgsConstructor
@Validated
public class StatementController {
  private final StatementService statementService;

  // These APIs are for users with ROLE_USER.

  /**
   * This API will return a list of platforms.
   *
   * @param platformRequest This includes a list of LRS of the user
   */
  @PostMapping("/platforms")
  public ResponseEntity<?> findAllUniquePlatforms(
      @RequestBody @Valid PlatformRequest platformRequest) {
    List<Object> foundPlatforms = statementService.findAllUniquePlatforms(platformRequest);
    String message = foundPlatforms.isEmpty() ? "No platforms found." : "Platforms found.";
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status).body(new ApiSuccess(status, message, foundPlatforms));
  }

  /**
   * This API will return a list of all activity types
   *
   * @param activityTypesRequest This includes the list of LRS of the user, and a list of platforms
   */
  @PostMapping("/activity-types")
  public ResponseEntity<?> findUniqueActivityTypes(
      @RequestBody @Valid ActivityTypesRequest activityTypesRequest) {
    List<Object> foundUniqueActivityTypes =
        statementService.findUniqueActivityTypes(activityTypesRequest);
    String message =
        foundUniqueActivityTypes.isEmpty() ? "No activity types found." : "Activity types found.";
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(new ApiSuccess(status, message, foundUniqueActivityTypes));
  }

  /**
   * This API will return a list of all action on activities
   *
   * @param actionOnActivitiesRequest This includes the list of LRS of the user, a list of
   *     platforms, and a list of activity types
   */
  @PostMapping("/actions")
  public ResponseEntity<?> findUniqueActionsOnActivities(
      @RequestBody @Valid ActionOnActivitiesRequest actionOnActivitiesRequest) {
    List<Object> foundUniqueActionOnActivities =
        statementService.findUniqueActionOnActivities(actionOnActivitiesRequest);
    String message =
        foundUniqueActionOnActivities.isEmpty()
            ? "No action on activities found."
            : "Action on activities found.";
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(new ApiSuccess(status, message, foundUniqueActionOnActivities));
  }

  /**
   * This API will return a list of all activities
   *
   * @param activitiesRequest This includes the list of LRS of the user, a list of platforms, a list
   *     of activity types, and a list of action on activities
   */
  @PostMapping("/activities")
  public ResponseEntity<?> findUniqueActivities(
      @RequestBody @Valid ActivitiesRequest activitiesRequest) {
    List<Object> foundUniqueActivities = statementService.findUniqueActivities(activitiesRequest);
    String message = foundUniqueActivities.isEmpty() ? "No activities found." : "Activities found.";
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(new ApiSuccess(status, message, foundUniqueActivities));
  }

  /**
   * This API will return OpenLAPDataset that can be used for analysis
   *
   * @param statementsRequest This includes the list of LRS of the user, a list of platforms, a list
   *     of activity types, a list of action on activities, a list of activities, duration, and
   *     outputs
   */
  @PostMapping("/custom-query")
  public ResponseEntity<?> findStatements(@RequestBody @Valid StatementsRequest statementsRequest) {
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(
            new ApiSuccess(
                status, "Query data found.", statementService.findStatements(statementsRequest)));
  }
}
