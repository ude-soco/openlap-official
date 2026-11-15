package com.openlap.plugins.visualization;

import com.openlap.infrastructure.exception.NotFoundException;
import com.openlap.infrastructure.exception.ServiceException;
import com.openlap.plugins.artifacts.*;
import com.openlap.plugins.management.PluginCatalogVisibility;
import com.openlap.visualization_methods.entities.VisType;
import com.openlap.visualization_methods.entities.VisLibrary;
import com.openlap.visualization_methods.repositories.VisualizationTypeRepository;
import java.io.IOException;
import java.nio.file.Path;
import java.util.*;
import org.bson.Document;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/** Browser resources are selected from the same verified immutable artifact as the Java generator. */
@Service
public class VisualizationRuntimeService {
  public record Asset(byte[] bytes, String mediaType, String sha256) {}
  private final VisualizationTypeRepository types;
  private final PluginArtifactResolver artifacts;
  private final PluginCatalogVisibility visibility;
  private final String folder;
  private final LegacyVisualizationRuntimeProvider legacy;

  public VisualizationRuntimeService(VisualizationTypeRepository types, PluginArtifactResolver artifacts,
      PluginCatalogVisibility visibility, @Value("${visualizer.jars.folder}") String folder,
      ObjectProvider<LegacyVisualizationRuntimeProvider> legacy) {
    this.types = types; this.artifacts = artifacts; this.visibility = visibility;
    this.folder = folder; this.legacy = legacy.getIfAvailable();
  }

  public Map<String,Object> runtime(String id, String contextPath) {
    VisType type = type(id); Path jar = jar(type);
    VisualizationManifest manifest = VisualizationManifest.read(jar, null);
    if (manifest == null) {
      if (legacy != null) return legacy.runtime(type, jar, contextPath);
      throw undeclared();
    }
    Document chart = manifest.chart(type.getImplementingClass());
    Document runtime = manifest.runtime(chart.getString("runtimeId"));
    String artifact = artifactId(type, jar);
    List<Document> assets = new ArrayList<>();
    Set<String> needed = new LinkedHashSet<>((List<String>)runtime.get("assets"));
    if (chart.containsKey("iconAssetId")) needed.add(chart.getString("iconAssetId"));
    for (String reference : needed) {
      Document asset = manifest.asset(reference);
      assets.add(new Document("id", reference).append("kind", asset.getString("kind"))
          .append("sha256", asset.getString("sha256")).append("url", assetUrl(contextPath,id,artifact,reference)));
    }
    Map<String,Object> response = new LinkedHashMap<>();
    response.put("schemaVersion",1); response.put("artifactId",artifact);
    response.put("pluginId",manifest.document().getString("pluginId"));
    response.put("pluginVersion",manifest.document().getString("pluginVersion"));
    response.put("chart",chart); response.put("runtime",runtime); response.put("assets",assets);
    return response;
  }

  public Asset asset(String id, String requestedArtifact, String assetId) {
    VisType type = type(id); Path jar = jar(type);
    String artifact = artifactId(type,jar);
    if (!artifact.equals(requestedArtifact)) throw new NotFoundException("This browser asset belongs to a different plugin version.");
    VisualizationManifest manifest = VisualizationManifest.read(jar,null);
    if (manifest == null) {
      if (legacy != null) return legacy.asset(type,jar,artifact,assetId);
      throw undeclared();
    }
    Document chart = manifest.chart(type.getImplementingClass());
    Document runtime = manifest.runtime(chart.getString("runtimeId"));
    if (!((List<?>)runtime.get("assets")).contains(assetId) && !assetId.equals(chart.get("iconAssetId")))
      throw new NotFoundException("The requested asset is not declared for this chart.");
    Document asset = manifest.asset(assetId);
    return new Asset(VisualizationManifest.readAsset(jar,asset),
        VisualizationManifest.mediaType(asset.getString("kind"),asset.getString("path")),asset.getString("sha256"));
  }

  public Document descriptor(String id) {
    VisType type = type(id);
    if (type.getVisualizationDescriptor() != null) return new Document(type.getVisualizationDescriptor());
    VisualizationManifest manifest = VisualizationManifest.read(jar(type),null);
    if (manifest == null) return null;
    Document descriptor = manifest.chart(type.getImplementingClass());
    return descriptor.append("schemaVersion",1).append("pluginId",manifest.document().getString("pluginId"))
        .append("pluginVersion",manifest.document().getString("pluginVersion"));
  }

  public static String assetUrl(String contextPath,String typeId,String artifact,String asset) {
    return contextPath + "/v1/code/visualizations/" + encode(typeId) + "/assets/" + encode(artifact) + "/" + encode(asset);
  }
  private static String encode(String value) { return java.net.URLEncoder.encode(value,java.nio.charset.StandardCharsets.UTF_8).replace("+","%20"); }
  private VisType type(String id) {
    VisType type = types.findById(id).orElseThrow(() -> new NotFoundException("Visualization type not found."));
    visibility.requireExecutable(type.getInstallationId(),"visualization-type",type.getId());
    VisLibrary library = type.getVisualizationLib();
    if (library == null) throw new NotFoundException("Visualization library not found.");
    visibility.requireExecutable(library.getInstallationId(),"visualization-library",library.getId());
    return type;
  }
  private Path jar(VisType type) { VisLibrary library = type.getVisualizationLib(); return artifacts.resolve(PluginKind.VISUALIZATION,library.getArtifactId(),folder,library.getFrameworkLocation()); }
  public static String artifactId(VisType type,Path jar) {
    String recorded = type.getVisualizationLib().getArtifactId();
    if (recorded != null) return recorded;
    try { return PluginArtifact.identity(PluginKind.VISUALIZATION,ArtifactIntegrity.sha256(jar)); }
    catch (IOException error) { throw new ServiceException("The visualization artifact is unavailable.",error); }
  }
  private static NotFoundException undeclared() { return new NotFoundException("VISUALIZATION_RUNTIME_UNDECLARED","No browser runtime is declared for this plugin. Install a self-contained visualization plugin."); }
}
