import com.fasterxml.jackson.databind.ObjectMapper;
import com.openlap.dataset.OpenLAPColumnConfigData;
import com.openlap.dataset.OpenLAPColumnDataType;
import com.openlap.dataset.OpenLAPDataColumn;
import com.openlap.dataset.OpenLAPDataSet;
import com.openlap.dataset.OpenLAPPortConfig;
import com.openlap.dataset.OpenLAPPortMapping;
import com.openlap.template.VisualizationCodeGenerator;
import com.openlap.visualization_methods.utilities.VisualizerClassPathLoader;
import com.openlap.visualization_methods.compatibility.LegacyC3Strings;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Real historical generator calls with synthetic data; never fetches scripts or opens a browser. */
public final class LegacyC3RenderProbe {
  private static final String SHA256 = "ba08d00b3a26d7d5e6b127a55b1a965c08dd3e1bfd5da6ef865134f78d380033";
  private static final String[] CHARTS = {"Area", "Bar", "Donut", "GroupedArea", "Line", "MultiLine", "Pie", "ScatterPlot", "StackedArea"};

  private static String sha256(byte[] bytes) throws Exception {
    StringBuilder text = new StringBuilder();
    for (byte value : MessageDigest.getInstance("SHA-256").digest(bytes)) text.append(String.format("%02x", value & 255));
    return text.toString();
  }

  private static void require(boolean condition, String message) {
    if (!condition) throw new AssertionError(message);
  }

  private static final class Checks {
    int count;
    void verify(boolean condition, String message) { require(condition, message); count++; }
  }

  @SuppressWarnings({"rawtypes", "unchecked"})
  private static OpenLAPPortConfig populate(VisualizationCodeGenerator chart) {
    OpenLAPDataSet input = chart.getInput();
    boolean grouped = input.getColumns().containsKey("GroupBy");
    boolean scatter = grouped && input.getColumns().get("xAxisStrings").getConfigurationData().getType() == OpenLAPColumnDataType.Numeric;
    ArrayList<OpenLAPPortMapping> mapping = new ArrayList<>();
    for (OpenLAPColumnConfigData config : input.getColumnsConfigurationData()) {
      OpenLAPDataColumn column = input.getColumns().get(config.getId());
      List<?> values;
      if ("GroupBy".equals(config.getId())) values = scatter
          ? Arrays.asList("point-a", "point-b", "point-c", "point-d")
          : Arrays.asList("group-a", "group-a", "group-b", "group-b");
      else if (config.getType() == OpenLAPColumnDataType.Numeric) {
        values = "xAxisStrings".equals(config.getId()) ? Arrays.asList(1f, 2f, 1f, 2f) : Arrays.asList(11f, 3f, 7f, 5f);
      } else {
        values = grouped ? Arrays.asList("probe-a", "probe-b", "probe-a", "probe-b")
            : Arrays.asList("probe-a", "probe-b", "probe-c", "probe-d");
      }
      column.setData(new ArrayList(values));
      mapping.add(new OpenLAPPortMapping(config, config));
    }
    return new OpenLAPPortConfig(mapping);
  }

  private static Map<String, Object> parameters(boolean customized) {
    Map<String, Object> parameters = new LinkedHashMap<>();
    if (customized) {
      String[] names = {"width", "height", "yLabel", "showLegend", "legendPosition", "showXAxis", "showYAxis",
          "chartTitle", "chartSubtitle", "titleAndSubTitlePosition", "showLabels", "showLabelsBackground",
          "labelsPosition", "colorsArray", "sortingOrder", "hiddenCategoriesIndexes"};
      String[] values = {"640", "360", "probe-values", "false", "right", "false", "false", "probe-title",
          "probe-subtitle", "center", "false", "true", "top", "[#102030, #405060]", "asc", "[]"};
      for (int i = 0; i < names.length; i++) parameters.put(names[i], values[i]);
    }
    return parameters;
  }

