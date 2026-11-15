package com.openlap.plugins;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.openlap.plugins.artifacts.*;
import com.openlap.plugins.management.*;
import com.openlap.plugins.visualization.*;
import com.openlap.visualization_methods.entities.*;
import com.openlap.visualization_methods.repositories.*;
import com.openlap.visualization_methods.services.impl.VisualizationMethodUtilityServiceImpl;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.jar.*;
import org.bson.Document;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;

class VisualizationManifestInspectionTest {
  @TempDir Path folder;
  Path plugin(String suffix) throws Exception {
    Path original=ManagedPluginFixture.create(folder,suffix,false);
    Path target=folder.resolve("self-contained-"+suffix+".jar");
    byte[] script="window.ExampleCharts = {};".getBytes(StandardCharsets.UTF_8);
    Document chart=new Document("id","bar").append("implementingClass","managedfixture.ManagedChart"+suffix).append("runtimeId","example")
        .append("customizations",List.of(new Document("id","chartTitle").append("label","Title").append("type","text").append("group","elements").append("defaultValue","Example")));
    Document manifest=new Document("schemaVersion",1).append("pluginId","example.charts").append("pluginVersion","1.0.0")
        .append("assets",List.of(new Document("id","runtime-js").append("path","web/runtime.js").append("kind","script").append("sha256",VisualizationManifest.sha256(script))))
        .append("runtimes",List.of(new Document("id","example").append("version","1.0.0").append("assets",List.of("runtime-js"))))
        .append("charts",List.of(chart));
    try (JarFile source=new JarFile(original.toFile());JarOutputStream output=new JarOutputStream(Files.newOutputStream(target))) {
      for (JarEntry entry : Collections.list(source.entries())) { output.putNextEntry(new JarEntry(entry.getName()));source.getInputStream(entry).transferTo(output);output.closeEntry(); }
      output.putNextEntry(new JarEntry(VisualizationManifest.RESOURCE));output.write(manifest.toJson().getBytes(StandardCharsets.UTF_8));output.closeEntry();
      output.putNextEntry(new JarEntry("web/runtime.js"));output.write(script);output.closeEntry();
    }
    Files.delete(original);return target;
  }
  @Test void discoveryAndInspectionExposeStaticRuntimeAndChartDescriptors() throws Exception {
    Path jar=plugin("Manifest");PluginInspector inspector=new PluginInspector();
    PluginInspection discovered=inspector.discover(PluginKind.VISUALIZATION,jar);
    assertThat(discovered.getVisualizationManifest().getString("pluginId")).isEqualTo("example.charts");
    PluginInspection inspected=inspector.inspect(PluginKind.VISUALIZATION,jar);
    assertThat(inspected.getEntries()).hasSize(1);
    Document descriptor=inspected.getEntries().get(0).get("visualizationDescriptor",Document.class);
    assertThat(descriptor.getString("id")).isEqualTo("bar");
    assertThat(descriptor.getString("pluginVersion")).isEqualTo("1.0.0");
    assertThat((List<?>)descriptor.get("customizations")).hasSize(1);
  }
  @Test void localPopulationPersistsDescriptorsWithTheExistingCompiledContract() throws Exception {
    plugin("Local");
    VisualizationTypeRepository types=mock(VisualizationTypeRepository.class);VisualizationLibraryRepository libraries=mock(VisualizationLibraryRepository.class);
    when(types.findAll()).thenReturn(List.of());when(libraries.findAll()).thenReturn(List.of());
    when(libraries.save(any())).thenAnswer(invocation -> {VisLibrary library=invocation.getArgument(0);library.setId("library");return library;});
    VisualizationMethodUtilityServiceImpl service=new VisualizationMethodUtilityServiceImpl(types,libraries,PluginArtifactResolver.local(),PluginCatalogVisibility.legacyOnly());
    ReflectionTestUtils.setField(service,"visualizerJarsFolder",folder.toString());ReflectionTestUtils.setField(service,"visualizerClassDirectory","managedfixture");
    service.populateVisualizationMethods();
    org.mockito.ArgumentCaptor<List<VisType>> captured=org.mockito.ArgumentCaptor.forClass(List.class);verify(types).saveAll(captured.capture());
    assertThat(captured.getValue()).hasSize(1);
    assertThat(captured.getValue().get(0).getVisualizationDescriptor()).containsEntry("pluginId","example.charts").containsEntry("id","bar");
  }
}
