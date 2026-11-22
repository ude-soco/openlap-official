package com.openlap.plugins;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.openlap.dataset.OpenLAPDataColumn;
import com.openlap.dataset.OpenLAPDataSet;
import com.openlap.dataset.OpenLAPPortConfig;
import com.openlap.dataset.OpenLAPPortMapping;
import com.openlap.exceptions.UnTransformableData;
import com.openlap.exceptions.VisualizationCodeGenerationException;
import com.openlap.plugins.artifacts.PluginKind;
import com.openlap.plugins.management.PluginInspector;
import com.openlap.plugins.visualization.VisualizationCustomization;
import com.openlap.template.VisualizationCodeGenerator;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.jar.JarFile;
import org.bson.Document;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class BundledVisualizationQualification {
  private static final List<String> CHARTS = List.of("bar", "line", "area", "pie", "donut", "scatter",
      "grouped-area", "stacked-area", "multi-line");

  @ParameterizedTest
  @CsvSource({
      "c3, C3, C3.js, OpenLAPC3",
      "apexcharts, ApexCharts, ApexCharts, OpenLAPApex",
      "plotly, Plotly, Plotly.js, OpenLAPPlotly",
      "recharts, Recharts, Recharts, OpenLAPRecharts"
  })
  void qualifiesAllChartsAndTheSharedRuntime(String module, String delivery, String library, String renderer)
      throws Exception {
    Path path = Path.of("../visualization-methods", module, "target", "OpenLAP-" + delivery + "-1.1.0.jar");
    assertThat(path).as("Build visualization-methods before qualifying the plugins").isRegularFile();
    var plugin = new PluginInspector().inspect(PluginKind.VISUALIZATION, path);
    assertThat(plugin.getLibrary().getString("name")).isEqualTo(library + " (bundled)");
    assertThat(plugin.getEntries()).extracting(entry -> descriptor(entry).getString("id"))
        .containsExactlyInAnyOrderElementsOf(CHARTS);
    assertThat(plugin.getEntries()).extracting(entry -> descriptor(entry).getString("runtimeId"))
        .containsOnly(module);
    try (JarFile archive = new JarFile(path.toFile())) {
      assertThat(archive.stream().map(entry -> entry.getName()))
          .noneMatch(name -> name.startsWith("com/openlap/template/") || name.startsWith("com/openlap/dataset/")
              || name.startsWith("com/google/gson/"));
      assertThat(archive.getJarEntry("META-INF/licenses/" + module + "-LICENSE")).isNotNull();
    }
    try (var loader = new URLClassLoader(new URL[] {path.toUri().toURL()}, getClass().getClassLoader())) {
      for (Document entry : plugin.getEntries()) {
        String kind = descriptor(entry).getString("id");
        assertControls(descriptor(entry), kind);
        var plot = instance(loader, entry);
        Map<String, List<?>> data = switch (kind) {
          case "scatter" -> Map.of("x", List.of(2, 2), "y", List.of(3, 5), "label", List.of("<A>", "B"),
              "series", List.of("East", "West"));
          case "grouped-area", "stacked-area", "multi-line" -> Map.of("category", List.of("<A>", "<A>", "B"),
              "value", List.of(3, 5, 2), "series", List.of("East", "West", "West"));
          default -> Map.of("category", List.of("<A>", "B"), "value", List.of(3, 5));
        };
        assertThat(plot.getVisualizationLibraryScript()).isEmpty();
        assertThat(generate(plot, data, Map.of("chartTitle", "<Chart>", "height", 480)))
            .contains("window." + renderer + ".render(", "\"" + kind + "\"", "\\u003cA\\u003e", "\\u003cChart\\u003e",
                "\"height\":480")
            .doesNotContain("<A>", "<Chart>", "https://", "<script src=");
      }
      var scatter = instance(loader, chart(plugin.getEntries(), "scatter"));
      assertThat(generate(scatter, Map.of("x", List.of(2, 2), "y", List.of(3, 5)), Map.of()))
          .contains("[{\"x\":2.0,\"y\":3.0},{\"x\":2.0,\"y\":5.0}]");
      var bar = chart(plugin.getEntries(), "bar");
      var customization = VisualizationCustomization.validate(descriptor(bar), Map.of(
          "sortingOrder", "asc", "hiddenCategories", List.of("Private category"),
          "chartSubtitle", "<Subtitle>", "titlePosition", "right", "legendPosition", "left",
          "showXAxis", false, "showValues", true, "showValuesBackground", true, "valuesPosition", "center"));
      assertThat(generate(instance(loader, bar), Map.of("category", List.of("High", "Private category", "Low", "Tie"),
          "value", List.of(8, 5, 2, 2)), customization))
          .containsSubsequence("\"category\":\"Low\"", "\"category\":\"Tie\"", "\"category\":\"High\"")
          .contains("\"chartSubtitle\":\"\\u003cSubtitle\\u003e\"", "\"titlePosition\":\"right\"",
              "\"legendPosition\":\"left\"", "\"showXAxis\":false", "\"showValuesBackground\":true",
              "\"valuesPosition\":\"center\"")
          .doesNotContain("Private category");
      var grouped = instance(loader, chart(plugin.getEntries(), "grouped-area"));
      assertThatThrownBy(() -> generate(grouped, Map.of("category", List.of("A", "A"),
          "value", List.of(3, 5), "series", List.of("East", "East")), Map.of()))
          .isInstanceOf(UnTransformableData.class).hasMessageContaining("duplicate combinations");
      var pie = instance(loader, chart(plugin.getEntries(), "pie"));
      assertThatThrownBy(() -> generate(pie, Map.of("category", List.of("A", "B"), "value", List.of(-3, 5)), Map.of()))
          .isInstanceOf(VisualizationCodeGenerationException.class).hasMessageContaining("non-negative");
    }
  }

  private static void assertControls(Document descriptor, String kind) {
    var controls = descriptor.getList("customizations", Document.class).stream()
        .collect(Collectors.toMap(control -> control.getString("id"), control -> control));
    assertThat(controls).containsKeys("chartSubtitle", "titlePosition", "legendPosition", "showValuesBackground", "seriesColor");
    boolean radial = Set.of("pie", "donut").contains(kind);
    if (radial) assertThat(controls).doesNotContainKeys("showXAxis", "showYAxis");
    else assertThat(controls).containsKeys("showXAxis", "showYAxis");
    if (kind.equals("bar")) assertThat(controls).containsKeys("valuesPosition", "sortingOrder", "hiddenCategories");
    else assertThat(controls).doesNotContainKeys("valuesPosition", "sortingOrder", "hiddenCategories");
    if (radial || Set.of("scatter", "multi-line", "grouped-area", "stacked-area").contains(kind)) {
      assertThat(controls.get("seriesColors")).containsEntry("type", "seriesColors")
          .containsEntry("source", radial ? "category" : "series");
    } else assertThat(controls).doesNotContainKey("seriesColors");
  }

  private static Document descriptor(Document entry) {
    return entry.get("visualizationDescriptor", Document.class);
  }

  private static Document chart(List<Document> entries, String kind) {
    return entries.stream().filter(entry -> kind.equals(descriptor(entry).getString("id"))).findFirst().orElseThrow();
  }

  private static VisualizationCodeGenerator instance(URLClassLoader loader, Document entry) throws Exception {
    return loader.loadClass(entry.getString("implementingClass")).asSubclass(VisualizationCodeGenerator.class)
        .getConstructor().newInstance();
  }

  private static String generate(VisualizationCodeGenerator plot, Map<String, List<?>> rows, Map<String, Object> options)
      throws Exception {
    var source = new OpenLAPDataSet();
    var mappings = new ArrayList<OpenLAPPortMapping>();
    for (var config : plot.getInput().getColumnsConfigurationData()) {
      if (!rows.containsKey(config.getId())) continue;
      var column = new OpenLAPDataColumn<Object>(config.getId(), config.getType(), config.isRequired(),
          config.getTitle(), config.getDescription());
      column.setData(new ArrayList<>(rows.get(config.getId())));
      source.addOpenLAPDataColumn(column);
      mappings.add(new OpenLAPPortMapping(config, config));
    }
    return plot.generateVisualizationCode(source, new OpenLAPPortConfig(mappings), options);
  }
}