  private static int assertOutput(String name, String scenario, String code) {
    Checks checks = new Checks();
    checks.verify(code != null && code.length() > 100, "Generated code is empty or implausibly short");
    String compact = code.replaceAll("\\s+", "");
    checks.verify(compact.contains("c3.generate({"), "Missing C3 generator call");
    java.util.regex.Matcher id = java.util.regex.Pattern.compile("<divid='(chartdiv_[0-9]+)'></div>").matcher(compact);
    checks.verify(id.find(), "Missing generated chart element");
    checks.verify(compact.contains("bindto:'#" + id.group(1) + "'"), "C3 is not bound to its chart element");
    checks.verify(compact.endsWith("</script>"), "Incomplete generated script");
    String type = name.equals("Area") || name.equals("GroupedArea") || name.equals("StackedArea") ? "area-spline"
        : name.equals("Line") || name.equals("MultiLine") ? "spline"
        : name.equals("ScatterPlot") ? "scatter" : name.toLowerCase(java.util.Locale.ROOT);
    checks.verify(compact.contains("type:'" + type + "'"), "Wrong C3 chart type");
    boolean custom = !scenario.equals("defaults");
    checks.verify(java.util.regex.Pattern.compile("varwidth_[0-9]+=" + (custom ? "640" : "500") + ";").matcher(compact).find(), "Wrong width");
    checks.verify(java.util.regex.Pattern.compile("varheight_[0-9]+=" + (custom ? "360" : "500") + ";").matcher(compact).find(), "Wrong height");
    checks.verify(compact.contains("title:{text:'" + (custom ? "probe-title" : "") + "',position:'" + (custom ? "top-center" : "top-left") + "'}"), "Wrong title or title placement");
    checks.verify(compact.contains("legend:{show:" + !custom + ",position:'" + (custom ? "right" : "bottom") + "'}"), "Wrong legend options");
    checks.verify(compact.contains(custom ? "pattern:['#102030','#405060']" : "pattern:['#008ffb'"), "Wrong color normalization");
    boolean circular = name.equals("Pie") || name.equals("Donut");
    checks.verify(compact.contains((circular ? "label:{show:" : "labels:") + !custom), "Wrong data-label visibility");
    if (!circular) {
      checks.verify(compact.contains("x:{show:" + !custom), "Wrong X-axis visibility");
      checks.verify(compact.contains("y:{show:" + !custom), "Wrong Y-axis visibility");
    }
    if (name.equals("ScatterPlot")) {
      checks.verify(compact.contains("'point-a':'point-a_x'") && compact.contains("'point-d':'point-d_x'"), "Missing scatter X/series mappings");
      checks.verify(compact.contains("['point-a_x',1.0]") && compact.contains("['point-d_x',2.0]"), "Wrong scatter X values");
      checks.verify(compact.contains("['point-a',11.0]") && compact.contains("['point-d',5.0]"), "Wrong scatter Y values");
    } else if (name.equals("GroupedArea") || name.equals("MultiLine") || name.equals("StackedArea")) {
      checks.verify(compact.contains("['group-a','group-b']"), "Missing grouped series");
      checks.verify(compact.contains("[11.0,7.0]") && compact.contains("[3.0,5.0]"), "Wrong grouped series data");
      checks.verify(compact.contains("categories:['probe-a','probe-b']"), "Wrong grouped categories");
      checks.verify(compact.contains("groups:[['group-a','group-b']]") == name.equals("StackedArea"), "Wrong stacking configuration");
    } else if (circular) {
      checks.verify(compact.contains("['probe-a',11.0]") && compact.contains("['probe-d',5.0]"), "Wrong slice labels or values");
    } else {
      String values = name.equals("Bar") && custom ? (scenario.equals("filtered") ? "3.0,7.0,11.0" : "3.0,5.0,7.0,11.0") : "11.0,3.0,7.0,5.0";
      checks.verify(compact.contains("['data1'," + values + "]"), "Wrong values or Bar sort/filter result");
      String categories = name.equals("Bar") && custom ? (scenario.equals("filtered") ? "'probe-b','probe-c','probe-a'" : "'probe-b','probe-d','probe-c','probe-a'") : "'probe-a','probe-b','probe-c','probe-d'";
      checks.verify(compact.contains("categories:[" + categories + "]"), "Wrong categories or Bar sort/filter alignment");
    }
    return checks.count;
  }

  private static final String UNSAFE_TEXT = "Learner's \"access\" \\ workshop\nnext\rline\u2028separator\u2029</script><script>bad()</script>";

  @SuppressWarnings({"rawtypes", "unchecked"})
  private static OpenLAPDataSet snapshotInput(VisualizationCodeGenerator chart, boolean escaped) throws Exception {
    OpenLAPDataSet result = new OpenLAPDataSet();
    for (OpenLAPColumnConfigData config : chart.getInput().getColumnsConfigurationData()) {
      OpenLAPDataColumn original = chart.getInput().getColumns().get(config.getId());
      OpenLAPDataColumn copy = new OpenLAPDataColumn(config.getId(), config.getType(), config.isRequired(), config.getTitle(), config.getDescription());
      ArrayList values = new ArrayList();
      for (Object value : original.getData()) {
        values.add(escaped && config.getType() == OpenLAPColumnDataType.Text ? value.toString() + " " + UNSAFE_TEXT : value);
      }
      copy.setData(values);
      result.addOpenLAPDataColumn(copy);
    }
    return result;
  }

  private static String encoded(String value) {
    String json = new com.google.gson.Gson().toJson(value);
    return json.substring(1, json.length() - 1);
  }

  private static int occurrences(String value, String needle) {
    int count = 0;
    for (int offset = 0; (offset = value.indexOf(needle, offset)) >= 0; offset += needle.length()) count++;
    return count;
  }

