package com.openlap.plugins.visualization;

import static org.assertj.core.api.Assertions.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.jar.*;
import org.bson.Document;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class VisualizationManifestTest {
  @Test void publicSchemaAndRuntimeUseTheSameIdentifierAndEmptyControlContract() throws Exception {
    Document data = manifest();
    assertThat(VisualizationManifest.read(jar(data), null)).isNotNull();
    Document chart = (Document) ((List<?>) data.get("charts")).get(0);
    chart.remove("customizations");
    assertThatThrownBy(() -> VisualizationManifest.read(jar(data), null)).hasMessageContaining("customizations array");
    chart.put("customizations", List.of());
    data.put("pluginId", "a".repeat(101));
    assertThatThrownBy(() -> VisualizationManifest.read(jar(data), null)).hasMessageContaining("pluginId");
    data.put("pluginId", "constructor");
    assertThatThrownBy(() -> VisualizationManifest.read(jar(data), null)).hasMessageContaining("non-reserved");
  }
  @TempDir Path folder;
  static final byte[] SCRIPT = "window.ExampleCharts = {};".getBytes(StandardCharsets.UTF_8);
  static Document manifest() {
    Document asset = new Document("id","runtime-js").append("path","web/runtime.js").append("kind","script").append("sha256",VisualizationManifest.sha256(SCRIPT));
    Document runtime = new Document("id","example").append("version","1.0.0").append("assets",List.of("runtime-js"));
    Document chart = new Document("id","bar").append("implementingClass","example.BarChart").append("runtimeId","example").append("customizations",List.of());
    return new Document("schemaVersion",1).append("pluginId","example.charts").append("pluginVersion","1.0.0").append("assets",List.of(asset)).append("runtimes",List.of(runtime)).append("charts",List.of(chart));
  }
  Path jar(Document manifest) throws Exception { return jar(manifest == null ? null : manifest.toJson(),Map.of("web/runtime.js",SCRIPT)); }
  Path jar(String manifest,Map<String,byte[]> assets) throws Exception {
    Path target = folder.resolve(UUID.randomUUID()+".jar");
    try (JarOutputStream output = new JarOutputStream(Files.newOutputStream(target))) {
      if (manifest != null) { output.putNextEntry(new JarEntry(VisualizationManifest.RESOURCE)); output.write(manifest.getBytes(StandardCharsets.UTF_8)); output.closeEntry(); }
      for (var entry : assets.entrySet()) { output.putNextEntry(new JarEntry(entry.getKey())); output.write(entry.getValue()); output.closeEntry(); }
    }
    return target;
  }
  @Test void legacyArchiveHasNoRequiredManifest() throws Exception { assertThat(VisualizationManifest.read(jar((Document)null),List.of("example.BarChart"))).isNull(); }
  @Test void validatesBundledAssetsAndExactDiscoveredCharts() throws Exception {
    VisualizationManifest result = VisualizationManifest.read(jar(manifest()),List.of("example.BarChart"));
    assertThat(result.chart("example.BarChart").getString("runtimeId")).isEqualTo("example");
    assertThat(result.runtime("example").get("assets")).isEqualTo(List.of("runtime-js"));
    assertThat(result.assets()).hasSize(1);
  }
  @Test void rejectsUnknownSchemaAndUndeclaredChartClasses() throws Exception {
    Document data=manifest();data.put("schemaVersion",2);
    assertThatThrownBy(() -> VisualizationManifest.read(jar(data),null)).hasMessageContaining("version");
    assertThatThrownBy(() -> VisualizationManifest.read(jar(manifest()),List.of("example.OtherChart"))).hasMessageContaining("exactly match");
  }
  @Test void schemaVersionAcceptsTheJsonSchemaIntegerFormOnePointZero() throws Exception {
    Document data=manifest();data.put("schemaVersion",1.0);
    assertThat(VisualizationManifest.read(jar(data),null).document().get("schemaVersion")).isEqualTo(1);
    data.put("schemaVersion",1.1);
    assertThatThrownBy(() -> VisualizationManifest.read(jar(data),null)).hasMessageContaining("version");
  }
  @Test void numericChoiceDuplicatesMatchJavascriptNumbersWhileOtherScalarTypesRemainDistinct() throws Exception {
    for (List<Object> values : List.of(List.<Object>of(1,1.0),List.<Object>of(0,-0.0))) {
      Document data=manifest();Document chart=(Document)((List<?>)data.get("charts")).get(0);
      List<Document> options=values.stream().map(value -> new Document("value",value).append("label",String.valueOf(value))).toList();
      chart.put("customizations",List.of(new Document("id","choice").append("label","Choice").append("type","select").append("group","elements").append("options",options)));
      assertThatThrownBy(() -> VisualizationManifest.read(jar(data),null)).hasMessageContaining("unique scalar");
    }
    Document data=manifest();Document chart=(Document)((List<?>)data.get("charts")).get(0);
    chart.put("customizations",List.of(new Document("id","choice").append("label","Choice").append("type","select").append("group","elements").append("options",List.of(
        new Document("value",false).append("label","Boolean false"),
        new Document("value","false").append("label","String false"),
        new Document("value",0).append("label","Numeric zero")))));
    assertThat(VisualizationManifest.read(jar(data),null)).isNotNull();
  }
  @Test void rejectsMissingAndModifiedAssets() throws Exception {
    assertThatThrownBy(() -> VisualizationManifest.read(jar(manifest().toJson(),Map.of()),null)).hasMessageContaining("missing");
    assertThatThrownBy(() -> VisualizationManifest.read(jar(manifest().toJson(),Map.of("web/runtime.js",new byte[]{1})),null)).hasMessageContaining("checksum");
  }
  @Test void rejectsTraversalExternalUrlsAndWrongMediaTypes() throws Exception {
    for (String path : List.of("web/../private.env","https://example.org/runtime.js","web/runtime.jar","web//runtime.js")) {
      Document data=manifest();((Document)((List<?>)data.get("assets")).get(0)).put("path",path);
      assertThatThrownBy(() -> VisualizationManifest.read(jar(data),null)).isInstanceOf(com.openlap.infrastructure.exception.ValidationException.class);
    }
  }
  @Test void rejectsDuplicateJsonFieldsAndUnknownFields() throws Exception {
    assertThatThrownBy(() -> VisualizationManifest.read(jar("{\"schemaVersion\":1,\"schemaVersion\":2}",Map.of()),null)).hasMessageContaining("malformed");
    Document data=manifest();data.put("scripts","https://example.org/unreviewed.js");
    assertThatThrownBy(() -> VisualizationManifest.read(jar(data),null)).hasMessageContaining("unknown");
  }
  @Test void rejectsUndeclaredAndDuplicateRuntimeAssets() throws Exception {
    for (List<String> references : List.of(List.of("missing"),List.of("runtime-js","runtime-js"))) {
      Document data=manifest();((Document)((List<?>)data.get("runtimes")).get(0)).put("assets",references);
      assertThatThrownBy(() -> VisualizationManifest.read(jar(data),null)).hasMessageContaining("reference");
    }
  }
  @Test void validatesControlDefaultsAndVisibilityReferences() throws Exception {
    Document data=manifest();Document chart=(Document)((List<?>)data.get("charts")).get(0);
    chart.put("customizations",List.of(new Document("id","limit").append("label","Limit").append("type","number").append("group","elements").append("min",1).append("defaultValue",0)));
    assertThatThrownBy(() -> VisualizationManifest.read(jar(data),null)).hasMessageContaining("Invalid value");
    ((Document)((List<?>)chart.get("customizations")).get(0)).put("defaultValue",1);
    ((Document)((List<?>)chart.get("customizations")).get(0)).put("visibleWhen",new Document("id","unknown").append("equals",true));
    assertThatThrownBy(() -> VisualizationManifest.read(jar(data),null)).hasMessageContaining("another declared");
  }
  @Test void onlyReturnsDeclaredAssetBytes() throws Exception {
    Path path=jar(manifest());VisualizationManifest result=VisualizationManifest.read(path,null);
    assertThat(VisualizationManifest.readAsset(path,result.asset("runtime-js"))).isEqualTo(SCRIPT);
    assertThatThrownBy(() -> result.asset("private-env")).hasMessageContaining("absent");
  }
  @Test void rejectsCyclicVisibilityAndNumericConstraintsOnOtherControls() throws Exception {
    Document first = new Document("id","first").append("label","First").append("type","boolean").append("group","elements")
        .append("visibleWhen",new Document("id","second").append("equals",true));
    Document second = new Document("id","second").append("label","Second").append("type","boolean").append("group","elements")
        .append("visibleWhen",new Document("id","first").append("equals",true));
    Document data=manifest();Document chart=(Document)((List<?>)data.get("charts")).get(0);chart.put("customizations",List.of(first,second));
    assertThatThrownBy(() -> VisualizationManifest.read(jar(data),null)).hasMessageContaining("cycles");
    first.remove("visibleWhen");first.put("step",1);chart.put("customizations",List.of(first));
    assertThatThrownBy(() -> VisualizationManifest.read(jar(data),null)).hasMessageContaining("Only number");
  }
}
