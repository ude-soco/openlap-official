package com.openlap.isc_module.controller;

import com.openlap.isc_module.dto.request.IscRequest;
import com.openlap.isc_module.dto.response.IndicatorSpecificationCardResponse;
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
  public ResponseEntity<?> saveRole(
      HttpServletRequest request, @RequestBody @Valid IscRequest isc) {
    iscService.createIsc(request, isc);
    HttpStatus status = HttpStatus.CREATED;
    return ResponseEntity.status(status).body(new ApiSuccess(status, "ISC created successfully."));
  }

  @PutMapping("/{iscId}")
  public ResponseEntity<?> updateIsc(
      @PathVariable String iscId, @RequestBody @Valid IscRequest isc) {
    iscService.updateIsc(iscId, isc);
    HttpStatus status = HttpStatus.CREATED;
    return ResponseEntity.status(status).body(new ApiSuccess(status, "ISC updated successfully."));
  }

  @GetMapping("/my")
  public ResponseEntity<?> getAllMyISCs(
      HttpServletRequest request,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "10") int size,
      @RequestParam(defaultValue = "createdOn") String sortBy,
      @RequestParam(defaultValue = "asc") String sortDirection) {
    int minSize = 1;
    int maxSize = 100;

    // Enforce the minimum and maximum size values
    if (size < minSize) {
      size = minSize;
    } else if (size > maxSize) {
      size = maxSize;
    }

    Page<IndicatorSpecificationCardResponse> allMyISCs =
        iscService.getAllMyISCs(request, page, size, sortBy, sortDirection);
    String message = allMyISCs.getContent().isEmpty() ? "No ISCs found." : "ISCs found.";
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status).body(new ApiSuccess(status, message, allMyISCs));
  }

  @GetMapping("/{iscId}")
  public ResponseEntity<?> getISCById(@PathVariable String iscId) {
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(new ApiSuccess(status, "ISC found.", iscService.getISCById(iscId)));
  }

  @DeleteMapping("/{iscId}")
  public ResponseEntity<?> deleteISCById(HttpServletRequest request, @PathVariable String iscId) {
    HttpStatus status = HttpStatus.OK;
    iscService.deleteISCbyId(request, iscId);
    return ResponseEntity.status(status).body(new ApiSuccess(status, "ISC deleted successfully."));
  }
}
