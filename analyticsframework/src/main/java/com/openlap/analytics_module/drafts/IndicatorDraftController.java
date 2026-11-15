package com.openlap.analytics_module.drafts;

import com.openlap.response.ApiSuccess;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/indicators")
@RequiredArgsConstructor
@Validated
public class IndicatorDraftController {
  private final IndicatorDraftService drafts;
  private static ResponseEntity<?> ok(String message,Object value) {
    return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(new ApiSuccess(HttpStatus.OK,message,value));
  }
  @PostMapping("/drafts")
  public ResponseEntity<?> create(HttpServletRequest request,@Valid @RequestBody IndicatorDraftRequests.Create body) {
    return ResponseEntity.status(HttpStatus.CREATED).cacheControl(CacheControl.noStore()).body(new ApiSuccess(HttpStatus.CREATED,"Draft saved.",drafts.create(request,body)));
  }
  @GetMapping("/drafts")
  public ResponseEntity<?> list(HttpServletRequest request,@RequestParam(defaultValue="0") int page,
      @RequestParam(defaultValue="10") int size,@RequestParam(defaultValue="") String search,
      @RequestParam(required=false) String searchText,@RequestParam(required=false) String indicatorType,
      @RequestParam(defaultValue="updatedAt") String sortBy,@RequestParam(defaultValue="desc") String sortDirection) {
    return ok("Drafts found.",drafts.list(request,page,size,searchText==null?search:searchText,indicatorType,sortBy,sortDirection));
  }
  @GetMapping("/drafts/{id}")
  public ResponseEntity<?> get(HttpServletRequest request,@PathVariable String id) { return ok("Draft found.",drafts.get(request,id)); }
  @PutMapping("/drafts/{id}")
  public ResponseEntity<?> update(HttpServletRequest request,@PathVariable String id,@Valid @RequestBody IndicatorDraftRequests.Update body) {
    return ok("Draft saved.",drafts.update(request,id,body));
  }
  @DeleteMapping("/drafts/{id}")
  public ResponseEntity<?> discard(HttpServletRequest request,@PathVariable String id,@RequestParam @Min(0) long revision) {
    return ok("Draft discarded.",drafts.discard(request,id,revision));
  }
  @PostMapping("/{indicatorId}/edit-draft")
  public ResponseEntity<?> edit(HttpServletRequest request,@PathVariable String indicatorId) {
    return ok("Edit draft ready.",drafts.edit(request,indicatorId));
  }
  @PostMapping("/drafts/{id}/complete")
  public ResponseEntity<?> complete(HttpServletRequest request,@PathVariable String id,@Valid @RequestBody IndicatorDraftRequests.Complete body) {
    return ok("Indicator saved.",drafts.complete(request,id,body));
  }
}
