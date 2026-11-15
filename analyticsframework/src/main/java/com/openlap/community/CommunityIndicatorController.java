package com.openlap.community;

import com.openlap.response.ApiSuccess;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/community/indicators")
@RequiredArgsConstructor
public class CommunityIndicatorController {
  private final CommunityIndicatorService service;
  public record PreviewRequest(@Size(max = 20) Map<@Size(max = 100) String, @Size(max = 100) String> connections) {}
  public record CopyRequest(@NotBlank @Size(max = 100) String receiptId) {}

  @PostMapping("/{poolId}/preview")
  public ResponseEntity<?> preview(HttpServletRequest request, @PathVariable String poolId,
      @RequestBody(required = false) @Valid PreviewRequest body) {
    var result = service.preview(request, poolId, body == null ? Map.of() : body.connections());
    return ResponseEntity.ok().header("Cache-Control", "no-store, private").header("Pragma", "no-cache").body(new ApiSuccess(HttpStatus.OK, result.message(), result));
  }

  @PostMapping("/{poolId}/copy")
  public ResponseEntity<?> copy(HttpServletRequest request, @PathVariable String poolId, @RequestBody @Valid CopyRequest body) {
    var result = service.copy(request, poolId, body.receiptId());
    return ResponseEntity.ok().header("Cache-Control", "no-store, private").header("Pragma", "no-cache").body(new ApiSuccess(HttpStatus.OK, "Community indicator saved to your dashboard.", result));
  }
}
