package com.openlap.visualization_methods.controllers;

import com.openlap.dataset.OpenLAPDataSetConfigValidationResult;
import com.openlap.dataset.OpenLAPPortConfig;
import com.openlap.response.ApiSuccess;
import com.openlap.visualization_methods.dto.VisualizationLibraryResponse;
import com.openlap.visualization_methods.dto.VisualizationMethodFileNameResponse;
import com.openlap.visualization_methods.dto.VisualizationTypeResponse;
import com.openlap.visualization_methods.services.VisualizationLibraryService;
import com.openlap.visualization_methods.services.VisualizationMethodUtilityService;
import com.openlap.visualization_methods.services.VisualizationTypeService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/v1/visualizations")
@RequiredArgsConstructor
public class VisualizationMethodController {

  private final VisualizationTypeService visualizationTypeService;
  private final VisualizationLibraryService visualizationLibraryService;
  private final VisualizationMethodUtilityService visualizationMethodUtilityService;

  @GetMapping("/libraries/{libraryId}")
  public ResponseEntity<?> getVisualizationLibrary(@PathVariable String libraryId) {
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(
            new ApiSuccess(
                status,
                "Visualization library found.",
                visualizationLibraryService.getVisualizationLibrary(libraryId)));
  }

  @GetMapping("/libraries")
  public ResponseEntity<?> getAllVisualizationLibraries() {
    List<VisualizationLibraryResponse> allVisualizationLibraries =
        visualizationLibraryService.getAllVisualizationLibraries();
    String message =
        allVisualizationLibraries.isEmpty()
            ? "No visualization libraries found."
            : "Visualization libraries found.";
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(new ApiSuccess(status, message, allVisualizationLibraries));
  }

  @GetMapping("/libraries/{libraryId}/types")
  public ResponseEntity<?> getAllVisualizationTypesByVisualizationLibraryId(
      @PathVariable String libraryId) {
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(
            new ApiSuccess(
                status,
                "Visualization types found.",
                visualizationTypeService.getAllVisualizationTypesByVisualizationLibraryId(
                    libraryId)));
  }

  @GetMapping("/types")
  public ResponseEntity<?> getAllVisualizationTypes() {
    List<VisualizationTypeResponse> allVisualizationTypes =
        visualizationTypeService.getAllVisualizationTypes();
    String message =
        allVisualizationTypes.isEmpty()
            ? "No visualization types found."
            : "Visualization types found.";
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(new ApiSuccess(status, message, allVisualizationTypes));
  }

  @GetMapping("/types/{typeId}")
  public ResponseEntity<?> getVisualizationType(@PathVariable String typeId) {
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(
            new ApiSuccess(
                status,
                "Visualization type found.",
                visualizationTypeService.getVisualizationType(typeId)));
  }

  @GetMapping("/types/{typeId}/inputs")
  public ResponseEntity<?> getVisTypeInputs(@PathVariable String typeId) {
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(
            new ApiSuccess(
                status,
                "Visualization inputs found.",
                visualizationTypeService.getVisTypeInputs(typeId)));
  }

  // ! The output of the visualization type is always null, this may not be needed
  @GetMapping("/types/{typeId}/outputs")
  public ResponseEntity<?> getVisTypeOutputs(@PathVariable String typeId) {
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(
            new ApiSuccess(
                status,
                "Visualization outputs found.",
                visualizationTypeService.getVisTypeOutputs(typeId)));
  }

  @GetMapping("/types/{typeId}/validate")
  public ResponseEntity<?> validateAnalyticsTechniqueToVisualizationMapping(
      @PathVariable String typeId,
      @RequestBody OpenLAPPortConfig analyticsTechniqueToVisualizationMapping) {
    OpenLAPDataSetConfigValidationResult validationResult =
        visualizationMethodUtilityService.validateAnalyticsTechniqueToVisualizationMapping(
            typeId, analyticsTechniqueToVisualizationMapping);
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(
            new ApiSuccess(
                status,
                "Validated analytics method outputs to visualization inputs.",
                validationResult));
  }

  /** Uploads a file and adds visualization library and types in the database */
  @PostMapping("/upload")
  public ResponseEntity<?> uploadVisualizationMethodFile(@RequestParam("file") MultipartFile file) {
    visualizationMethodUtilityService.uploadVisualizationMethodFile(file);
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(
            new ApiSuccess(
                status, "File '" + file.getOriginalFilename() + "' uploaded successfully."));
  }

  /**
   * Deletes the file as well as the associated visualization library and types from the database
   */
  @DeleteMapping("/delete")
  public ResponseEntity<?> deleteVisualizationMethodFile(@RequestParam String fileName) {
    visualizationMethodUtilityService.deleteVisualizationMethodFile(fileName);
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(new ApiSuccess(status, "File '" + fileName + "' deleted successfully."));
  }

  /** Reloads the file to upload the (deleted) visualization library and types to the database */
  @GetMapping("/reload")
  public ResponseEntity<?> reloadVisualizationMethodFile(@RequestParam String fileName) {
    visualizationMethodUtilityService.reloadVisualizationMethodFile(fileName);
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(new ApiSuccess(status, "File '" + fileName + "' reloaded successfully."));
  }

  @GetMapping("/files")
  public ResponseEntity<?> getAllVisualizationMethodFileNames() {
    List<VisualizationMethodFileNameResponse> allVisualizationMethodFileNames =
        visualizationMethodUtilityService.getAllVisualizationMethodFileNames();
    String message =
        allVisualizationMethodFileNames.isEmpty()
            ? "No visualization technique jar files found"
            : "Visualization technique jar files found";
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(new ApiSuccess(status, message, allVisualizationMethodFileNames));
  }

  @GetMapping("/files/filename")
  public ResponseEntity<?> getAllVisualizationLibrariesByFilename(@RequestParam String fileName) {
    List<VisualizationLibraryResponse> allVisualizationLibrariesByFilename =
        visualizationMethodUtilityService.getAllVisualizationLibrariesByFilename(fileName);
    String message =
        allVisualizationLibrariesByFilename.isEmpty()
            ? "No visualization libraries for the file found"
            : "Visualization libraries for the file found";
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(new ApiSuccess(status, message, allVisualizationLibrariesByFilename));
  }
}
