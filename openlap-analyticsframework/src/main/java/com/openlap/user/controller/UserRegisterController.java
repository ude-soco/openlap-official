package com.openlap.user.controller;

import com.openlap.analytics_statements.dtos.request.LrsConsumerRequest;
import com.openlap.analytics_statements.dtos.response.LrsStoreResponse;
import com.openlap.analytics_statements.services.LrsService;
import com.openlap.analytics_statements.services.StatementService;
import com.openlap.response.ApiSuccess;
import com.openlap.user.dto.request.UserRequest;
import com.openlap.user.services.UserRegisterService;
import java.util.List;
import javax.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/register")
@RequiredArgsConstructor
@Validated
public class UserRegisterController {

  private final UserRegisterService userRegisterService;
  private final StatementService statementService;
  private final LrsService lrsService;

  /**
   * This API is to provide new users with the choice to select an LRS available in Learning Locker
   */
  @GetMapping("/lrs")
  public ResponseEntity<?> getAllAvailableLrsStores() {
    List<LrsStoreResponse> lrsStoreResponse = lrsService.getAvailableLrs();
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(new ApiSuccess(status, "LRSs found.", lrsStoreResponse));
  }

  /**
   * This API is used to validate whether a user belongs to an LRS. The user's unique identifier
   * must exist in the mentioned LRS.
   *
   * @param lrsConsumerRequest The request consist of the LRS ID and the user's unique identifier
   */
  @PostMapping("/validate")
  public ResponseEntity<?> validateUser(@RequestBody @Valid LrsConsumerRequest lrsConsumerRequest) {
    Boolean validationResult = statementService.validateLrsUser(lrsConsumerRequest);
    String message =
        validationResult
            ? "User details validation with LRS was successful."
            : "User details is not valid.";
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status).body(new ApiSuccess(status, message, validationResult));
  }

  /**
   * This API is to create a new user of role type DATA_PROVIDER AND USER. It performs some user
   * validation, such as email check, password check, for ROLE_USER, it validates whether a user
   * belongs to a specific LRS.
   */
  @PostMapping
  public ResponseEntity<?> registerUser(@Valid @RequestBody UserRequest user) {
    userRegisterService.registerUser(user);
    HttpStatus status = HttpStatus.CREATED;
    return ResponseEntity.status(status).body(new ApiSuccess(status, "Registration successful."));
  }
}
