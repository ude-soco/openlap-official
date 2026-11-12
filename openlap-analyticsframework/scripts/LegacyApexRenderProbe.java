import com.fasterxml.jackson.databind.ObjectMapper;
import com.openlap.dataset.OpenLAPColumnConfigData;
import com.openlap.dataset.OpenLAPColumnDataType;
import com.openlap.dataset.OpenLAPDataColumn;
import com.openlap.dataset.OpenLAPDataSet;
import com.openlap.dataset.OpenLAPPortConfig;
import com.openlap.dataset.OpenLAPPortMapping;
import com.openlap.template.VisualizationCodeGenerator;
import com.openlap.visualization_methods.utilities.VisualizerClassPathLoader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Calls the pinned historical Apex generators with synthetic data; never renders or fetches JS. */
public final class LegacyApexRenderProbe {
  private static final String SHA256 = "46615516ff62cfc7c7978acf9a4385d9f3f31490265877408d9dc674bbe11029";
  private static final long SIZE_BYTES = 7258904;
  private static final String[] CHARTS = {"Area", "Bar", "Donut", "Line", "Pie", "ScatterPlot"};

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
    ArrayList<OpenLAPPortMapping> mapping = new ArrayList<>();
    for (OpenLAPColumnConfigData config : input.getColumnsConfigurationData()) {
      OpenLAPDataColumn column = input.getColumns().get(config.getId());
      List<?> values;
      if ("GroupBy".equals(config.getId())) values = Arrays.asList("point-a", "point-b", "point-c", "point-d");
      else if (config.getType() == OpenLAPColumnDataType.Numeric) {
        values = "xAxisStrings".equals(config.getId()) ? Arrays.asList(1f, 2f, 3f, 4f) : Arrays.asList(11f, 3f, 7f, 5f);
      } else values = Arrays.asList("probe-a", "probe-b", "probe-c", "probe-d");
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
    checks.verify(compact.startsWith("<divid=\"chart\"></div><script>"), "Missing generated chart element");
    checks.verify(compact.contains("varoptions={"), "Missing Apex options");
    checks.verify(compact.contains("newApexCharts(document.querySelector(\"#chart\"),options)"), "Apex is not bound to its chart element");
    checks.verify(compact.endsWith("chart.render();</script>"), "Incomplete generated script");
    String type = name.equals("ScatterPlot") ? "scatter" : name.toLowerCase(java.util.Locale.ROOT);
    checks.verify(compact.contains("type:'" + type + "'"), "Wrong Apex chart type");
    boolean custom = !scenario.equals("defaults");
    boolean circular = name.equals("Pie") || name.equals("Donut");
    checks.verify(compact.contains("height:" + (custom ? "360" : "500") + ","), "Wrong height");
    checks.verify(compact.contains("width:" + (custom ? "640" : "500") + "}" )
        || compact.contains("width:" + (custom ? "640" : "500") + ","), "Wrong width");
    String placement = custom ? "center" : "left";
    checks.verify(compact.contains("title:{text:'" + (custom ? "probe-title" : "") + "',align:'" + placement + "',style:{fontSize:18}}"), "Wrong title or title placement");
    checks.verify(compact.contains("subtitle:{text:'" + (custom ? "probe-subtitle" : "") + "',align:'" + placement + "'}"), "Wrong subtitle or subtitle placement");
    checks.verify(compact.contains("legend:{showForSingleSeries:true,show:" + !custom + ",position:'" + (custom ? "right" : "bottom") + "'}"), "Wrong legend options");
    String defaultColors = circular
        ? "['#008ffb','#ff5733','#3498db','#2ecc71','#9b59b6','#f1c40f','#e74c3c','#1abc9c','#34495e','#d35400','#95a5a6']"
        : "['#008ffb']";
    checks.verify(compact.contains("colors:" + (custom ? "['#102030','#405060']" : defaultColors)), "Wrong historical color normalization or palette");
    checks.verify(compact.contains("dataLabels:{enabled:" + !custom + ","), "Wrong data-label visibility");
    checks.verify(compact.contains("background:{enabled:" + custom + "}"), "Wrong data-label background");
    if (!circular) {
      checks.verify(compact.contains("xaxis:{labels:{show:" + !custom + "}"), "Wrong X-axis visibility");
      checks.verify(compact.contains("yaxis:{labels:{show:" + !custom + "}"), "Wrong Y-axis visibility");
    }
    if (name.equals("ScatterPlot")) {
      checks.verify(compact.contains("name:\"point-a\",data:[[1.0,11.0]]")
          && compact.contains("name:\"point-b\",data:[[2.0,3.0]]"), "Wrong first scatter series or X/Y alignment");
      checks.verify(compact.contains("name:\"point-c\",data:[[3.0,7.0]]")
          && compact.contains("name:\"point-d\",data:[[4.0,5.0]]"), "Wrong remaining scatter series or X/Y alignment");
    } else if (circular) {
      checks.verify(compact.contains("series:[11.0,3.0,7.0,5.0]"), "Wrong slice values");
      String quote = name.equals("Donut") ? "\"" : "'";
      checks.verify(compact.contains("labels:[" + quote + "probe-a" + quote + "," + quote + "probe-b" + quote
          + "," + quote + "probe-c" + quote + "," + quote + "probe-d" + quote + "]"), "Wrong slice labels or ordering");
    } else {
      checks.verify(compact.contains("series:[{name:'" + (custom ? "probe-values" : "Value") + "',data:"), "Wrong Y-series label");
      // Historical Apex reverses existing Bar row order for 'asc'; it does not numerically sort.
      String values = name.equals("Bar") && custom ? (scenario.equals("filtered") ? "5.0,7.0,11.0" : "5.0,7.0,3.0,11.0") : "11.0,3.0,7.0,5.0";
      checks.verify(compact.contains("data:[" + values + "]"), "Wrong values or historical Bar sort/filter behavior");
      String categories = name.equals("Bar") && custom ? (scenario.equals("filtered") ? "'probe-d','probe-c','probe-a'" : "'probe-d','probe-c','probe-b','probe-a'") : "'probe-a','probe-b','probe-c','probe-d'";
      checks.verify(compact.contains("categories:[" + categories + "]"), "Wrong categories or Bar sort/filter alignment");
      if (name.equals("Bar")) checks.verify(compact.contains("plotOptions:{bar:{dataLabels:{position:'" + (custom ? "top" : "bottom") + "'}}}"), "Wrong Bar label placement");
    }
    return checks.count;
  }

