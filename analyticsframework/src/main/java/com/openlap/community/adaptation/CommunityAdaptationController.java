package com.openlap.community.adaptation;

import com.openlap.response.ApiSuccess;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/community/indicators")
@RequiredArgsConstructor
public class CommunityAdaptationController {
  private final CommunityAdaptationService service;
  public record StartRequest(@NotBlank @Size(max = 100) String clientRequestId) {}

  @PostMapping("/{poolId}/adaptations")
  public ResponseEntity<?> start(HttpServletRequest request, @PathVariable String poolId,
      @RequestBody @Valid StartRequest body) {
    var result = service.start(request, poolId, body.clientRequestId());
    return ResponseEntity.ok().header("Cache-Control", "no-store, private")
        .header("Pragma", "no-cache")
        .body(new ApiSuccess(HttpStatus.OK, "Private adaptation draft ready.", result));
  }
}