  private static int assertEscapedOutput(String code, OpenLAPDataSet source,
      Map<String, Object> settings, LegacyC3Strings.Inputs prepared) {
    Checks checks = new Checks();
    checks.verify(prepared.data() != source, "Known historical archive did not receive the compatibility adapter");
    checks.verify(prepared.parameters() != settings, "Adapter reused mutable customization settings");
    checks.verify(code.contains("c3.generate({"), "Missing real C3 generator call");
    checks.verify(occurrences(code, "<script") == 1, "Text opened an extra script element");
    checks.verify(occurrences(code, "</script>") == 1, "Text closed the script element");
    checks.verify(!code.contains(UNSAFE_TEXT), "Unescaped original text reached generated HTML");
    checks.verify(code.contains(encoded("probe-title " + UNSAFE_TEXT)), "Custom title was lost or double escaped");
    checks.verify(code.contains("\\u0027"), "Apostrophe was not encoded");
    checks.verify(code.contains("\\\"access\\\""), "Double quotes were lost or double escaped");
    checks.verify(code.contains("\\\\ workshop"), "Backslash was lost or double escaped");
    checks.verify(code.contains("\\nnext"), "Newline was not encoded");
    checks.verify(code.contains("\\rline"), "Carriage return was not encoded");
    checks.verify(code.contains("\\u2028separator"), "Unicode line separator was not encoded");
    checks.verify(code.contains("\\u2029\\u003c/script\\u003e"), "Unicode paragraph separator or HTML delimiter was not encoded");
    boolean dataTextRetained = false;
    for (OpenLAPColumnConfigData config : source.getColumnsConfigurationData()) {
      if (config.getType() != OpenLAPColumnDataType.Text) continue;
      String original = source.getColumns().get(config.getId()).getData().get(0).toString();
      checks.verify(original.endsWith(UNSAFE_TEXT), "Source labels were mutated by rendering");
      if (code.contains(encoded(original))) dataTextRetained = true;
    }
    checks.verify(dataTextRetained, "Data labels were lost or double escaped");
    checks.verify(settings.get("chartTitle").equals("probe-title " + UNSAFE_TEXT), "Source customization was mutated");
    return checks.count;
  }

  public static void main(String[] args) throws Exception {
    String jar = args[0];
    require(SHA256.equals(sha256(Files.readAllBytes(Path.of(jar)))), "Historical C3 digest mismatch");
    List<Map<String, Object>> results = new ArrayList<>();
    int passed = 0;
    for (String name : CHARTS) {
      for (String scenario : name.equals("Bar") ? new String[]{"defaults", "customized", "filtered", "escaped"} : new String[]{"defaults", "customized", "escaped"}) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("chart", name);
        result.put("scenario", scenario);
        try (VisualizerClassPathLoader loader = new VisualizerClassPathLoader(jar)) {
          VisualizationCodeGenerator chart = loader.loadTypeClass("openlap.visualizer.C3.Charts." + name);
          require(chart.getClass().getProtectionDomain().getCodeSource().getLocation().toURI().equals(Path.of(jar).toUri()),
              "Plugin came from an unexpected classpath entry");
          OpenLAPPortConfig mapping = populate(chart);
          Map<String, Object> settings = parameters(!scenario.equals("defaults"));
          if (scenario.equals("filtered")) settings.put("hiddenCategoriesIndexes", "[1]");
          boolean escaped = scenario.equals("escaped");
          OpenLAPDataSet input = snapshotInput(chart, escaped);
          if (escaped) settings.put("chartTitle", "probe-title " + UNSAFE_TEXT);
          LegacyC3Strings.Inputs prepared = LegacyC3Strings.prepare(chart, input, settings);
          String code = chart.generateVisualizationCode(prepared.data(), mapping, prepared.parameters());
          result.put("assertions", escaped ? assertEscapedOutput(code, input, settings, prepared) : assertOutput(name, scenario, code));
          result.put("status", "PASS");
          result.put("characters", code.length());
          result.put("sha256", sha256(code.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
          if (Boolean.getBoolean("probe.include-output")) result.put("generatedCode", code);
          passed++;
        } catch (Throwable error) {
          result.put("status", "FAIL");
          result.put("error", error.getClass().getName());
          result.put("message", error.getMessage());
          if (error.getCause() != null) {
            result.put("cause", error.getCause().getClass().getName());
            result.put("causeMessage", error.getCause().getMessage());
          }
        }
        results.add(result);
      }
    }
    Map<String, Object> report = new LinkedHashMap<>();
    report.put("historicalSha256", SHA256);
    report.put("passed", passed);
    report.put("total", results.size());
    report.put("results", results);
    System.out.println("C3_RENDER_RESULT=" + new ObjectMapper().writeValueAsString(report));
    if (passed != results.size()) System.exit(1);
  }
}
