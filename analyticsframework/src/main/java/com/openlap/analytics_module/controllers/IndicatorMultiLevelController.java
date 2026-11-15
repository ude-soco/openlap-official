package com.openlap.analytics_module.controllers;

import com.openlap.analytics_module.dto.requests.indicator.*;
import com.openlap.analytics_module.services.IndicatorMultiLevelService;
import com.openlap.response.ApiSuccess;
import com.openlap.analytics_module.services.ComplexIndicatorSourceGuard;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/indicators/multilevel")
@RequiredArgsConstructor
@Validated
public class IndicatorMultiLevelController {
  private final IndicatorMultiLevelService indicatorMultiLevelService;
  private final ComplexIndicatorSourceGuard sourceGuard;

  @PostMapping("/compatible")
  public ResponseEntity<?> findCompatibleIndicatorsColumnToMerge(
      HttpServletRequest request, @RequestBody @Valid IndicatorMultiLevelMergeRequest indicatorMultiLevelMergeRequest) {
    sourceGuard.validate(request, indicatorMultiLevelMergeRequest.getIndicators(), false);
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(
            new ApiSuccess(
                status,
                "Compatible columns to merge found.",
                indicatorMultiLevelService.getCompatibleIndicatorsOutputsMergeForMultiLevels(
                    indicatorMultiLevelMergeRequest)));
  }

  @PostMapping("/merge")
  public ResponseEntity<?> mergeBasicIndicatorsBeforeSaving(
      HttpServletRequest request, @RequestBody @Valid IndicatorMultiLevelMergeRequest indicatorMultiLevelMergeRequest) {
    sourceGuard.validate(request, indicatorMultiLevelMergeRequest.getIndicators(), false);
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(
            new ApiSuccess(
                status,
                "The merged results between basic indicators.",
                indicatorMultiLevelService.mergeBasicIndicatorsForMultiLevelIndicator(
                    indicatorMultiLevelMergeRequest)));
  }

  @PostMapping("/analyze")
  public ResponseEntity<?> analyzeMultiLevelIndicatorBeforeSaving(
      HttpServletRequest request, @RequestBody @Valid IndicatorMultiLevelAnalysisRequest indicatorMultiLevelAnalysisRequest) {
    sourceGuard.validate(request, indicatorMultiLevelAnalysisRequest.getIndicators(), false);
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(
            new ApiSuccess(
                status,
                "The analyzed results between basic indicators.",
                indicatorMultiLevelService.analyzeBasicIndicatorsForMultiLevelIndicator(
                    indicatorMultiLevelAnalysisRequest)));
  }

  @PostMapping("/preview")
  public ResponseEntity<?> previewMultiLevelIndicatorBeforeSaving(
      HttpServletRequest request, @RequestBody @Valid IndicatorMultiLevelPreviewRequest indicatorMultiLevelPreviewRequest) {
    sourceGuard.validate(request, indicatorMultiLevelPreviewRequest.getIndicators(), false);
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(
            new ApiSuccess(
                status,
                "The preview results of the multi-level indicator.",
                indicatorMultiLevelService.previewBasicIndicatorsForMultiLevelIndicator(
                    indicatorMultiLevelPreviewRequest)));
  }

  @PostMapping("/create")
  public ResponseEntity<?> createMultiLevelIndicator(
      HttpServletRequest request,
      @RequestBody @Valid IndicatorMultiLevelRequest indicatorMultiLevelCreateRequest) {
    sourceGuard.validate(request, indicatorMultiLevelCreateRequest.getIndicators(), false);
    indicatorMultiLevelService.createMultiLevelIndicator(request, indicatorMultiLevelCreateRequest);
    HttpStatus status = HttpStatus.CREATED;
    return ResponseEntity.status(status)
        .body(new ApiSuccess(status, "Multi-level analysis indicator created successfully."));
  }

  @PutMapping("/{indicatorId}/update")
  public ResponseEntity<?> updateMultiLevelIndicator(
      HttpServletRequest request,
      @RequestBody @Valid IndicatorMultiLevelRequest indicatorMultiLevelCreateRequest,
      @PathVariable String indicatorId) {
    sourceGuard.validate(request, indicatorMultiLevelCreateRequest.getIndicators(), false);
    indicatorMultiLevelService.updateMultiLevelIndicator(
        request, indicatorMultiLevelCreateRequest, indicatorId);
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(new ApiSuccess(status, "Multi-level analysis indicator updated successfully."));
  }
}
