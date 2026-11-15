import com.fasterxml.jackson.databind.ObjectMapper;
import com.openlap.dataset.OpenLAPColumnConfigData;
import com.openlap.dataset.OpenLAPColumnDataType;
import com.openlap.dataset.OpenLAPDataColumn;
import com.openlap.dataset.OpenLAPDataSet;
import com.openlap.dataset.OpenLAPPortConfig;
import com.openlap.dataset.OpenLAPPortMapping;
import com.openlap.template.VisualizationCodeGenerator;
import com.openlap.visualization_methods.utilities.VisualizerClassPathLoader;
import com.openlap.visualization_methods.compatibility.LegacyApexScatter;
import com.openlap.visualization_methods.compatibility.LegacyC3Strings;
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
    if (name.equals("ScatterPlot")) {
      com.google.gson.JsonArray colors = optionArray(code, "colors");
      checks.verify(colors.size() == 4 && colors.get(0).getAsString().equals(custom ? "#102030" : "#008ffb")
          && colors.get(1).getAsString().equals(custom ? "#405060" : "#ff5733"), "Wrong scatter group palette");
    } else {
      checks.verify(compact.contains("colors:" + (custom ? "['#102030','#405060']" : defaultColors)), "Wrong historical color normalization or palette");
    }
    checks.verify(compact.contains("dataLabels:{enabled:" + !custom + ","), "Wrong data-label visibility");
    checks.verify(compact.contains("background:{enabled:" + custom + "}"), "Wrong data-label background");
    if (!circular) {
      checks.verify(compact.contains("xaxis:{labels:{show:" + !custom + "}"), "Wrong X-axis visibility");
      checks.verify(compact.contains("yaxis:{labels:{show:" + !custom + "}"), "Wrong Y-axis visibility");
    }
    if (name.equals("ScatterPlot")) {
      com.google.gson.JsonArray series = optionArray(code, "series");
      checks.verify(series.size() == 4 && series.get(0).getAsJsonObject().get("name").getAsString().equals("point-a")
          && series.get(1).getAsJsonObject().get("name").getAsString().equals("point-b"), "Wrong scatter series names");
      checks.verify(series.get(0).getAsJsonObject().getAsJsonArray("data").get(0).getAsJsonArray().get(0).getAsDouble() == 1
          && series.get(3).getAsJsonObject().getAsJsonArray("data").get(0).getAsJsonArray().get(0).getAsDouble() == 4
          && series.get(3).getAsJsonObject().getAsJsonArray("data").get(0).getAsJsonArray().get(1).getAsDouble() == 5, "Wrong scatter coordinate alignment");
      checks.verify(code.contains("\"type\":\"numeric\""), "Scatter X axis is not numeric");
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

  private static final String UNSAFE_TEXT = "Learner's \"group\" \\ workshop\nnext\u2028\u2029</script><script>bad()</script>";

  private static com.google.gson.JsonArray optionArray(String code, String key) {
    int object = code.indexOf('{', code.indexOf("var options"));
    int depth = 1, arrays = 0;
    char quote = 0;
    for (int i = object + 1; i < code.length(); i++) {
      char c = code.charAt(i);
      if (quote != 0) {
        if (c == '\\') i++;
        else if (c == quote) quote = 0;
        continue;
      }
      if (c == '\'' || c == '"') { quote = c; continue; }
      if (c == '{') depth++;
      else if (c == '}') depth--;
      else if (c == '[') arrays++;
      else if (c == ']') arrays--;
      else if (depth == 1 && arrays == 0 && code.startsWith(key + ":", i)) {
        int start = i + key.length() + 1;
        while (Character.isWhitespace(code.charAt(start))) start++;
        int level = 0;
        char innerQuote = 0;
        for (int end = start; end < code.length(); end++) {
          char value = code.charAt(end);
          if (innerQuote != 0) {
            if (value == '\\') end++;
            else if (value == innerQuote) innerQuote = 0;
          } else if (value == '"' || value == '\'') innerQuote = value;
          else if (value == '[') level++;
          else if (value == ']' && --level == 0) return com.google.gson.JsonParser.parseString(code.substring(start, end + 1)).getAsJsonArray();
        }
      }
    }
    throw new AssertionError("Missing generated option " + key);
  }

  @SuppressWarnings({"rawtypes", "unchecked"})
  private static OpenLAPDataSet snapshot(VisualizationCodeGenerator chart, String scenario) throws Exception {
    boolean clustered = scenario.equals("clustered") || scenario.equals("repeated-x");
    boolean repeated = scenario.equals("repeated-x");
    OpenLAPDataSet source = new OpenLAPDataSet();
    for (OpenLAPColumnConfigData config : chart.getInput().getColumnsConfigurationData()) {
      OpenLAPDataColumn column = new OpenLAPDataColumn(config.getId(), config.getType(), config.isRequired(), config.getTitle(), config.getDescription());
      List<?> values = chart.getInput().getColumns().get(config.getId()).getData();
      if (clustered) {
        if (config.getId().equals("GroupBy")) values = Arrays.asList(repeated ? UNSAFE_TEXT : "Cluster A", repeated ? UNSAFE_TEXT : "Cluster A", "Cluster B", "Cluster C", "Cluster B", "Cluster C");
        else if (config.getId().equals("xAxisStrings")) values = Arrays.asList(10.25, repeated ? 10.25 : 20.5, 30.75, 40.0, 50.125, 60.875);
        else values = Arrays.asList(1,2,3,4,5,6);
      }
      column.setData(new ArrayList(values));
      source.addOpenLAPDataColumn(column);
    }
    return source;
  }

  private static int assertClusters(String scenario, String code, Map<String, Object> settings) {
    Checks checks = new Checks();
    com.google.gson.JsonArray series = optionArray(code, "series");
    checks.verify(series.size() == 3, "Clusters were split or lost");
    double[][] x = {{10.25, scenario.equals("repeated-x") ? 10.25 : 20.5},{30.75,50.125},{40.0,60.875}};
    double[][] y = {{1,2},{3,5},{4,6}};
    int points = 0;
    for (int group = 0; group < 3; group++) {
      com.google.gson.JsonArray values = series.get(group).getAsJsonObject().getAsJsonArray("data");
      checks.verify(values.size() == 2, "A cluster lost paired observations");
      for (int row = 0; row < 2; row++) {
        com.google.gson.JsonArray pair = values.get(row).getAsJsonArray();
        checks.verify(pair.size() == 2, "Scatter coordinate pair changed shape");
        checks.verify(pair.get(0).getAsDouble() == x[group][row], "Scatter X coordinate was lost or changed");
        checks.verify(pair.get(1).getAsDouble() == y[group][row], "Scatter Y coordinate was lost or changed");
        points++;
      }
    }
    checks.verify(points == 6, "Not every observation reached the chart");
    java.util.Set<String> colors = new java.util.HashSet<>();
    for (com.google.gson.JsonElement color : optionArray(code, "colors")) colors.add(color.getAsString());
    checks.verify(colors.size() == 3, "Default cluster colors are not distinct");
    checks.verify(code.contains("\"type\":\"numeric\""), "Scatter axis is categorical");
    if (scenario.equals("repeated-x")) {
      checks.verify(series.get(0).getAsJsonObject().get("name").getAsString().equals(UNSAFE_TEXT), "Original group label was lost or double escaped");
      String json = new com.google.gson.Gson().toJson(UNSAFE_TEXT);
      checks.verify(code.contains(json.substring(1,json.length()-1)), "Unsafe title text was lost or double escaped");
      checks.verify(!code.contains(UNSAFE_TEXT), "Original text reached raw JavaScript or HTML");
      checks.verify(settings.get("chartTitle").equals(UNSAFE_TEXT), "Source parameters were mutated");
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
      for (String scenario : name.equals("Bar") ? new String[]{"defaults", "customized", "filtered"}
          : name.equals("ScatterPlot") ? new String[]{"defaults", "customized", "clustered", "repeated-x"}
          : new String[]{"defaults", "customized"}) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("chart", name);
        result.put("scenario", scenario);
        try (VisualizerClassPathLoader loader = new VisualizerClassPathLoader(jar.toString())) {
          VisualizationCodeGenerator chart = loader.loadTypeClass("openlap.visualizer.Charts." + name);
          require(chart.getClass().getProtectionDomain().getCodeSource().getLocation().toURI().equals(jar.toUri()),
              "Plugin came from an unexpected classpath entry");
          OpenLAPPortConfig mapping = populate(chart);
          Map<String, Object> settings = parameters(scenario.equals("customized") || scenario.equals("filtered"));
          if (scenario.equals("repeated-x")) settings.put("chartTitle", UNSAFE_TEXT);
          if (scenario.equals("filtered")) settings.put("hiddenCategoriesIndexes", "[1]");
          OpenLAPDataSet source = snapshot(chart, scenario);
          LegacyC3Strings.Inputs input = LegacyApexScatter.prepare(chart, source, settings);
          String code = chart.generateVisualizationCode(input.data(), mapping, input.parameters());
          code = LegacyApexScatter.repair(chart, code, source, mapping, settings);
          if (Boolean.getBoolean("probe.include-output")) result.put("generatedCode", code);
          result.put("assertions", scenario.equals("clustered") || scenario.equals("repeated-x") ? assertClusters(scenario, code, settings) : assertOutput(name, scenario, code));
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
