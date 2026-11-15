package com.openlap.visualization_methods.compatibility;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.google.gson.Gson;
import com.openlap.dataset.*;
import com.openlap.template.VisualizationCodeGenerator;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class LegacyApexScatterTest {
  @Test
  void sixPairedObservationsAndRepeatedXValuesSurviveInsideThreeClusters() throws Exception {
    var scatter = LegacyC3Scatter.data(dataset("A"), mapping(), Map.of());
    var series = LegacyApexScatter.series(scatter);
    assertThat(series).hasSize(3);
    assertThat(series.get(0)).containsEntry("name", "A")
        .containsEntry("data", List.of(List.of(10.25, 1), List.of(10.25, 2)));
    assertThat(series.get(1)).containsEntry("data", List.of(List.of(30.75, 3), List.of(50.125, 5)));
    assertThat(series.get(2)).containsEntry("data", List.of(List.of(40.0, 4), List.of(60.875, 6)));
  }

  @Test
  void originalUnsafeNamesAreEncodedOnceAsJsonAndRemainOriginalDisplayText() throws Exception {
    String label = "Learner's \"group\" \\ workshop\n</script>\u2028\u2029";
    var series = LegacyApexScatter.series(LegacyC3Scatter.data(dataset(label), mapping(), Map.of()));
    String json = new Gson().toJson(series);
    assertThat(json).doesNotContain("</script>", "\u2028", "\u2029");
    assertThat(json).contains("\\u003c/script\\u003e", "\\u0027");
    @SuppressWarnings("unchecked") var recovered = (List<Map<String, Object>>) new Gson().fromJson(json, List.class);
    assertThat(recovered.get(0).get("name")).isEqualTo(label);
  }

  @Test
  void scopedOptionEditsPreserveOtherOptionsAndForceARealNumericXAxis() {
    String original = "<script>var options = {chart:{type:'scatter'},series:[{name:'fake colors: []',data:[[1,2]]}],colors:['blue'],title:{text:'keep series: []'},xaxis:{min:10,max:100,labels:{show:false}},yaxis:{min:1,max:8}};render(options);</script>";
    String edited = LegacyChartOptions.replace(original, "var options", "series", List.of(Map.of("name", "A", "data", List.of(List.of(1, 2), List.of(1, 3)))));
    edited = LegacyChartOptions.replace(edited, "var options", "colors", List.of("#102030"));
    edited = LegacyChartOptions.append(edited, "var options", List.of("xaxis"), "type", "numeric");
    assertThat(edited).contains("title:{text:'keep series: []'}", "min:10,max:100,labels:{show:false},\"type\":\"numeric\"", "yaxis:{min:1,max:8}");
    assertThat(edited).contains("\"data\":[[1,2],[1,3]]", "colors:[\"#102030\"]");
  }

  @Test
  void c3NumericAxisEditPreservesCustomBoundsLabelsAndVisibility() {
    String source = "<script>c3.generate({data:{},axis:{x:{min:1,max:99,label:'Own label',show:false},y:{show:true}}});</script>";
    String result = LegacyChartOptions.append(source, "c3.generate(", List.of("axis", "x"), "type", "indexed");
    assertThat(result).contains("x:{min:1,max:99,label:'Own label',show:false,\"type\":\"indexed\"}", "y:{show:true}");
  }

  @Test
  void unknownProvidersKeepTheirOwnEscapingAndOptions() throws Exception {
    var generator = mock(VisualizationCodeGenerator.class);
    var source = dataset("A ' name");
    Map<String, Object> options = Map.of("chartTitle", "Original provider's title");
    var inputs = LegacyApexScatter.prepare(generator, source, options);
    assertThat(inputs.data()).isSameAs(source);
    assertThat(inputs.parameters()).isSameAs(options);
    String code = "Unknown provider output";
    assertThat(LegacyApexScatter.repair(generator, code, source, mapping(), options)).isSameAs(code);
    verifyNoInteractions(generator);
  }

  private static OpenLAPDataSet dataset(String firstGroup) throws Exception {
    var result = new OpenLAPDataSet();
    add(result, "x", OpenLAPColumnDataType.Numeric, List.of(10.25, 10.25, 30.75, 40.0, 50.125, 60.875));
    add(result, "y", OpenLAPColumnDataType.Numeric, List.of(1, 2, 3, 4, 5, 6));
    add(result, "group", OpenLAPColumnDataType.Text, List.of(firstGroup, firstGroup, "B", "C", "B", "C"));
    return result;
  }

  private static void add(OpenLAPDataSet data, String id, OpenLAPColumnDataType type, List<?> values) throws Exception {
    var column = new OpenLAPDataColumn<Object>(id, type, true, id, "");
    column.setData(new ArrayList<>(values));
    data.addOpenLAPDataColumn(column);
  }

  private static OpenLAPPortConfig mapping() {
    var values = new ArrayList<OpenLAPPortMapping>();
    for (String[] entry : List.of(new String[]{"x","xAxisStrings"}, new String[]{"y","yAxisValues"}, new String[]{"group","GroupBy"})) {
      var type = entry[0].equals("group") ? OpenLAPColumnDataType.Text : OpenLAPColumnDataType.Numeric;
      values.add(new OpenLAPPortMapping(new OpenLAPColumnConfigData(entry[0], type, true, entry[0], ""),
          new OpenLAPColumnConfigData(entry[1], type, true, entry[1], "")));
    }
    return new OpenLAPPortConfig(values);
  }
}