  public static void main(String[] args) throws Exception {
    Path jar = Path.of(args[0]);
    require(Files.size(jar) == SIZE_BYTES, "Historical Apex size mismatch");
    require(SHA256.equals(sha256(Files.readAllBytes(jar))), "Historical Apex digest mismatch");
    List<Map<String, Object>> results = new ArrayList<>();
    int passed = 0;
    for (String name : CHARTS) {
      for (String scenario : name.equals("Bar") ? new String[]{"defaults", "customized", "filtered"} : new String[]{"defaults", "customized"}) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("chart", name);
        result.put("scenario", scenario);
        try (VisualizerClassPathLoader loader = new VisualizerClassPathLoader(jar.toString())) {
          VisualizationCodeGenerator chart = loader.loadTypeClass("openlap.visualizer.Charts." + name);
          require(chart.getClass().getProtectionDomain().getCodeSource().getLocation().toURI().equals(jar.toUri()),
              "Plugin came from an unexpected classpath entry");
          OpenLAPPortConfig mapping = populate(chart);
          Map<String, Object> settings = parameters(!scenario.equals("defaults"));
          if (scenario.equals("filtered")) settings.put("hiddenCategoriesIndexes", "[1]");
          String code = chart.generateVisualizationCode(chart.getInput(), mapping, settings);
          if (Boolean.getBoolean("probe.include-output")) result.put("generatedCode", code);
          result.put("assertions", assertOutput(name, scenario, code));
          result.put("status", "PASS");
          result.put("characters", code.length());
          result.put("sha256", sha256(code.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
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
    System.out.println("APEX_RENDER_RESULT=" + new ObjectMapper().writeValueAsString(report));
    if (passed != results.size()) System.exit(1);
  }
}
