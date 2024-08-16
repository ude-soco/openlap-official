package com.openlap.analytics_engine.controller;

import com.openlap.analytics_engine.services.EngineService;
import com.openlap.response.ApiSuccess;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/engine")
@RequiredArgsConstructor
@Validated
public class EngineController {
  private final EngineService engineService;

  @GetMapping("/initialize")
  public ResponseEntity<?> initializeDatabase() {
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(new ApiSuccess(status, "Database populated", engineService.initializeDatabase()));
  }
}
