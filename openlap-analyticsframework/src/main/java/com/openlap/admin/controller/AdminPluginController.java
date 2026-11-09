package com.openlap.admin.controller;

import com.openlap.admin.audit.AdminAuditService;
import static com.openlap.admin.audit.AdminAuditActions.*;
import static com.openlap.admin.audit.AdminResourceTypes.PLUGIN_INSTALLATION;
import com.openlap.plugins.artifacts.PluginKind;
import com.openlap.plugins.management.PluginManagementService;
import com.openlap.plugins.management.PluginCatalogEditor;
import com.openlap.plugins.management.PluginCatalogKind;
import com.openlap.response.ApiSuccess;
import java.io.IOException;
import java.security.Principal;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import javax.servlet.http.HttpServletRequest;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** All routes are SUPER_ADMIN-only through SecurityConfig's /v1/admin/** rule. */
@RestController
@RequestMapping("/v1/admin/plugins")
@RequiredArgsConstructor
@Slf4j
public class AdminPluginController {
  private final PluginManagementService plugins;
  private final AdminAuditService audit;
  private final PluginCatalogEditor catalog;
  private final com.openlap.plugins.management.PluginRemovalService removal;
  private final com.openlap.plugins.management.PluginArtifactCleanup cleanup;

  @GetMapping("/catalog/{kind}/{id}/removal")
  public ApiSuccess removal(@PathVariable PluginCatalogKind kind, @PathVariable String id) {
    return new ApiSuccess(HttpStatus.OK, "Removal review found.", removal.preview(kind, id));
  }

  @DeleteMapping("/catalog/{kind}/{id}")
  public ApiSuccess remove(@PathVariable PluginCatalogKind kind, @PathVariable String id, @RequestBody ReviewRequest body, HttpServletRequest request) throws IOException {
    return mutate(request, PLUGIN_REMOVE, id, kind.name(), () -> removal.remove(kind, id, body.getExpectedVersions()));
  }

  @GetMapping("/removed")
  public ApiSuccess removed(@RequestParam PluginCatalogKind kind) {
    Map<String, Object> data = new LinkedHashMap<>(); data.put("available", removal.available()); data.put("entries", removal.removed(kind));
    return new ApiSuccess(HttpStatus.OK, "Removed entries found.", data);
  }

  @PostMapping("/removals/{id}/restore")
  public ApiSuccess restore(@PathVariable String id, HttpServletRequest request) throws IOException {
    return mutate(request, PLUGIN_RESTORE, id, "PLUGIN_REMOVAL", () -> removal.restore(id));
  }

  @PostMapping("/removals/{id}/resume")
  public ApiSuccess resume(@PathVariable String id, HttpServletRequest request) throws IOException {
    return mutate(request, PLUGIN_REMOVE, id, "PLUGIN_REMOVAL", () -> removal.resume(id));
  }

  @GetMapping("/cleanup")
  public ApiSuccess cleanup() { return new ApiSuccess(HttpStatus.OK, "Retention cleanup reviewed.", cleanup.preview()); }

  @PostMapping("/cleanup")
  public ApiSuccess cleanup(@RequestBody ReviewRequest body, HttpServletRequest request) throws IOException {
    return mutate(request, PLUGIN_ARTIFACT_CLEANUP, "retention-cleanup", () -> cleanup.run(Boolean.TRUE.equals(body.getConfirmed())));
  }

  @GetMapping("/catalog/{kind}/{id}")
  public ApiSuccess details(@PathVariable PluginCatalogKind kind, @PathVariable String id) {
    return new ApiSuccess(HttpStatus.OK, "Plugin details found.", catalog.details(kind, id));
  }

  @GetMapping("/catalog/{kind}/{id}/history")
  public ApiSuccess history(@PathVariable PluginCatalogKind kind, @PathVariable String id) {
    return new ApiSuccess(HttpStatus.OK, "Plugin versions found.", plugins.history(kind, id));
  }

  @GetMapping("/catalog/{kind}/{id}/replacement-target")
  public ApiSuccess replacementTarget(@PathVariable PluginCatalogKind kind, @PathVariable String id) {
    return new ApiSuccess(HttpStatus.OK, "Replacement source found.", plugins.replacementTarget(kind, id));
  }

  @PatchMapping("/catalog/{kind}/{id}")
  public ApiSuccess edit(@PathVariable PluginCatalogKind kind, @PathVariable String id,
      @RequestBody Map<String, Object> body, HttpServletRequest request) throws IOException {
    return mutate(request, PLUGIN_DETAILS_UPDATE, id, kind.name(), () -> catalog.edit(kind, id, body));
  }

  @GetMapping
  public ApiSuccess list(@RequestParam PluginKind kind) {
    Map<String, Object> data = new LinkedHashMap<>();
    data.put("available", plugins.available());
    data.put("uploads", plugins.recent(kind));
    return new ApiSuccess(HttpStatus.OK, "Plugin uploads found.", data);
  }

