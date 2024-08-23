package com.openlap.analytics_module.controllers;

import com.openlap.analytics_module.dto.requests.indicator.IndicatorDraftRequest;
import com.openlap.analytics_module.dto.requests.indicator.IndicatorsToAnalyzeRequest;
import com.openlap.analytics_module.dto.response.indicator.CompatibleIndicatorsCompositeResponse;
import com.openlap.analytics_module.dto.response.indicator.IndicatorResponse;
import com.openlap.analytics_module.dto.response.indicator.IndicatorWithCodeResponse;
import com.openlap.analytics_module.dto.response.indicator.IndicatorsAnalyzedResponse;
import com.openlap.analytics_module.services.IndicatorService;
import com.openlap.response.ApiSuccess;

import javax.servlet.http.HttpServletRequest;
import javax.validation.Valid;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/indicators")
@RequiredArgsConstructor
@Validated
public class IndicatorController {
  private final IndicatorService indicatorService;

  /**
   * This API provides the list of the user's own indicators. It also provides the pagination and
   * filter options.
   *
   * @param sortBy possible options: name, indicatorType, createdOn.
   * @param sortDirection possible options: asc, dsc
   */
  @GetMapping("/my")
  public ResponseEntity<?> getAllMyIndicators(
      HttpServletRequest request,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "10") int size,
      @RequestParam(defaultValue = "createdOn") String sortBy,
      @RequestParam(defaultValue = "asc") String sortDirection) {
    // Set the minimum and maximum size values
    int minSize = 1;
    int maxSize = 100;

    // Enforce the minimum and maximum size values
    if (size < minSize) {
      size = minSize;
    } else if (size > maxSize) {
      size = maxSize;
    }
    Page<IndicatorResponse> allMyIndicators =
        indicatorService.getAllMyIndicators(request, page, size, sortBy, sortDirection);
    String message =
        allMyIndicators.getContent().isEmpty() ? "No indicators found." : "Indicators found.";
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status).body(new ApiSuccess(status, message, allMyIndicators));
  }

  /**
   * This API provides the list of the user's own indicators for creating composite and multi-level
   * analysis indicators. This provides a list of max two indicators with visualization codes.
   */
  @GetMapping("/my/indicator-with-code")
  public ResponseEntity<?> getAllMyIndicators(
      HttpServletRequest request, @RequestParam(defaultValue = "0") int page) {

    PageImpl<IndicatorWithCodeResponse> allMyIndicators =
        indicatorService.getAllMyIndicatorsForCompositeSelection(request, page);
    String message =
        allMyIndicators.getContent().isEmpty() ? "No indicators found." : "Indicators found.";
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status).body(new ApiSuccess(status, message, allMyIndicators));
  }

  @GetMapping("/{indicatorId}/compatible")
  public ResponseEntity<?> findCompatibleIndicators(
      HttpServletRequest request,
      @PathVariable String indicatorId,
      @RequestParam(defaultValue = "0") int page) {
    PageImpl<CompatibleIndicatorsCompositeResponse> compatibleBasicIndicators =
        indicatorService.findCompatibleIndicators(request, indicatorId, page);
    String message =
        compatibleBasicIndicators.getContent().isEmpty()
            ? "No compatible indicators found"
            : "Compatible basic indicators found.";
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(new ApiSuccess(status, message, compatibleBasicIndicators));
  }

  @PostMapping("/analyze")
  public ResponseEntity<?> getAnalyzedIndicators(
      @RequestBody IndicatorsToAnalyzeRequest indicatorList) {
    IndicatorsAnalyzedResponse analyzedIndicators =
        indicatorService.getAnalyzedIndicators(indicatorList);
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(new ApiSuccess(status, "Analyzed indicators found.", analyzedIndicators));
  }

  /**
   * This API is to provide the list of all available indicators. It also provides the pagination
   * and filter options.
   *
   * @param sortBy possible options: name, createdBy, indicatorType, createdOn.
   * @param sortDirection possible options: asc, dsc.
   */
  @GetMapping("/all")
  public ResponseEntity<?> getAllIndicators(
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "10") int size,
      @RequestParam(defaultValue = "createdOn") String sortBy,
      @RequestParam(defaultValue = "asc") String sortDirection) {
    // Set the minimum and maximum size values
    int minSize = 1;
    int maxSize = 100;

    // Enforce the minimum and maximum size values
    if (size < minSize) {
      size = minSize;
    } else if (size > maxSize) {
      size = maxSize;
    }
    Page<IndicatorResponse> allIndicators =
        indicatorService.getAllIndicators(page, size, sortBy, sortDirection);
    String message =
        allIndicators.getContent().isEmpty() ? "No indicators found." : "Indicators found.";
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status).body(new ApiSuccess(status, message, allIndicators));
  }

  /**
   * This API provides the full detail of an indicator.
   *
   * @param indicatorId ID of the indicator
   */
  @GetMapping("/{indicatorId}")
  public ResponseEntity<?> getIndicatorById(@PathVariable String indicatorId) {
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(
            new ApiSuccess(
                status, "Indicator found.", indicatorService.getIndicatorById(indicatorId)));
  }

  /**
   * This API is to get the interactive indicator code (ICC).
   *
   * @param indicatorId ID of the indicator
   */
  @GetMapping("/{indicatorId}/code")
  public ResponseEntity<?> requestInteractiveIndicatorCode(
      @PathVariable String indicatorId, HttpServletRequest request) {
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(
            new ApiSuccess(
                status,
                "Interactive Indicator Code copied successfully.",
                indicatorService.requestInteractiveIndicatorCode(indicatorId, request)));
  }

  /**
   * This API is to copy an existing indicator The user MUST be the original owner of the indicator.
   *
   * @param indicatorId ID of the indicator
   */
  @GetMapping("/my/{indicatorId}/copy")
  public ResponseEntity<?> copyMyExistingIndicator(
      HttpServletRequest request, @PathVariable String indicatorId) {
    indicatorService.copyMyExistingIndicator(request, indicatorId);
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(new ApiSuccess(status, "Indicator duplicated successfully."));
  }

  /**
   * This API is to delete an indicator The user MUST be the original owner of the indicator.
   *
   * @param indicatorId ID of the indicator
   */
  @DeleteMapping("/{indicatorId}/delete")
  public ResponseEntity<?> deleteIndicator(
      HttpServletRequest request, @PathVariable String indicatorId) {
    indicatorService.deleteExistingIndicator(request, indicatorId);
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status).body(new ApiSuccess(status, "Indicator deleted."));
  }

  /**
   * This API is to validate an indicator whether it can be duplicated. This indicator is found from
   * the pool of indicators. The user validating this indicator is not the original owner of the
   * indicator.
   *
   * @param indicatorId ID of the indicator
   */
  @GetMapping("/{indicatorId}/validate-duplicate")
  public ResponseEntity<?> validatePreviewBeforeDuplicationIndicator(
      HttpServletRequest request, @PathVariable String indicatorId) {
    String indicatorCode =
        indicatorService.validatePreviewBeforeDuplicationBasicIndicator(request, indicatorId);
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(
            new ApiSuccess(
                status,
                "Validation was successful and preview could be generated.",
                indicatorCode));
  }

  /**
   * This API is to duplicate an indicator from a pool of indicators. The user duplicating this
   * indicator is NOT the original owner of the indicator.
   *
   * @param indicatorId ID of the indicator
   */
  @GetMapping("/{indicatorId}/duplicate")
  public ResponseEntity<?> duplicateBasicIndicator(
      HttpServletRequest request, @PathVariable String indicatorId) {
    indicatorService.duplicateIndicator(request, indicatorId);
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(new ApiSuccess(status, "Indicator duplicated successfully."));
  }

  /**
   * This API is to create a draft of an indicator
   *
   * @param indicatorDraftRequest Consist of the session and the indicator type of the indicator
   */
  @PostMapping("/drafts")
  public ResponseEntity<?> saveIndicatorDraft(
      HttpServletRequest request, @RequestBody @Valid IndicatorDraftRequest indicatorDraftRequest) {
    indicatorService.saveIndicatorDraft(request, indicatorDraftRequest);
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status).body(new ApiSuccess(status, "Draft saved successfully."));
  }
}
