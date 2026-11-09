package com.openlap.admin.controller;

import com.openlap.admin.audit.AdminAuditService;
import static com.openlap.admin.audit.AdminAuditActions.*;
import static com.openlap.admin.audit.AdminResourceTypes.PLUGIN_INSTALLATION;
import com.openlap.plugins.artifacts.PluginKind;
import com.openlap.plugins.management.PluginManagementService;
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
      Principal principal, HttpServletRequest request) throws IOException {
    return mutate(request, PLUGIN_UPLOAD, null, () -> plugins.upload(kind, file, principal == null ? "unknown" : principal.getName()));
  }

  @PostMapping("/{id}/inspect")
  public ApiSuccess inspect(@PathVariable String id, @RequestBody ReviewRequest body, HttpServletRequest request) throws IOException {
    return mutate(request, PLUGIN_INSPECT, id, () -> plugins.inspect(id, body.getVersion(), Boolean.TRUE.equals(body.getTrusted())));
  }

  @PostMapping("/{id}/activate")
  public ApiSuccess activate(@PathVariable String id, @RequestBody ReviewRequest body, HttpServletRequest request) throws IOException {
    return mutate(request, PLUGIN_ACTIVATE, id, () -> plugins.activate(id, body.getVersion()));
  }

  private ApiSuccess mutate(HttpServletRequest request, String action, String id, Mutation mutation) throws IOException {
    try {
      Map<String, Object> result = mutation.run();
      Map<String, Object> metadata = new LinkedHashMap<>();
      for (String field : new String[] {"kind", "sha256", "state", "version"}) metadata.put(field, result.get(field));
      try { audit.logSuccess(request, action, PLUGIN_INSTALLATION, String.valueOf(result.get("id")), String.valueOf(result.get("filename")), metadata); }
      catch (RuntimeException e) { log.warn("Plugin audit logging failed."); }
      return new ApiSuccess(HttpStatus.OK, "Plugin review updated.", result);
    } catch (RuntimeException | IOException e) {
      // Driver/plugin exception messages can contain private data; log only our bounded public contract.
      String message = e instanceof com.openlap.infrastructure.exception.OpenLapException ? e.getMessage() : "Plugin operation failed.";
      try { audit.logFailure(request, action, PLUGIN_INSTALLATION, id, null, message, Collections.emptyMap()); }
      catch (RuntimeException auditError) { log.warn("Plugin audit logging failed."); }
      throw e;
    }
  }

  @FunctionalInterface private interface Mutation { Map<String, Object> run() throws IOException; }

  @Getter @Setter
  public static class ReviewRequest {
    private Long version;
    private Boolean trusted;
  }
}
