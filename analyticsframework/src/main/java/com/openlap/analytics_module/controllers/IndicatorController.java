package com.openlap.analytics_module.controllers;

import com.openlap.analytics_module.dto.requests.indicator.IndicatorsToAnalyzeRequest;
import com.openlap.analytics_module.dto.response.indicator.*;
import com.openlap.analytics_module.services.IndicatorService;
import com.openlap.analytics_module.services.ComplexIndicatorSourceGuard;
import com.openlap.response.ApiSuccess;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

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
  private final ComplexIndicatorSourceGuard sourceGuard;

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
    return ResponseEntity.status(status).cacheControl(org.springframework.http.CacheControl.noStore()).body(new ApiSuccess(status, message, allMyIndicators));
  }

  /**
   * This API provides the list of the user's own indicators for creating composite and multi-level
   * analysis indicators. This provides a list of max two indicators with visualization codes.
   */
  @GetMapping("/my/indicator-with-code")
  public ResponseEntity<?> getAllMyIndicators(
      HttpServletRequest request, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "") String searchText) {

    PageImpl<IndicatorWithCodeResponse> allMyIndicators =
        indicatorService.getAllMyIndicatorsForCompositeSelection(request, page, searchText);
    String message =
        allMyIndicators.getContent().isEmpty() ? "No indicators found." : "Indicators found.";
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status).cacheControl(org.springframework.http.CacheControl.noStore()).body(new ApiSuccess(status, message, allMyIndicators));
  }

  @GetMapping("/{indicatorId}/compatible")
  public ResponseEntity<?> findCompatibleIndicators(
      HttpServletRequest request,
      @PathVariable String indicatorId,
      @RequestParam(defaultValue = "0") int page) {
    sourceGuard.requireOwned(request, indicatorId);
    PageImpl<CompatibleIndicatorsCompositeResponse> compatibleBasicIndicators =
        indicatorService.findCompatibleIndicators(request, indicatorId, page);
    String message =
        compatibleBasicIndicators.getContent().isEmpty()
            ? "No compatible indicators found"
            : "Compatible basic indicators found.";
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .cacheControl(org.springframework.http.CacheControl.noStore())
        .body(new ApiSuccess(status, message, compatibleBasicIndicators));
  }

  @PostMapping("/analyze")
  public ResponseEntity<?> getAnalyzedIndicators(
      HttpServletRequest request, @RequestBody @Valid IndicatorsToAnalyzeRequest indicatorList) {
    sourceGuard.validateIds(request,
        indicatorList.getIndicators().stream().map(i -> i.getIndicatorId()).toList(), false, false);
    IndicatorsAnalyzedResponse analyzedIndicators =
        indicatorService.getAnalyzedIndicators(indicatorList);
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .cacheControl(org.springframework.http.CacheControl.noStore())
        .body(new ApiSuccess(status, "Analyzed indicators found.", analyzedIndicators));
  }

  /** Retired: community browsing uses anonymous DTOs, never owner records. */
  @GetMapping("/all")
  public ResponseEntity<?> getAllIndicators(
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "10") int size,
      @RequestParam(defaultValue = "createdOn") String sortBy,
      @RequestParam(defaultValue = "asc") String sortDirection) {
    throw new com.openlap.analytics_module.exceptions.indicator.ComplexIndicatorException(
        HttpStatus.GONE, "COMMUNITY_ROUTE_REQUIRED", "Browse indicators through the community pool.");
  }

  /**
   * This API provides the full detail of an indicator.
   *
   * @param indicatorId ID of the indicator
   */
  @GetMapping("/{indicatorId}")
  public ResponseEntity<?> getIndicatorById(HttpServletRequest request, @PathVariable String indicatorId,
      @RequestParam(defaultValue = "true") boolean includeCode) {
    sourceGuard.requireOwned(request, indicatorId);
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .cacheControl(org.springframework.http.CacheControl.noStore())
        .body(
            new ApiSuccess(
                status, "Indicator found.", indicatorService.getIndicatorById(indicatorId, includeCode)));
  }

  /**
   * This API is to get the interactive indicator code (ICC).
   *
   * @param indicatorId ID of the indicator
   */
  @GetMapping("/{indicatorId}/code")
  public ResponseEntity<?> requestInteractiveIndicatorCode(
      @PathVariable String indicatorId, HttpServletRequest request) {
    sourceGuard.requireOwned(request, indicatorId);
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .cacheControl(org.springframework.http.CacheControl.noStore())
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
    sourceGuard.requireOwned(request, indicatorId);
    indicatorService.copyMyExistingIndicator(request, indicatorId);
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .cacheControl(org.springframework.http.CacheControl.noStore())
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
    return ResponseEntity.status(status).cacheControl(org.springframework.http.CacheControl.noStore()).body(new ApiSuccess(status, "Indicator deleted."));
  }

  /** Retired: use the viewer-bound POST community preview. */
  @GetMapping("/{indicatorId}/validate-duplicate")
  public ResponseEntity<?> validatePreviewBeforeDuplicationIndicator(
      HttpServletRequest request, @PathVariable String indicatorId) {
    throw new com.openlap.analytics_module.exceptions.indicator.ComplexIndicatorException(
        HttpStatus.GONE, "COMMUNITY_ROUTE_REQUIRED",
        "Preview and save through the community pool to use your own data safely.");
  }

  /** Retired: a community copy requires a fresh personal preview receipt. */
  @GetMapping("/{indicatorId}/duplicate")
  public ResponseEntity<?> duplicateBasicIndicator(
      HttpServletRequest request, @PathVariable String indicatorId) {
    throw new com.openlap.analytics_module.exceptions.indicator.ComplexIndicatorException(
        HttpStatus.GONE, "COMMUNITY_ROUTE_REQUIRED",
        "Preview and save through the community pool to use your own data safely.");
  }

}
