package com.openlap.plugins.visualization;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.openlap.plugins.artifacts.*;
import com.openlap.plugins.management.PluginCatalogVisibility;
import com.openlap.visualization_methods.entities.*;
import com.openlap.visualization_methods.repositories.VisualizationTypeRepository;
import java.nio.file.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.ObjectProvider;

class VisualizationRuntimeServiceTest {
  @TempDir Path folder;
  VisualizationRuntimeService service(Path jar,LegacyVisualizationRuntimeProvider legacy) {
    VisualizationTypeRepository types=mock(VisualizationTypeRepository.class);
    VisLibrary library=new VisLibrary();library.setId("library");library.setFrameworkLocation(jar.toString());
    VisType type=new VisType();type.setId("type");type.setVisualizationLib(library);type.setImplementingClass("example.BarChart");
    when(types.findById("type")).thenReturn(Optional.of(type));
    ObjectProvider<LegacyVisualizationRuntimeProvider> provider=mock(ObjectProvider.class);when(provider.getIfAvailable()).thenReturn(legacy);
    return new VisualizationRuntimeService(types,PluginArtifactResolver.local(),PluginCatalogVisibility.legacyOnly(),folder.toString(),provider);
  }
  @Test void servesOnlyTheSelectedChartsDeclaredAssetsWithAnImmutableArtifactUrl() throws Exception {
    VisualizationManifestTest fixtures=new VisualizationManifestTest();fixtures.folder=folder;Path jar=fixtures.jar(VisualizationManifestTest.manifest());
    VisualizationRuntimeService service=service(jar,null);Map<String,Object> runtime=service.runtime("type","/api");
    assertThat(runtime.get("artifactId")).asString().startsWith("visualizations-");
    List<Map<String,Object>> assets=(List<Map<String,Object>>)runtime.get("assets");
    assertThat(assets).hasSize(1);assertThat(assets.get(0).get("url")).isEqualTo("/api/v1/code/visualizations/type/assets/"+runtime.get("artifactId")+"/runtime-js");
    VisualizationRuntimeService.Asset asset=service.asset("type",(String)runtime.get("artifactId"),"runtime-js");
    assertThat(asset.bytes()).isEqualTo(VisualizationManifestTest.SCRIPT);assertThat(asset.mediaType()).isEqualTo("text/javascript");
    assertThatThrownBy(() -> service.asset("type","visualizations-"+"0".repeat(64),"runtime-js")).hasMessageContaining("different plugin version");
    assertThatThrownBy(() -> service.asset("type",(String)runtime.get("artifactId"),"private-env")).hasMessageContaining("not declared");
  }
  @Test void unknownLegacyJarsNeedAnExplicitCompatibilityProvider() throws Exception {
    VisualizationManifestTest fixtures=new VisualizationManifestTest();fixtures.folder=folder;Path jar=fixtures.jar((org.bson.Document)null);
    assertThatThrownBy(() -> service(jar,null).runtime("type","/api")).hasMessageContaining("No browser runtime");
    LegacyVisualizationRuntimeProvider provider=mock(LegacyVisualizationRuntimeProvider.class);
    when(provider.runtime(any(),any(Path.class),eq("/api"))).thenReturn(Map.of("legacy",true));
    assertThat(service(jar,provider).runtime("type","/api")).containsEntry("legacy",true);
  }
}
