package com.openlap.visualization_methods.compatibility;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.google.gson.Gson;
import com.openlap.dataset.*;
import com.openlap.infrastructure.exception.ValidationException;
import com.openlap.template.VisualizationCodeGenerator;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class LegacyC3ScatterTest {
  @Test
  void allSixObservationsRemainPairedInsideThreeRealClusters() throws Exception {
    var data = dataset(List.of("Cluster A", "Cluster A", "Cluster B", "Cluster C", "Cluster B", "Cluster C"));
    var result = LegacyC3Scatter.data(data, mapping(), Map.of());
    @SuppressWarnings("unchecked") var columns = (List<List<Object>>) result.get("columns");
    assertThat(columns).containsExactly(
        List.of("series_0_x", 10.25, 20.5), List.of("series_0", 1, 2),
        List.of("series_1_x", 30.75, 50.125), List.of("series_1", 3, 5),
        List.of("series_2_x", 40.0, 60.875), List.of("series_2", 4, 6));
    assertThat(result.get("names")).isEqualTo(Map.of("series_0", "Cluster A", "series_1", "Cluster B", "series_2", "Cluster C"));
    @SuppressWarnings("unchecked") var colors = (Map<String, String>) result.get("colors");
    assertThat(colors).hasSize(3);
    assertThat(colors.values()).doesNotHaveDuplicates();
    assertThat(data.getColumns().get("x").getData()).containsExactly(10.25, 20.5, 30.75, 40.0, 50.125, 60.875);
  }

  @Test
  void repeatedCoordinatesAreNotDeduplicatedAndSeriesNamesCannotCollideWithXIds() throws Exception {
    var source = dataset(List.of("a", "a_x", "a", "a_x", "a", "a_x"));
    source.getColumns().get("x").getData().set(2, 10.25);
    source.getColumns().get("y").getData().set(2, 1);
    var result = LegacyC3Scatter.data(source, mapping(), Map.of());
    @SuppressWarnings("unchecked") var columns = (List<List<Object>>) result.get("columns");
    assertThat(columns).hasSize(4);
    assertThat(columns.stream().map(column -> column.get(0)).toList()).doesNotHaveDuplicates();
    assertThat(columns.get(1)).hasSize(4);
    assertThat(columns.get(3)).hasSize(4);
    assertThat(columns.get(0)).containsExactly("series_0_x", 10.25, 10.25, 50.125);
    assertThat(columns.get(1)).containsExactly("series_0", 1, 1, 5);
  }

  @Test
  void customPaletteAndDataLabelVisibilityAreRetained() throws Exception {
    var result = LegacyC3Scatter.data(dataset(List.of("A", "A", "B", "C", "B", "C")), mapping(),
        Map.of("colorsArray", "[#102030,#405060,#708090]", "showLabels", false));
    assertThat(result.get("colors")).isEqualTo(Map.of("series_0", "#102030", "series_1", "#405060", "series_2", "#708090"));
    assertThat(result.get("labels")).isEqualTo(false);
  }

  @Test
  void repairsOnlyTheDataObjectAndUsesHtmlSafeOriginalNames() throws Exception {
    String label = "Cluster's \"name\" \\ next\n\u2028\u2029</script>";
    var options = LegacyC3Scatter.data(dataset(List.of(label, label, "B", "C", "B", "C")), mapping(), Map.of());
    String before = "<script>c3.generate({legend:{position:'data: {fake}'},data:{xs:{'a':'a_x'},columns:[],type:'scatter'},title:{text:'keep data: {}'},axis:{x:{label:'X'}}});</script>";
    String result = LegacyC3Scatter.replaceData(before, options);
    assertThat(result).startsWith("<script>c3.generate({legend:{position:'data: {fake}'},data:")
        .endsWith(",title:{text:'keep data: {}'},axis:{x:{label:'X'}}});</script>");
    assertThat(result).contains("\\u003c/script\\u003e", "\\u0027", "\\u2028", "\\u2029");
    assertThat(result).doesNotContain(label);
    String json = new Gson().toJson(options);
    assertThat(new Gson().fromJson(json, Map.class).get("names")).isEqualTo(options.get("names"));
  }

  @Test
  void malformedCoordinatesAndMissingGroupLabelsDoNotBecomePartialCharts() throws Exception {
    var source = dataset(List.of("A", "A", "B", "C", "B", "C"));
    source.getColumns().get("x").getData().remove(0);
    var shortData = source;
    assertThatThrownBy(() -> LegacyC3Scatter.data(shortData, mapping(), Map.of()))
        .isInstanceOf(ValidationException.class).hasMessageContaining("equal");
    source = dataset(List.of("A", "A", "B", "C", "B", "C"));
    source.getColumns().get("x").getData().set(0, Double.NaN);
    var invalid = source;
    assertThatThrownBy(() -> LegacyC3Scatter.data(invalid, mapping(), Map.of()))
        .isInstanceOf(ValidationException.class).hasMessageContaining("finite");
  }

  @Test
  void unsupportedCodeStructureFailsExplicitlyAndOtherProvidersAreUnchanged() throws Exception {
    assertThatThrownBy(() -> LegacyC3Scatter.replaceData("<script>different({});</script>", Map.of()))
        .isInstanceOf(ValidationException.class);
    var generator = mock(VisualizationCodeGenerator.class);
    String code = "Apex keeps its own original output";
    assertThat(LegacyC3Scatter.repair(generator, code, dataset(List.of("A", "A", "B", "C", "B", "C")), mapping(), Map.of())).isSameAs(code);
    verifyNoInteractions(generator);
  }

  private static OpenLAPDataSet dataset(List<String> groups) throws Exception {
    var result = new OpenLAPDataSet();
    add(result, "x", OpenLAPColumnDataType.Numeric, List.of(10.25, 20.5, 30.75, 40.0, 50.125, 60.875));
    add(result, "y", OpenLAPColumnDataType.Numeric, List.of(1, 2, 3, 4, 5, 6));
    add(result, "group", OpenLAPColumnDataType.Text, groups);
    return result;
  }

  private static void add(OpenLAPDataSet data, String id, OpenLAPColumnDataType type, List<?> values) throws Exception {
    var column = new OpenLAPDataColumn<Object>(id, type, true, id, "");
    column.setData(new ArrayList<>(values));
    data.addOpenLAPDataColumn(column);
  }

  private static OpenLAPPortConfig mapping() {
    var ports = new ArrayList<OpenLAPPortMapping>();
    ports.add(port("x", "xAxisStrings", OpenLAPColumnDataType.Numeric));
    ports.add(port("y", "yAxisValues", OpenLAPColumnDataType.Numeric));
    ports.add(port("group", "GroupBy", OpenLAPColumnDataType.Text));
    return new OpenLAPPortConfig(ports);
  }

  private static OpenLAPPortMapping port(String output, String input, OpenLAPColumnDataType type) {
    return new OpenLAPPortMapping(new OpenLAPColumnConfigData(output, type, true, output, ""),
        new OpenLAPColumnConfigData(input, type, true, input, ""));
  }
}
