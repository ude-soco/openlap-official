package com.openlap.analytics_statements.controllers;

import com.openlap.analytics_statements.dtos.request.LrsProviderRequest;
import com.openlap.analytics_statements.services.LrsService;
import com.openlap.response.ApiSuccess;
import javax.servlet.http.HttpServletRequest;
import javax.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/lrs")
@RequiredArgsConstructor
@Validated
public class LrsController {
  private final LrsService lrsService;

  /**
   * This API is for DATA_PROVIDER users to create a new LRS
   *
   * @param lrsProviderRequest The title and the unique identifier type is required
   */
  @PostMapping("/create")
  public ResponseEntity<?> createNewLrs(
      HttpServletRequest request, @RequestBody @Valid LrsProviderRequest lrsProviderRequest) {
    HttpStatus status = HttpStatus.CREATED;
    return ResponseEntity.status(status)
        .body(
            new ApiSuccess(
                status, "LRS created.", lrsService.createLrs(request, lrsProviderRequest)));
  }

  /**
   * This API is for DATA_PROVIDER users to update. However, if the user wishes to change the
   * original unique identifier, the user must confirm.
   *
   * @param lrdStoreId The id of the LRS
   * @param lrsUpdateRequest The title of the LRS to be updated
   */
  @PutMapping("/{lrdStoreId}")
  public ResponseEntity<?> updateLrs(
      HttpServletRequest request,
      @PathVariable String lrdStoreId,
      @RequestBody @Valid LrsProviderRequest lrsUpdateRequest) {
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(
            new ApiSuccess(
                status,
                "LRS updated.",
                lrsService.updateLrs(request, lrsUpdateRequest, lrdStoreId, false)));
  }

  /**
   * This API is for DATA_PROVIDER users to update. After the confirmation, the unique identifier
   * will be changed.
   *
   * @param lrdStoreId The id of the LRS
   * @param lrsUpdateRequest The title of the LRS to be updated
   */
  @PutMapping("/{lrdStoreId}/confirm")
  public ResponseEntity<?> confirmUpdateLrs(
      HttpServletRequest request,
      @PathVariable String lrdStoreId,
      @RequestBody @Valid LrsProviderRequest lrsUpdateRequest) {
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(
            new ApiSuccess(
                status,
                "LRS updated.",
                lrsService.updateLrs(request, lrsUpdateRequest, lrdStoreId, true)));
  }

  /**
   * This API is to delete an existing LRS. However, if the LRS has at least one statement, it will
   * ask for a confirmation to delete
   *
   * @param lrdStoreId The id of the LRS
   */
  @DeleteMapping("/{lrdStoreId}")
  public ResponseEntity<?> deleteLrs(HttpServletRequest request, @PathVariable String lrdStoreId) {
    lrsService.deleteLrs(request, lrdStoreId, false);
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status).body(new ApiSuccess(status, "LRS deleted successfully."));
  }

  /**
   * This API is to delete an existing LRS. After the confirmation, it will delete from the
   * database.
   *
   * @param lrdStoreId The id of the LRS
   */
  @DeleteMapping("/{lrdStoreId}/confirm")
  public ResponseEntity<?> confirmDeleteLrs(
      HttpServletRequest request, @PathVariable String lrdStoreId) {
    lrsService.deleteLrs(request, lrdStoreId, true);
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status).body(new ApiSuccess(status, "LRS deleted successfully."));
  }
}
