package com.openlap.isc_module.controller;

import com.openlap.isc_module.dto.request.IscDraftRequest;
import com.openlap.isc_module.dto.request.IscRequest;
import com.openlap.isc_module.dto.response.IndicatorSpecificationCardResponse;
import com.openlap.isc_module.dto.response.IscMutationResponse;
import com.openlap.isc_module.services.IscService;
import com.openlap.response.ApiSuccess;
import javax.servlet.http.HttpServletRequest;
import javax.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/isc")
@RequiredArgsConstructor
@Validated
public class IscController {
  private final IscService iscService;

  @PostMapping("/create")
  public ResponseEntity<?> createIsc(
      HttpServletRequest request, @RequestBody @Valid IscRequest isc) {
    IscMutationResponse created = iscService.createIsc(request, isc);
    HttpStatus status = HttpStatus.CREATED;
    return ResponseEntity.status(status)
        .body(new ApiSuccess(status, "ISC created successfully.", created));
  }

  @PutMapping("/{iscId}")
  public ResponseEntity<?> updateIsc(
      HttpServletRequest request, @PathVariable String iscId, @RequestBody @Valid IscRequest isc) {
    iscService.updateIsc(request, iscId, isc);
    HttpStatus status = HttpStatus.CREATED;
    return ResponseEntity.status(status).body(new ApiSuccess(status, "ISC updated successfully."));
  }

  @GetMapping("/my")
  public ResponseEntity<?> getAllMyISCs(
      HttpServletRequest request,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "10") int size,
      @RequestParam(defaultValue = "createdOn") String sortBy,
      @RequestParam(defaultValue = "asc") String sortDirection,
      @RequestParam(defaultValue = "") String status,
      @RequestParam(defaultValue = "") String search) {
    int minSize = 1;
    int maxSize = 100;

    // Enforce the minimum and maximum size values
    if (size < minSize) {
      size = minSize;
    } else if (size > maxSize) {
      size = maxSize;
    }

    Page<IndicatorSpecificationCardResponse> allMyISCs =
        iscService.getAllMyISCs(request, page, size, sortBy, sortDirection, status, search);
    String message = allMyISCs.getContent().isEmpty() ? "No ISCs found." : "ISCs found.";
    HttpStatus okStatus = HttpStatus.OK;
    return ResponseEntity.status(okStatus).body(new ApiSuccess(okStatus, message, allMyISCs));
  }

  @GetMapping("/{iscId}")
  public ResponseEntity<?> getISCById(HttpServletRequest request, @PathVariable String iscId) {
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(new ApiSuccess(status, "ISC found.", iscService.getISCById(request, iscId)));
  }

  @DeleteMapping("/{iscId}")
  public ResponseEntity<?> deleteISCById(HttpServletRequest request, @PathVariable String iscId) {
    HttpStatus status = HttpStatus.OK;
    iscService.deleteISCbyId(request, iscId);
    return ResponseEntity.status(status).body(new ApiSuccess(status, "ISC deleted successfully."));
  }

  // ---- Draft lifecycle (Phase 0) ----

  @PostMapping("/drafts")
  public ResponseEntity<?> createDraft(
      HttpServletRequest request, @RequestBody IscDraftRequest draft) {
    IscMutationResponse created = iscService.createDraft(request, draft);
    HttpStatus status = HttpStatus.CREATED;
    return ResponseEntity.status(status).body(new ApiSuccess(status, "Draft created.", created));
  }

  @PutMapping("/drafts/{draftId}")
  public ResponseEntity<?> updateDraft(
      HttpServletRequest request,
      @PathVariable String draftId,
      @RequestBody IscDraftRequest draft) {
    iscService.updateDraft(request, draftId, draft);
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status).body(new ApiSuccess(status, "Draft saved."));
  }

  @PostMapping("/{iscId}/edit-draft")
  public ResponseEntity<?> createOrFindEditDraft(
      HttpServletRequest request, @PathVariable String iscId) {
    IscMutationResponse draft = iscService.createOrFindEditDraft(request, iscId);
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status).body(new ApiSuccess(status, "Edit draft ready.", draft));
  }

  @PostMapping("/drafts/{draftId}/publish")
  public ResponseEntity<?> publishDraft(HttpServletRequest request, @PathVariable String draftId) {
    IscMutationResponse published = iscService.publishDraft(request, draftId);
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(new ApiSuccess(status, "ISC published successfully.", published));
  }

  @DeleteMapping("/drafts/{draftId}")
  public ResponseEntity<?> deleteDraft(HttpServletRequest request, @PathVariable String draftId) {
    iscService.deleteDraft(request, draftId);
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status).body(new ApiSuccess(status, "Draft discarded."));
  }

  // TODO: APIs for copy/duplicate my ISCs
}
