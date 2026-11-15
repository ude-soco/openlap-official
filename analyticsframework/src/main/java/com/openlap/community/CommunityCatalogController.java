package com.openlap.community;

import com.openlap.response.ApiSuccess;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/community")
public class CommunityCatalogController {
  private final CommunityCatalogService catalog;
  private final CommunityIscService isc;
  private final CommunityIndicatorDetails details;
  public CommunityCatalogController(CommunityCatalogService catalog, CommunityIscService isc, CommunityIndicatorDetails details) {
    this.catalog = catalog; this.isc = isc; this.details = details;
  }
  @ModelAttribute public void privateResponses(HttpServletResponse response) {
    response.setHeader("Cache-Control", "no-store, private");
    response.setHeader("Pragma", "no-cache");
    response.setHeader("Vary", "Authorization");
  }
  @GetMapping("/{kind}")
  public ApiSuccess list(HttpServletRequest request, @PathVariable String kind,
      @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size,
      @RequestParam(defaultValue = "") String search, @RequestParam(defaultValue = "updatedAt") String sortBy,
      @RequestParam(defaultValue = "desc") String sortDirection, @RequestParam(defaultValue = "") String type,
      @RequestParam(defaultValue = "") String method, @RequestParam(defaultValue = "") String chart,
      @RequestParam(defaultValue = "") String goal) {
    return success(catalog.page(request, kind, page, size, search, sortBy, sortDirection, type, method, chart, goal));
  }
  @GetMapping("/{kind}/filters") public ApiSuccess filters(@PathVariable String kind) { return success(catalog.filters(kind)); }
  @GetMapping("/isc/{poolId}") public ApiSuccess isc(HttpServletRequest request, @PathVariable String poolId) { return success(isc.detail(request, poolId)); }
  @GetMapping("/indicators/{poolId}") public ApiSuccess indicator(HttpServletRequest request, @PathVariable String poolId) { return success(details.detail(request, poolId)); }
  public record IscCopyRequest(String version) {}
  @PostMapping("/isc/{poolId}/copy") public ApiSuccess copy(HttpServletRequest request, @PathVariable String poolId,
      @RequestBody IscCopyRequest body) { return success(isc.copy(request, poolId, body.version())); }
  private static ApiSuccess success(Object value) { return new ApiSuccess(HttpStatus.OK, "Community indicator ready.", value); }
}
