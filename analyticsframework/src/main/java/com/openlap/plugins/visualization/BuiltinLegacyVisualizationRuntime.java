package com.openlap.plugins.visualization;

import com.openlap.infrastructure.exception.NotFoundException;
import com.openlap.infrastructure.exception.ServiceException;
import com.openlap.plugins.artifacts.ArtifactIntegrity;
import com.openlap.visualization_methods.entities.VisType;
import java.io.IOException;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.*;
import org.springframework.stereotype.Component;

/** Compatibility declarations for the two previously qualified, immutable historical JARs. */
@Component
public final class BuiltinLegacyVisualizationRuntime implements LegacyVisualizationRuntimeProvider {
  static final String C3 = "ba08d00b3a26d7d5e6b127a55b1a965c08dd3e1bfd5da6ef865134f78d380033";
  static final String APEX = "46615516ff62cfc7c7978acf9a4385d9f3f31490265877408d9dc674bbe11029";
  private record Resource(String id, String filename, String kind, String mediaType) {}
  private static final List<Resource> C3_ASSETS = List.of(
      new Resource("c3-css", "c3-0.7.18.min.css", "style", "text/css"),
      new Resource("d3", "d3-5.16.0.min.js", "script", "text/javascript"),
      new Resource("c3", "c3-0.7.18.min.js", "script", "text/javascript"));
  private static final List<Resource> APEX_ASSETS = List.of(
      new Resource("apex", "apexcharts-8.8.1.min.js", "script", "text/javascript"));

  @Override public Map<String,Object> runtime(VisType type, Path jar, String contextPath) {
    String hash = hash(jar);
    return runtimeFor(type, hash, VisualizationRuntimeService.artifactId(type, jar), contextPath);
  }

  Map<String,Object> runtimeFor(VisType type, String hash, String artifactId, String contextPath) {
    List<Resource> resources = resources(hash);
    List<Map<String,Object>> assets = new ArrayList<>();
    for (Resource resource : resources) {
      VisualizationRuntimeService.Asset asset = read(resource);
      assets.add(Map.of("id", resource.id(), "kind", resource.kind(), "sha256", asset.sha256(),
          "url", VisualizationRuntimeService.assetUrl(contextPath, type.getId(), artifactId, resource.id())));
    }
    String runtimeId = C3.equals(hash) ? "c3" : "apexcharts";
    Map<String,Object> result = new LinkedHashMap<>();
    result.put("schemaVersion", 1);
    result.put("artifactId", artifactId);
    result.put("pluginId", "openlap.legacy." + runtimeId);
    result.put("pluginVersion", hash);
    result.put("chart", Map.of("id", type.getId(), "implementingClass", type.getImplementingClass(), "runtimeId", runtimeId));
    result.put("runtime", Map.of("id", runtimeId, "version", C3.equals(hash) ? "0.7.18" : "8.8.1",
        "assets", resources.stream().map(Resource::id).toList()));
    result.put("assets", assets);
    return result;
  }

  @Override public VisualizationRuntimeService.Asset asset(VisType type, Path jar, String artifactId, String assetId) {
    if (!VisualizationRuntimeService.artifactId(type, jar).equals(artifactId)) throw missing();
    Resource resource = resources(hash(jar)).stream().filter(item -> item.id().equals(assetId))
        .findFirst().orElseThrow(BuiltinLegacyVisualizationRuntime::missing);
    return read(resource);
  }

  private static List<Resource> resources(String hash) {
    if (C3.equals(hash)) return C3_ASSETS;
    if (APEX.equals(hash)) return APEX_ASSETS;
    throw new NotFoundException("VISUALIZATION_RUNTIME_UNDECLARED",
        "This plugin has no browser runtime manifest. Install a self-contained visualization plugin.");
  }
  private static String hash(Path jar) {
    try { return ArtifactIntegrity.sha256(jar); }
    catch (IOException error) { throw new ServiceException("The visualization artifact is unavailable.", error); }
  }
  private static VisualizationRuntimeService.Asset read(Resource resource) {
    try (var input = BuiltinLegacyVisualizationRuntime.class.getResourceAsStream(
        "/openlap-chart-runtime/vendor/" + resource.filename())) {
      if (input == null) throw new IOException("Packaged browser asset unavailable.");
      byte[] bytes = input.readAllBytes();
      String sha = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
      return new VisualizationRuntimeService.Asset(bytes, resource.mediaType(), sha);
    } catch (IOException error) { throw new ServiceException("The packaged chart runtime is unavailable.", error); }
    catch (NoSuchAlgorithmException impossible) { throw new IllegalStateException(impossible); }
  }
  private static NotFoundException missing() { return new NotFoundException("Browser asset not found."); }
}
