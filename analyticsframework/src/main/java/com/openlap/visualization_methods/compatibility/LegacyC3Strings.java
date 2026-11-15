package com.openlap.visualization_methods.compatibility;

import com.google.gson.Gson;
import com.openlap.dataset.OpenLAPColumnDataType;
import com.openlap.dataset.OpenLAPDataColumn;
import com.openlap.dataset.OpenLAPDataSet;
import com.openlap.exceptions.OpenLAPDataColumnException;
import com.openlap.infrastructure.exception.ValidationException;
import com.openlap.template.VisualizationCodeGenerator;
import java.io.IOException;
import java.math.BigDecimal;
import java.net.URISyntaxException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * The pinned historical C3 generators insert text directly into JavaScript string literals.
 * Escape a private input copy for those exact bytes only; current/other providers keep their
 * own escaping contracts. The original dataset remains suitable for tables and analysis.
 */
public final class LegacyC3Strings {
  private static final String SHA256 = "ba08d00b3a26d7d5e6b127a55b1a965c08dd3e1bfd5da6ef865134f78d380033";
  private static final int JAR_SIZE = 60130;
  private static final Gson JSON = new Gson();
  private static final Set<String> CLASSES = Set.of(
      "openlap.visualizer.C3.Charts.Area", "openlap.visualizer.C3.Charts.Bar",
      "openlap.visualizer.C3.Charts.Donut", "openlap.visualizer.C3.Charts.GroupedArea",
      "openlap.visualizer.C3.Charts.Line", "openlap.visualizer.C3.Charts.MultiLine",
      "openlap.visualizer.C3.Charts.Pie", "openlap.visualizer.C3.Charts.ScatterPlot",
      "openlap.visualizer.C3.Charts.StackedArea");
  private static final Set<String> BOOLEAN_PARAMETERS = Set.of(
      "showLegend", "showXAxis", "showYAxis", "showLabels", "showLabelsBackground");

  private LegacyC3Strings() {}

  /** A plain class also keeps the existing Java-11-source external probe usable. */
  public static final class Inputs {
    private final OpenLAPDataSet data;
    private final Map<String, Object> parameters;

    Inputs(OpenLAPDataSet data, Map<String, Object> parameters) {
      this.data = data;
      this.parameters = parameters;
    }

    public OpenLAPDataSet data() { return data; }
    public Map<String, Object> parameters() { return parameters; }
  }

  public static Inputs prepare(VisualizationCodeGenerator generator, OpenLAPDataSet data,
      Map<String, Object> parameters) {
    return supports(generator) ? copyForLegacy(data, parameters) : new Inputs(data, parameters);
  }

  /** Identity is bound to the loaded code archive, not editable catalog/provider labels. */
  static boolean supports(VisualizationCodeGenerator generator) {
    if (generator == null || !CLASSES.contains(generator.getClass().getName())) return false;
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

  static Inputs copyForLegacy(OpenLAPDataSet source, Map<String, Object> parameters) {
    OpenLAPDataSet copy = new OpenLAPDataSet();
    for (var original : source.getColumns().values()) {
      var config = original.getConfigurationData();
      var column = new OpenLAPDataColumn<Object>(config.getId(), config.getType(), config.isRequired(),
          literal(config.getTitle()), literal(config.getDescription()));
      ArrayList<Object> values = new ArrayList<>();
      for (Object value : original.getData()) {
        if (config.getType() == OpenLAPColumnDataType.Text) {
          values.add(value == null ? null : literal(String.valueOf(value)));
        } else if (config.getType() == OpenLAPColumnDataType.Numeric) {
          // The legacy numeric code path emits values without quotes. Reject nonnumbers instead
          // of letting an incorrectly typed value become executable JavaScript.
          values.add(number(value, "Chart data"));
        } else {
          values.add(value);
        }
      }
      column.setData(values);
      try {
        copy.addOpenLAPDataColumn(column);
      } catch (OpenLAPDataColumnException error) {
        throw invalid("The chart input schema is invalid.");
      }
    }
    Map<String, Object> options = parameters == null ? null : new LinkedHashMap<>();
    if (parameters != null) {
      for (var parameter : parameters.entrySet()) {
        String key = parameter.getKey();
        Object value = parameter.getValue();
        if ("width".equals(key) || "height".equals(key)) {
          Number numeric = number(value, "Chart " + key);
          if (numeric.doubleValue() <= 0 || numeric.doubleValue() > 10000) {
            throw invalid("Chart dimensions must be greater than zero and at most 10000.");
          }
          options.put(key, new BigDecimal(numeric.toString()).stripTrailingZeros().toPlainString());
        } else if (BOOLEAN_PARAMETERS.contains(key)) {
          if (!(value instanceof Boolean) && !"true".equals(value) && !"false".equals(value)) {
            throw invalid("Chart visibility options must be true or false.");
          }
          options.put(key, Boolean.valueOf(value.toString()));
        } else {
          options.put(key, value instanceof String text ? literal(text) : value);
        }
      }
    }
    return new Inputs(copy, options);
  }

  /** JSON's HTML-safe escapes are also valid inside the legacy single-quoted JS literals. */
  static String literal(String text) {
    if (text == null) return null;
    String quoted = JSON.toJson(text);
    return quoted.substring(1, quoted.length() - 1);
  }

  private static Number number(Object value, String name) {
    Number numeric;
    try {
      numeric = value instanceof Number number ? number
          : value instanceof String text ? new BigDecimal(text.trim()) : null;
    } catch (NumberFormatException error) {
      numeric = null;
    }
    if (numeric == null || !Double.isFinite(numeric.doubleValue())) {
      throw invalid(name + " must contain finite numbers.");
    }
    return numeric;
  }

  private static ValidationException invalid(String message) {
    return new ValidationException("INVALID_LEGACY_CHART_INPUT", message);
  }
}
