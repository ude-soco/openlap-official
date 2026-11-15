package com.openlap.plugins.visualization;

import com.openlap.response.ApiSuccess;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/code/visualizations")
public class VisualizationRuntimeController {
  private final VisualizationRuntimeService service;
  public VisualizationRuntimeController(VisualizationRuntimeService service) { this.service = service; }

  @GetMapping("/{typeId}/runtime")
  public ResponseEntity<ApiSuccess> runtime(@PathVariable String typeId,HttpServletRequest request) {
    return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(
        new ApiSuccess(HttpStatus.OK,"Visualization runtime found.",service.runtime(typeId,request.getContextPath())));
  }

  @GetMapping("/{typeId}/assets/{artifactId}/{assetId}")
  public ResponseEntity<byte[]> asset(@PathVariable String typeId,@PathVariable String artifactId,@PathVariable String assetId) {
    VisualizationRuntimeService.Asset asset = service.asset(typeId,artifactId,assetId);
    return ResponseEntity.ok().contentType(MediaType.parseMediaType(asset.mediaType()))
        .cacheControl(CacheControl.maxAge(java.time.Duration.ofDays(365)).cachePublic().immutable())
        .eTag("\"" + asset.sha256() + "\"").header("X-Content-Type-Options","nosniff")
        .header("Content-Security-Policy","default-src 'none'; sandbox")
        .body(asset.bytes());
  }
}
