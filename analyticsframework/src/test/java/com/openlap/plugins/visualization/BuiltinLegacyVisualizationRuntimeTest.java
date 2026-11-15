package com.openlap.plugins.visualization;

import static org.assertj.core.api.Assertions.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.openlap.visualization_methods.entities.*;
import java.nio.file.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class BuiltinLegacyVisualizationRuntimeTest {
  @TempDir Path folder;
  private VisType type() {
    VisLibrary library=new VisLibrary();library.setName("C3.js");
    VisType type=new VisType();type.setId("chart-type");type.setImplementingClass("example.BarChart");type.setVisualizationLib(library);return type;
  }
  @Test void c3CompatibilityLoadsStylesAndD3BeforeC3UsingPinnedAssets() {
    var profile=new BuiltinLegacyVisualizationRuntime().runtimeFor(type(),BuiltinLegacyVisualizationRuntime.C3,
        "visualizations-"+BuiltinLegacyVisualizationRuntime.C3,"/api");
    Map<?,?> runtime=(Map<?,?>)profile.get("runtime");
    assertThat(runtime.get("id")).isEqualTo("c3");assertThat(runtime.get("version")).isEqualTo("0.7.18");
    assertThat(runtime.get("assets")).isEqualTo(List.of("c3-css","d3","c3"));
    List<Map<String,Object>> assets=(List<Map<String,Object>>)profile.get("assets");
    assertThat(assets).extracting(asset -> asset.get("kind")).containsExactly("style","script","script");
    assertThat(assets).allSatisfy(asset -> {
      assertThat(asset.get("url")).asString().startsWith("/api/v1/code/visualizations/chart-type/assets/visualizations-");
      assertThat(asset.get("sha256")).asString().matches("[a-f0-9]{64}");
    });
  }
  @Test void apexCompatibilityDeclaresOnlyItsOwnPinnedRuntime() {
    var profile=new BuiltinLegacyVisualizationRuntime().runtimeFor(type(),BuiltinLegacyVisualizationRuntime.APEX,
        "visualizations-"+BuiltinLegacyVisualizationRuntime.APEX,"/api");
    Map<?,?> runtime=(Map<?,?>)profile.get("runtime");
    assertThat(runtime.get("id")).isEqualTo("apexcharts");assertThat(runtime.get("version")).isEqualTo("8.8.1");
    assertThat(runtime.get("assets")).isEqualTo(List.of("apex"));
    assertThat((List<?>)profile.get("assets")).hasSize(1);
  }
  @Test void aLibraryNameOrClassCannotEnableAnUnreviewedHistoricalProfile() throws Exception {
    Path unknown=folder.resolve("unknown.jar");Files.writeString(unknown,"Unreviewed plugin binary");
    BuiltinLegacyVisualizationRuntime provider=new BuiltinLegacyVisualizationRuntime();
    assertThatThrownBy(() -> provider.runtime(type(),unknown,"/api")).hasMessageContaining("no browser runtime manifest");
    assertThatThrownBy(() -> provider.runtimeFor(type(),"0".repeat(64),"visualizations-"+"0".repeat(64),"/api"))
        .hasMessageContaining("no browser runtime manifest");
    assertThatThrownBy(() -> provider.asset(type(),unknown,"visualizations-"+"0".repeat(64),"c3"))
        .hasMessageContaining("not found");
  }
  @Test void everyBundledVendorFileMatchesItsVersionedSourceReceipt() throws Exception {
    ObjectMapper mapper=new ObjectMapper();
    List<Map<String,String>> receipts;
    try(var input=getClass().getResourceAsStream("/openlap-chart-runtime/vendor/assets.json")) {
      assertThat(input).isNotNull();receipts=mapper.readValue(input,new TypeReference<List<Map<String,String>>>(){});
    }
    assertThat(receipts).hasSize(7);
    for(Map<String,String> receipt:receipts) {
      assertThat(receipt.get("source")).startsWith("npm:").contains("@");
      try(var input=getClass().getResourceAsStream("/openlap-chart-runtime/vendor/"+receipt.get("file"))) {
        assertThat(input).as(receipt.get("file")).isNotNull();
        assertThat(VisualizationManifest.sha256(input.readAllBytes())).as(receipt.get("file")).isEqualTo(receipt.get("sha256"));
      }
    }
    Map<String,String> hashes=new HashMap<>();for(var receipt:receipts)hashes.put(receipt.get("file"),receipt.get("sha256"));
    var profile=new BuiltinLegacyVisualizationRuntime().runtimeFor(type(),BuiltinLegacyVisualizationRuntime.C3,"artifact","/api");
    List<Map<String,Object>> assets=(List<Map<String,Object>>)profile.get("assets");
    assertThat(assets.get(0).get("sha256")).isEqualTo(hashes.get("c3-0.7.18.min.css"));
    assertThat(assets.get(1).get("sha256")).isEqualTo(hashes.get("d3-5.16.0.min.js"));
    assertThat(assets.get(2).get("sha256")).isEqualTo(hashes.get("c3-0.7.18.min.js"));
    var apex=new BuiltinLegacyVisualizationRuntime().runtimeFor(type(),BuiltinLegacyVisualizationRuntime.APEX,"artifact","/api");
    assertThat(((List<Map<String,Object>>)apex.get("assets")).get(0).get("sha256")).isEqualTo(hashes.get("apexcharts-8.8.1.min.js"));
  }
}
