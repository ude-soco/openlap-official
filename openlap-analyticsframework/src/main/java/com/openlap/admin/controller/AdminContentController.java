package com.openlap.admin.controller;

import com.openlap.admin.audit.AdminAuditService;
import com.openlap.admin.audit.AdminAuditActions;
import com.openlap.admin.audit.AdminResourceTypes;
import com.openlap.content.ContentEntry;
import com.openlap.content.ContentKind;
import com.openlap.content.ContentService;
import com.openlap.content.ContentWriteRequest;
import com.openlap.response.ApiSuccess;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.function.Supplier;
import javax.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/admin/content/{kind}")
@RequiredArgsConstructor
@Slf4j
public class AdminContentController {
  private final ContentService contentService;
  private final AdminAuditService auditService;

  @GetMapping
  public ApiSuccess list(@PathVariable String kind, @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "10") int size, @RequestParam(defaultValue = "") String search,
      @RequestParam(defaultValue = "ALL") String status) {
    return new ApiSuccess(HttpStatus.OK, "Content found.", contentService.list(ContentKind.from(kind), page, size, search, status));
  }

  @GetMapping("/{id}")
  public ApiSuccess get(@PathVariable String kind, @PathVariable String id) {
    return new ApiSuccess(HttpStatus.OK, "Content found.", contentService.get(ContentKind.from(kind), id));
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public ApiSuccess create(@PathVariable String kind, @RequestBody ContentWriteRequest body, HttpServletRequest request) {
    return mutate(request, kind, null, AdminAuditActions.CONTENT_CREATE, HttpStatus.CREATED,
        () -> contentService.create(ContentKind.from(kind), body.getDraft()));
  }

  @PutMapping("/{id}")
  public ApiSuccess save(@PathVariable String kind, @PathVariable String id,
      @RequestBody ContentWriteRequest body, HttpServletRequest request) {
    return mutate(request, kind, id, AdminAuditActions.CONTENT_UPDATE, HttpStatus.OK,
        () -> contentService.save(ContentKind.from(kind), id, body.getDraft(), body.getVersion()));
  }

  @PostMapping("/{id}/{action:publish|unpublish|restore}")
  public ApiSuccess transition(@PathVariable String kind, @PathVariable String id, @PathVariable String action,
      @RequestBody ContentWriteRequest body, HttpServletRequest request) {
    String auditAction = "publish".equals(action) ? AdminAuditActions.CONTENT_PUBLISH
        : "unpublish".equals(action) ? AdminAuditActions.CONTENT_UNPUBLISH : AdminAuditActions.CONTENT_RESTORE;
    return mutate(request, kind, id, auditAction, HttpStatus.OK,
        () -> contentService.transition(ContentKind.from(kind), id, body.getVersion(), action));
  }

  @DeleteMapping("/{id}")
  public ApiSuccess trash(@PathVariable String kind, @PathVariable String id,
      @RequestParam Long version, HttpServletRequest request) {
    return mutate(request, kind, id, AdminAuditActions.CONTENT_TRASH, HttpStatus.OK,
        () -> contentService.transition(ContentKind.from(kind), id, version, "trash"));
  }

  private ApiSuccess mutate(HttpServletRequest request, String kind, String id, String action,
      HttpStatus status, Supplier<ContentEntry> mutation) {
    String resource = "news".equals(kind) ? AdminResourceTypes.HOMEPAGE_NEWS : AdminResourceTypes.HOMEPAGE_PUBLICATION;
    try {
      ContentEntry entry = mutation.get();
      Map<String, Object> metadata = new LinkedHashMap<>();
      metadata.put("version", entry.getVersion());
      metadata.put("status", entry.getStatus());
      try {
        auditService.logSuccess(request, action, resource, entry.getId(),
            String.valueOf(entry.getDraft().get("title")), metadata);
      } catch (RuntimeException e) { log.warn("Content audit logging failed: {}", e.getMessage()); }
      return new ApiSuccess(status, "Content saved.", entry);
    } catch (RuntimeException e) {
      try { auditService.logFailure(request, action, resource, id, null,
          e.getMessage(), java.util.Collections.emptyMap()); }
      catch (RuntimeException auditError) { log.warn("Content audit logging failed: {}", auditError.getMessage()); }
      throw e;
    }
  }
}
