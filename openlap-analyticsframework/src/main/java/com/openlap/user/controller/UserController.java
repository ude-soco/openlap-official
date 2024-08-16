package com.openlap.user.controller;

import com.openlap.analytics_statements.dtos.request.LrsConsumerRequest;
import com.openlap.response.ApiSuccess;
import com.openlap.user.dto.response.UserResponse;
import com.openlap.user.dto.response.utils.LrsConsumerResponse;
import com.openlap.user.services.UserService;
import java.util.List;
import javax.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/users/my")
@RequiredArgsConstructor
@Validated
public class UserController {

  private final UserService userService;

  /** This API is to fetch the user details of all role types */
  @GetMapping
  public ResponseEntity<?> getMyDetails(HttpServletRequest request) {
    UserResponse userResponse = userService.getUserDetails(request);
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(new ApiSuccess(status, "User details found.", userResponse));
  }

  /** This API is used for ROLE_USER users to find all the list of LRSs */
  @GetMapping("/lrs")
  public ResponseEntity<?> findAllMyLrs(HttpServletRequest request) {
    List<LrsConsumerResponse> lrsConsumerList = userService.getLrsConsumerList(request);
    String message = lrsConsumerList.isEmpty() ? "No Lrs found." : "Lrs found.";
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status).body(new ApiSuccess(status, message, lrsConsumerList));
  }

  /** This API is used for ROLE_USER users to find all the list of LRSs */
  @PostMapping("/lrs/add")
  public ResponseEntity<?> addNewLrs(
      HttpServletRequest request, @RequestBody LrsConsumerRequest lrsConsumerRequest) {
    userService.getNewLrsToLrsConsumerList(request, lrsConsumerRequest);
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status).body(new ApiSuccess(status, "LRS added successfully."));
  }
  /** This API is used for ROLE_USER users to find all the list of LRSs */
  @DeleteMapping("/lrs/{lrsConsumerId}/delete")
  public ResponseEntity<?> deleteMyLrs(
          HttpServletRequest request, @PathVariable String lrsConsumerId) {
    userService.deleteMyLrsConsumer(request, lrsConsumerId);
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status).body(new ApiSuccess(status, "LRS deleted successfully."));
  }
}
