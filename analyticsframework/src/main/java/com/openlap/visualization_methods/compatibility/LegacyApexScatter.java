package com.openlap.visualization_methods.compatibility;

import com.openlap.dataset.OpenLAPDataSet;
import com.openlap.dataset.OpenLAPPortConfig;
import com.openlap.template.VisualizationCodeGenerator;
import java.io.IOException;
import java.net.URISyntaxException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Preserve all paired observations for each group in the pinned historical Apex scatter. */
public final class LegacyApexScatter {
  private static final String CLASS = "openlap.visualizer.Charts.ScatterPlot";
  private static final String SHA256 = "46615516ff62cfc7c7978acf9a4385d9f3f31490265877408d9dc674bbe11029";
  private static final int JAR_SIZE = 7258904;

  private LegacyApexScatter() {}

  public static LegacyC3Strings.Inputs prepare(VisualizationCodeGenerator generator,
      OpenLAPDataSet data, Map<String, Object> parameters) {
    // This exact generator also uses raw JS literal concatenation; no other Apex class is changed.
    return supports(generator) ? LegacyC3Strings.copyForLegacy(data, parameters)
        : new LegacyC3Strings.Inputs(data, parameters);
  }

  public static String repair(VisualizationCodeGenerator generator, String code,
      OpenLAPDataSet original, OpenLAPPortConfig mapping, Map<String, Object> parameters) {
    if (!supports(generator)) return code;
    Map<String, Object> scatter = LegacyC3Scatter.data(original, mapping, parameters);
    String fixed = LegacyChartOptions.replace(code, "var options", "series", series(scatter));
    @SuppressWarnings("unchecked") Map<String, String> colors = (Map<String, String>) scatter.get("colors");
    fixed = LegacyChartOptions.replace(fixed, "var options", "colors", new ArrayList<>(colors.values()));
    return LegacyChartOptions.append(fixed, "var options", List.of("xaxis"), "type", "numeric");
  }

  @SuppressWarnings("unchecked")
  static List<Map<String, Object>> series(Map<String, Object> scatter) {
    Map<String, String> xs = (Map<String, String>) scatter.get("xs");
    Map<String, String> names = (Map<String, String>) scatter.get("names");
    Map<String, List<Object>> columns = new LinkedHashMap<>();
    for (List<Object> column : (List<List<Object>>) scatter.get("columns")) {
      columns.put(column.get(0).toString(), column.subList(1, column.size()));
    }
    List<Map<String, Object>> series = new ArrayList<>();
    for (var entry : xs.entrySet()) {
      List<Object> x = columns.get(entry.getValue());
      List<Object> y = columns.get(entry.getKey());
      List<List<Object>> points = new ArrayList<>();
      for (int row = 0; row < x.size(); row++) points.add(List.of(x.get(row), y.get(row)));
      Map<String, Object> item = new LinkedHashMap<>();
      item.put("name", names.get(entry.getKey()));
      item.put("data", points);
      series.add(item);
    }
    return series;
  }

  private static boolean supports(VisualizationCodeGenerator generator) {
    if (generator == null || !CLASS.equals(generator.getClass().getName())) return false;
    try {
      var source = generator.getClass().getProtectionDomain().getCodeSource();
      if (source == null || !"file".equalsIgnoreCase(source.getLocation().getProtocol())) return false;
      Path path = Path.of(source.getLocation().toURI());
      if (!Files.isRegularFile(path, LinkOption.NOFOLLOW_LINKS) || Files.size(path) != JAR_SIZE) return false;
      byte[] bytes;
      try (var input = Files.newInputStream(path, LinkOption.NOFOLLOW_LINKS)) {
        bytes = input.readNBytes(JAR_SIZE + 1);
      }
      return bytes.length == JAR_SIZE && SHA256.equals(HexFormat.of().formatHex(
          MessageDigest.getInstance("SHA-256").digest(bytes)));
    } catch (IOException | URISyntaxException | IllegalArgumentException | SecurityException error) {
      return false;
    } catch (NoSuchAlgorithmException impossible) {
      throw new IllegalStateException(impossible);
    }
  }
}
