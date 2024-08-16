package com.openlap.analytics_module.controllers;

import com.openlap.analytics_module.dto.requests.indicator.IndicatorAnalysisRequest;
import com.openlap.analytics_module.dto.requests.indicator.IndicatorBasicPreviewRequest;
import com.openlap.analytics_module.dto.requests.indicator.IndicatorBasicRequest;
import com.openlap.analytics_module.services.IndicatorBasicService;
import com.openlap.response.ApiSuccess;
import javax.servlet.http.HttpServletRequest;
import javax.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/indicators/basic")
@RequiredArgsConstructor
@Validated
public class IndicatorBasicController {
  private final IndicatorBasicService indicatorBasicService;

  @PostMapping("/analyze")
  public ResponseEntity<?> analyzeIndicatorBeforeSaving(
      HttpServletRequest request,
      @RequestBody @Valid IndicatorAnalysisRequest indicatorAnalysisRequest) {
    indicatorBasicService.validateUserRequest(
        request, indicatorAnalysisRequest.getIndicatorQuery().getLrsStores());
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(
            new ApiSuccess(
                status,
                "The results of the analysis.",
                indicatorBasicService.analyzeIndicator(indicatorAnalysisRequest)));
  }

  @PostMapping("/preview")
  public ResponseEntity<?> previewIndicatorBeforeSaving(
      HttpServletRequest request,
      @RequestBody @Valid IndicatorBasicPreviewRequest indicatorRequest) {
    indicatorBasicService.validateUserRequest(
        request, indicatorRequest.getIndicatorQuery().getLrsStores());
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(
            new ApiSuccess(
                status,
                "Indicator preview generated.",
                indicatorBasicService.previewIndicator(indicatorRequest)));
  }

  @PostMapping("/create")
  public ResponseEntity<?> createBasicIndicator(
      HttpServletRequest request, @RequestBody @Valid IndicatorBasicRequest indicatorBasicRequest) {
    indicatorBasicService.validateUserRequest(
        request, indicatorBasicRequest.getIndicatorQuery().getLrsStores());
    indicatorBasicService.createBasicIndicator(request, indicatorBasicRequest);
    HttpStatus status = HttpStatus.CREATED;
    return ResponseEntity.status(status)
        .body(new ApiSuccess(status, "Basic indicator created successfully."));
  }

  @PutMapping("/{indicatorId}/update")
  public ResponseEntity<?> updateBasicIndicator(
      HttpServletRequest request,
      @RequestBody @Valid IndicatorBasicRequest indicatorBasicRequest,
      @PathVariable String indicatorId) {
    indicatorBasicService.updateBasicIndicator(request, indicatorBasicRequest, indicatorId);
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(new ApiSuccess(status, "Basic indicator updated successfully."));
  }
}
