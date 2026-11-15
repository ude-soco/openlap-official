package com.openlap.plugins.visualization;

import com.openlap.visualization_methods.entities.VisType;
import java.nio.file.Path;
import java.util.Map;

/** Explicit compatibility for reviewed historical binaries only. Unknown plugins must declare a manifest. */
public interface LegacyVisualizationRuntimeProvider {
  Map<String,Object> runtime(VisType type, Path jar, String contextPath);
  VisualizationRuntimeService.Asset asset(VisType type, Path jar, String artifactId, String assetId);
}
