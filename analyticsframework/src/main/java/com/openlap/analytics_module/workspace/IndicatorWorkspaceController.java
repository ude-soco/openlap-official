package com.openlap.analytics_module.workspace;

import com.openlap.response.ApiSuccess;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/indicators/my/workspace")
@RequiredArgsConstructor
public class IndicatorWorkspaceController {
  private final IndicatorWorkspaceService workspace;

  @GetMapping
  public ResponseEntity<?> list(
      HttpServletRequest request,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "10") int size,
      @RequestParam(defaultValue = "") String search,
      @RequestParam(required = false) String indicatorType,
      @RequestParam(defaultValue = "false") boolean draftsOnly,
      @RequestParam(defaultValue = "updatedAt") String sortBy,
      @RequestParam(defaultValue = "desc") String sortDirection) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(
            new ApiSuccess(
                HttpStatus.OK,
                "Your indicators found.",
                workspace.list(
                    request,
                    page,
                    size,
                    search,
                    indicatorType,
                    draftsOnly,
                    sortBy,
                    sortDirection)));
  }
}