  @GetMapping("/{id}")
  public ApiSuccess get(@PathVariable String id) { return new ApiSuccess(HttpStatus.OK, "Plugin review found.", plugins.get(id)); }

  @PostMapping(value = "/upload", consumes = "multipart/form-data")
  public ApiSuccess upload(@RequestParam PluginKind kind, @RequestPart("file") MultipartFile file,
      @RequestParam(required = false) PluginCatalogKind replacementKind, @RequestParam(required = false) String replacementId,
      Principal principal, HttpServletRequest request) throws IOException {
    return mutate(request, PLUGIN_UPLOAD, null, () -> plugins.upload(kind, file, principal == null ? "unknown" : principal.getName(), replacementKind, replacementId));
  }

  @PostMapping("/{id}/replacement")
  public ApiSuccess configureReplacement(@PathVariable String id, @RequestBody Map<String, Object> body, HttpServletRequest request) throws IOException {
    return mutate(request, PLUGIN_REPLACEMENT_REVIEW, id, () -> plugins.configureReplacement(id,
        PluginCatalogEditor.requireVersion(body.get("version")), body));
  }

  @PostMapping("/{id}/retire-previous")
  public ApiSuccess retirePrevious(@PathVariable String id, @RequestBody ReviewRequest body, HttpServletRequest request) throws IOException {
    return mutate(request, PLUGIN_PREVIOUS_DISABLE, id, () -> plugins.retirePrevious(id, body.getVersion(), body.getExpectedVersions()));
  }

  @PostMapping("/{id}/inspect")
  public ApiSuccess inspect(@PathVariable String id, @RequestBody ReviewRequest body, HttpServletRequest request) throws IOException {
    return mutate(request, PLUGIN_INSPECT, id, () -> plugins.inspect(id, body.getVersion(), Boolean.TRUE.equals(body.getTrusted())));
  }

  @PostMapping("/{id}/activate")
  public ApiSuccess activate(@PathVariable String id, @RequestBody ReviewRequest body, HttpServletRequest request) throws IOException {
    return mutate(request, PLUGIN_ACTIVATE, id, () -> plugins.activate(id, body.getVersion()));
  }

  @PostMapping("/{id}/{action:discard|reopen}")
  public ApiSuccess reviewState(@PathVariable String id, @PathVariable String action, @RequestBody ReviewRequest body, HttpServletRequest request) throws IOException {
    return mutate(request, "discard".equals(action) ? PLUGIN_UPLOAD_DISCARD : PLUGIN_UPLOAD_REOPEN, id,
        () -> "discard".equals(action) ? plugins.discard(id, body.getVersion()) : plugins.reopen(id, body.getVersion()));
  }

  private ApiSuccess mutate(HttpServletRequest request, String action, String id, Mutation mutation) throws IOException {
    return mutate(request, action, id, PLUGIN_INSTALLATION, mutation);
  }

  private ApiSuccess mutate(HttpServletRequest request, String action, String id, String resource, Mutation mutation) throws IOException {
    try {
      Map<String, Object> result = mutation.run();
      Map<String, Object> metadata = new LinkedHashMap<>();
      for (String field : new String[] {"kind", "sha256", "state", "version", "purged", "failedArtifactIds"}) if (result.containsKey(field)) metadata.put(field, result.get(field));
      if (result.get("replacement") instanceof Map<?, ?>) {
        Map<?, ?> plan = (Map<?, ?>) result.get("replacement");
        metadata.put("previousArtifactId", plan.get("previousArtifactId")); metadata.put("familyId", plan.get("familyId"));
      }
      String resourceId = result.get("catalogId") != null && !"PLUGIN_REMOVAL".equals(resource) ? String.valueOf(result.get("catalogId")) : String.valueOf(result.getOrDefault("id", id));
      try { audit.logSuccess(request, action, resource, resourceId,
          String.valueOf(result.getOrDefault("filename", result.getOrDefault("name", action))), metadata); }
      catch (RuntimeException e) { log.warn("Plugin audit logging failed."); }
      return new ApiSuccess(HttpStatus.OK, "Plugin review updated.", result);
    } catch (RuntimeException | IOException e) {
      // Driver/plugin exception messages can contain private data; log only our bounded public contract.
      String message = e instanceof com.openlap.infrastructure.exception.OpenLapException ? e.getMessage() : "Plugin operation failed.";
      try { audit.logFailure(request, action, resource, id, null, message, Collections.emptyMap()); }
      catch (RuntimeException auditError) { log.warn("Plugin audit logging failed."); }
      throw e;
    }
  }

  @FunctionalInterface private interface Mutation { Map<String, Object> run() throws IOException; }

  @Getter @Setter
  public static class ReviewRequest {
    private Long version;
    private Boolean trusted;
    private Map<String, Object> expectedVersions;
    private Boolean confirmed;
  }
}
