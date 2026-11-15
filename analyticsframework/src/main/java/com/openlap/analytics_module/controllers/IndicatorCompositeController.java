package com.openlap.analytics_module.controllers;

import com.openlap.analytics_module.dto.requests.indicator.IndicatorCompositeMergeRequest;
import com.openlap.analytics_module.dto.requests.indicator.IndicatorCompositePreviewRequest;
import com.openlap.analytics_module.dto.requests.indicator.IndicatorCompositeRequest;
import com.openlap.analytics_module.services.IndicatorCompositeService;
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
@RequestMapping("/v1/indicators/composite")
@RequiredArgsConstructor
@Validated
public class IndicatorCompositeController {
  private final IndicatorCompositeService indicatorCompositeService;
  private final ComplexIndicatorSourceGuard sourceGuard;

  @PostMapping("/merge")
  public ResponseEntity<?> mergeBasicIndicatorsBeforeSaving(
      HttpServletRequest request, @RequestBody @Valid IndicatorCompositeMergeRequest indicatorCompositeRequest) {
    sourceGuard.validate(request, indicatorCompositeRequest.getIndicators(), true);
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(
            new ApiSuccess(
                status,
                "The merged results between basic indicators.",
                indicatorCompositeService.mergeIndicatorsForCompositeIndicator(
                    indicatorCompositeRequest)));
  }

  @PostMapping("/preview")
  public ResponseEntity<?> previewCompositeIndicatorBeforeSaving(
      HttpServletRequest request, @RequestBody @Valid IndicatorCompositePreviewRequest indicatorCompositeRequest) {
    sourceGuard.validate(request, indicatorCompositeRequest.getIndicators(), true);
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(
            new ApiSuccess(
                status,
                "Indicator preview generated.",
                indicatorCompositeService.previewIndicatorComposite(indicatorCompositeRequest)));
  }

  @PostMapping("/create")
  public ResponseEntity<?> createCompositeIndicator(
      HttpServletRequest request,
      @RequestBody @Valid IndicatorCompositeRequest indicatorCompositeRequest) {
    sourceGuard.validate(request, indicatorCompositeRequest.getIndicators(), true);
    indicatorCompositeService.createCompositeIndicator(request, indicatorCompositeRequest);
    HttpStatus status = HttpStatus.CREATED;
    return ResponseEntity.status(status)
        .body(new ApiSuccess(status, "Composite indicator created successfully."));
  }

  @PutMapping("/{indicatorId}/update")
  public ResponseEntity<?> updateCompositeIndicator(
      HttpServletRequest request,
      @RequestBody @Valid IndicatorCompositeRequest indicatorCompositeRequest,
      @PathVariable String indicatorId) {
    sourceGuard.validate(request, indicatorCompositeRequest.getIndicators(), true);
    indicatorCompositeService.updateCompositeIndicator(
        request, indicatorCompositeRequest, indicatorId);
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(new ApiSuccess(status, "Composite indicator updated successfully."));
  }
}
