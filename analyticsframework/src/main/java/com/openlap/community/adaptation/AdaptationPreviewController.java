package com.openlap.community.adaptation;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import com.openlap.response.ApiSuccess;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/indicators/drafts")
@RequiredArgsConstructor
public class AdaptationPreviewController {
  private final IndicatorAdaptationLifecycle adaptations;

  public record Request(@NotNull @Min(0) Long revision, @NotBlank String stage) {}

  @PostMapping("/{id}/adaptation-preview")
  public ResponseEntity<?> preview(HttpServletRequest request, @PathVariable String id,
      @Valid @RequestBody Request body) {
    return ResponseEntity.ok().cacheControl(CacheControl.noStore().cachePrivate())
        .header(HttpHeaders.PRAGMA, "no-cache")
        .body(new ApiSuccess(HttpStatus.OK, "Adaptation preview checked.", adaptations.preview(request, id, body)));
  }
}
