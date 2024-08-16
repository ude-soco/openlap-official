package com.openlap.analytics_technique.controller;

import com.openlap.analytics_technique.dto.request.AnalyticsTechniqueRequest;
import com.openlap.analytics_technique.dto.response.AnalyticsTechniqueFileNameResponse;
import com.openlap.analytics_technique.dto.response.AnalyticsTechniqueResponse;
import com.openlap.analytics_technique.services.AnalyticsTechniqueService;
import com.openlap.dataset.OpenLAPPortConfig;
import com.openlap.response.ApiSuccess;
import java.util.List;
import javax.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/v1/analytics/methods")
@RequiredArgsConstructor
@Validated
public class AnalyticsTechniqueController {
  private final AnalyticsTechniqueService analyticsTechniqueService;

  @PostMapping("/create")
  public ResponseEntity<?> createAnalyticsTechnique(
      @Valid @RequestBody AnalyticsTechniqueRequest method) {
    analyticsTechniqueService.createAnalyticsTechnique(method);
    HttpStatus status = HttpStatus.CREATED;
    return ResponseEntity.status(status).body(new ApiSuccess(status, "Analytics method created."));
  }

  @GetMapping("/{techniqueId}")
  public ResponseEntity<?> getAnalyticsTechniquesById(@PathVariable String techniqueId) {
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(
            new ApiSuccess(
                status,
                "Analytics method found.",
                analyticsTechniqueService.getAnalyticsTechniquesById(techniqueId)));
  }

  // ? Create a AnalyticsMethodResponse entity
  @GetMapping
  public ResponseEntity<?> getAllAnalyticsTechniques() {
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(
            new ApiSuccess(
                status,
                "All analytics methods found.",
                analyticsTechniqueService.getAllAnalyticsTechniques()));
  }

  @GetMapping("/populate")
  public ResponseEntity<?> populateAnalyticsTechniques() {
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(
            new ApiSuccess(
                status,
                "All analytics methods populated.",
                analyticsTechniqueService.populateAnalyticsTechniques()));
  }

  @GetMapping("/inputs/{methodId}")
  public ResponseEntity<?> getAnalyticsTechniqueInputs(@PathVariable String methodId) {
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(
            new ApiSuccess(
                status,
                "Inputs for analytics method found.",
                analyticsTechniqueService.getAnalyticsTechniqueInputs(methodId)));
  }

  @GetMapping("/outputs/{methodId}")
  public ResponseEntity<?> getAnalyticsTechniqueOutputs(@PathVariable String methodId) {
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(
            new ApiSuccess(
                status,
                "Outputs for analytics method found.",
                analyticsTechniqueService.getAnalyticsTechniqueOutputs(methodId)));
  }

  @GetMapping("/params/{methodId}")
  public ResponseEntity<?> getAnalyticsTechniqueParams(@PathVariable String methodId) {
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(
            new ApiSuccess(
                status,
                "Parameters for analytics method found.",
                analyticsTechniqueService.getAnalyticsTechniqueParams(methodId)));
  }

  @PostMapping("/validate/{analyticsTechniqueId}")
  public ResponseEntity<?> validateAnalyticsTechniqueMapping(
      @PathVariable String analyticsTechniqueId,
      @RequestBody OpenLAPPortConfig indicatorToAnalyticsTechniqueMapping) {
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(
            new ApiSuccess(
                status,
                "Ports for an analytics method validated.",
                analyticsTechniqueService.validateAnalyticsTechniqueMapping(
                    analyticsTechniqueId, indicatorToAnalyticsTechniqueMapping)));
  }

  @PostMapping("/upload")
  public ResponseEntity<?> uploadAnalyticsTechniqueFile(@RequestParam("file") MultipartFile file) {
    analyticsTechniqueService.uploadAnalyticsTechniqueFile(file);
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(
            new ApiSuccess(
                status, "File '" + file.getOriginalFilename() + "' uploaded successfully."));
  }

  /** Deletes the file as well as the associated analytics technique from the database */
  @DeleteMapping("/delete")
  public ResponseEntity<?> deleteAnalyticsTechniqueFile(@RequestParam String fileName) {
    analyticsTechniqueService.deleteAnalyticsTechniqueFile(fileName);
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(new ApiSuccess(status, "File '" + fileName + "' deleted successfully."));
  }

  /** Reload the file to upload (deleted) analytics technique to the database */
  @GetMapping("/reload")
  public ResponseEntity<?> reloadAnalyticsTechniqueFile(@RequestParam String fileName) {
    analyticsTechniqueService.reloadAnalyticsTechniqueFile(fileName);
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(new ApiSuccess(status, "File '" + fileName + "' reloaded successfully."));
  }

  @GetMapping("/files")
  public ResponseEntity<?> getAllAnalyticsTechniqueFileNames() {
    List<AnalyticsTechniqueFileNameResponse> allAnalyticsTechniqueFileNames =
        analyticsTechniqueService.getAllAnalyticsTechniqueFileNames();
    String message =
        allAnalyticsTechniqueFileNames.isEmpty()
            ? "No analytics technique jar files found"
            : "Analytics technique jar files found";
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(new ApiSuccess(status, message, allAnalyticsTechniqueFileNames));
  }

  @GetMapping("/files/filename")
  public ResponseEntity<?> getAllAnalyticsTechniqueByFileName(@RequestParam String fileName) {
    List<AnalyticsTechniqueResponse> allAnalyticsTechnique =
        analyticsTechniqueService.getAllAnalyticsTechniqueByFileName(fileName);
    String message =
        allAnalyticsTechnique.isEmpty()
            ? "No analytics technique jar files found"
            : "Analytics technique jar files found";
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(new ApiSuccess(status, message, allAnalyticsTechnique));
  }
}
