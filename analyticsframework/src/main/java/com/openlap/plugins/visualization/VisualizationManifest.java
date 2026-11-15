package com.openlap.plugins.visualization;

import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.core.StreamReadConstraints;
import com.fasterxml.jackson.core.StreamReadFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.openlap.infrastructure.exception.ValidationException;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.*;
import java.util.jar.JarEntry;
import java.util.jar.JarFile;
import org.bson.Document;

/** Optional, statically inspected browser contract. Reading this never initializes plugin classes. */
public final class VisualizationManifest {
  public static final String RESOURCE = "META-INF/openlap/visualization.json";
  private static final int MAX_MANIFEST = 128 * 1024;
  private static final int MAX_ASSET = 8 * 1024 * 1024;
  private static final ObjectMapper JSON = new ObjectMapper(JsonFactory.builder()
      .streamReadConstraints(StreamReadConstraints.builder().maxNestingDepth(20).maxStringLength(20000).build())
      .enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION).build());
  private final Document document;

  private VisualizationManifest(Document document) { this.document = document; }

  public static VisualizationManifest read(Path path, List<String> discoveredClasses) {
    try (JarFile jar = new JarFile(path.toFile(), true)) {
      JarEntry entry = jar.getJarEntry(RESOURCE);
      if (entry == null) return null; // Existing compiled plugins retain their legacy contract.
      Object parsed = JSON.readValue(readBytes(jar, entry, MAX_MANIFEST), Object.class);
      if (!(parsed instanceof Map)) throw invalid("The visualization manifest must be an object.");
      Document document = Document.parse(JSON.writeValueAsString(parsed));
      fields(document, "schemaVersion", "pluginId", "pluginVersion", "assets", "runtimes", "charts");
      if (!(document.get("schemaVersion") instanceof Number) ||
          ((Number)document.get("schemaVersion")).doubleValue() != 1.0)
        throw invalid("Unsupported visualization manifest version.");
      document.put("schemaVersion", 1);
      id(document, "pluginId"); text(document, "pluginVersion", 100, true);
      List<Document> assets = objects(document, "assets", 64, true);
      List<Document> runtimes = objects(document, "runtimes", 16, true);
      List<Document> charts = objects(document, "charts", 64, true);
      Set<String> assetIds = new HashSet<>(); Set<String> paths = new HashSet<>();
      long expanded = 0;
      for (Document asset : assets) {
        fields(asset, "id", "path", "kind", "sha256");
        String assetId = id(asset, "id");
        String resource = text(asset, "path", 240, true);
        String kind = text(asset, "kind", 10, true);
        String hash = text(asset, "sha256", 64, true);
        if (!assetIds.add(assetId) || !paths.add(resource)) throw invalid("Asset identifiers and paths must be unique.");
        if (!resource.matches("web/[A-Za-z0-9._/-]+") || resource.endsWith("/") ||
            Arrays.stream(resource.split("/", -1)).anyMatch(p -> p.isEmpty() || p.equals(".") || p.equals("..")))
          throw invalid("Declare assets under web/ using safe resource paths.");
        mediaType(kind, resource);
        if (!hash.matches("[a-f0-9]{64}")) throw invalid("Every asset needs its lowercase SHA-256 checksum.");
        byte[] bytes = readBytes(jar, jar.getJarEntry(resource), MAX_ASSET);
        expanded += bytes.length;
        if (expanded > 32L * 1024 * 1024) throw invalid("Browser assets exceed 32 MiB.");
        if (!hash.equals(sha256(bytes))) throw invalid("A browser asset does not match its declared checksum.");
      }
      Set<String> runtimeIds = new HashSet<>();
      for (Document runtime : runtimes) {
        fields(runtime, "id", "version", "assets");
        if (!runtimeIds.add(id(runtime, "id"))) throw invalid("Runtime identifiers must be unique.");
        text(runtime, "version", 100, true);
        List<?> references = list(runtime, "assets", 64, true);
        Set<String> seen = new HashSet<>();
        for (Object reference : references) {
          if (!(reference instanceof String) || !assetIds.contains(reference) || !seen.add((String) reference))
            throw invalid("Runtimes must reference declared assets once, in load order.");
          if (assets.stream().anyMatch(a -> reference.equals(a.getString("id")) && "image".equals(a.getString("kind"))))
            throw invalid("Runtime dependencies must be scripts or styles.");
        }
      }
      Set<String> chartIds = new HashSet<>(); Set<String> chartClasses = new HashSet<>();
      for (Document chart : charts) {
        fields(chart, "id", "implementingClass", "runtimeId", "description", "iconAssetId", "inputRoles", "customizations");
        if (!chartIds.add(id(chart, "id"))) throw invalid("Chart identifiers must be unique.");
        String type = text(chart, "implementingClass", 512, true);
        if (!type.matches("[A-Za-z_$][A-Za-z0-9_$]*(\\.[A-Za-z_$][A-Za-z0-9_$]*)+") || !chartClasses.add(type))
          throw invalid("Each chart must identify a unique Java implementation.");
        if (!runtimeIds.contains(id(chart, "runtimeId"))) throw invalid("Every chart must reference a declared runtime.");
        text(chart, "description", 10000, false);
        if (chart.containsKey("iconAssetId") && assets.stream().noneMatch(a ->
            Objects.equals(a.getString("id"), chart.get("iconAssetId")) && "image".equals(a.getString("kind"))))
          throw invalid("A chart icon must reference a declared image asset.");
        if (chart.containsKey("inputRoles")) {
          Document roles = object(chart.get("inputRoles")); fields(roles, "category", "series");
          roles.forEach((role, value) -> { if (!(value instanceof String) || ((String) value).length() > 300 || ((String) value).isBlank()) throw invalid("Input roles must reference input port identifiers."); });
        }
        validateCustomizations(chart);
      }
      if (discoveredClasses != null && !new HashSet<>(discoveredClasses).equals(chartClasses))
        throw invalid("Manifest charts must exactly match the JAR's discovered chart implementations.");
      return new VisualizationManifest(document);
    } catch (ValidationException error) { throw error; }
    catch (IOException | RuntimeException error) { throw invalid("The visualization manifest or its assets are malformed."); }
  }

  private static void validateCustomizations(Document chart) {
    if (!(chart.get("customizations") instanceof List<?>)) throw invalid("Every chart must declare a customizations array, which may be empty.");
    List<Document> controls = objects(chart, "customizations", 64, false);
    Set<String> ids = new HashSet<>();
    for (Document control : controls) {
      fields(control, "id", "label", "type", "defaultValue", "options", "min", "max", "step", "help", "group", "visibleWhen");
      if (!ids.add(id(control, "id"))) throw invalid("Customization identifiers must be unique.");
      text(control, "label", 300, true); text(control, "help", 2000, false);
      String type = text(control, "type", 10, true);
      if (!Set.of("text", "number", "boolean", "select", "color").contains(type)) throw invalid("Unsupported customization control.");
      if (!Set.of("elements", "styles", "filters").contains(text(control, "group", 10, true))) throw invalid("Choose an Elements, Styles or Filters group.");
      for (String key : List.of("min", "max", "step")) if (control.containsKey(key) &&
          (!(control.get(key) instanceof Number) || !Double.isFinite(((Number) control.get(key)).doubleValue()))) throw invalid("Customization bounds must be finite numbers.");
      if (control.containsKey("min") && control.containsKey("max") && ((Number)control.get("min")).doubleValue() > ((Number)control.get("max")).doubleValue()) throw invalid("Customization bounds are reversed.");
      if (control.containsKey("step") && ((Number)control.get("step")).doubleValue() <= 0) throw invalid("Customization step must be positive.");
      if (!"number".equals(type) && (control.containsKey("min") || control.containsKey("max") || control.containsKey("step")))
        throw invalid("Only number controls declare numeric bounds or steps.");
      if ("select".equals(type)) {
        Set<Object> values = new HashSet<>();
        for (Document option : objects(control, "options", 100, true)) {
          fields(option, "value", "label"); text(option, "label", 300, true);
          Object value = option.get("value");
          Object identity = value instanceof Number
              ? (((Number)value).doubleValue() == 0 ? 0.0 : ((Number)value).doubleValue()) : value;
          if (!scalar(value) || !values.add(identity)) throw invalid("Select options need unique scalar values.");
        }
      } else if (control.containsKey("options")) throw invalid("Only select controls declare options.");
      if (control.containsKey("defaultValue")) VisualizationCustomization.validateValue(control, control.get("defaultValue"));
      if (control.containsKey("visibleWhen")) {
        Document condition = object(control.get("visibleWhen")); fields(condition, "id", "equals");
        id(condition, "id"); if (!scalar(condition.get("equals"))) throw invalid("Visibility conditions compare scalar values.");
      }
    }
    Map<String,String> dependencies = new HashMap<>();
    for (Document control : controls) if (control.containsKey("visibleWhen")) {
      Document condition = object(control.get("visibleWhen"));
      if (!ids.contains(condition.getString("id")) || condition.getString("id").equals(control.getString("id"))) throw invalid("Visibility conditions must reference another declared control.");
      dependencies.put(control.getString("id"), condition.getString("id"));
    }
    for (String start : dependencies.keySet()) {
      Set<String> visited = new HashSet<>();
      String cursor = start;
      while (cursor != null) {
        if (!visited.add(cursor)) throw invalid("Customization visibility conditions cannot contain cycles.");
        cursor = dependencies.get(cursor);
      }
    }
  }

  public Document document() { return Document.parse(document.toJson()); }
  public Document chart(String implementingClass) { return objects(document, "charts", 64, true).stream().filter(c -> implementingClass.equals(c.getString("implementingClass"))).findFirst().orElseThrow(() -> invalid("This chart is absent from its plugin manifest.")); }
  public Document runtime(String id) { return objects(document, "runtimes", 16, true).stream().filter(r -> id.equals(r.getString("id"))).findFirst().orElseThrow(() -> invalid("This runtime is absent from its plugin manifest.")); }
  public List<Document> assets() { return objects(document, "assets", 64, true); }
  public Document asset(String id) { return assets().stream().filter(a -> id.equals(a.getString("id"))).findFirst().orElseThrow(() -> invalid("This asset is absent from its plugin manifest.")); }

  public static byte[] readAsset(Path path, Document asset) {
    try (JarFile jar = new JarFile(path.toFile(), true)) {
      byte[] bytes = readBytes(jar, jar.getJarEntry(asset.getString("path")), MAX_ASSET);
      if (!sha256(bytes).equals(asset.getString("sha256"))) throw invalid("The browser asset checksum changed.");
      return bytes;
    } catch (IOException error) { throw invalid("The browser asset is unavailable."); }
  }
  public static String mediaType(String kind, String path) {
    if ("script".equals(kind) && path.endsWith(".js")) return "text/javascript";
    if ("style".equals(kind) && path.endsWith(".css")) return "text/css";
    if ("image".equals(kind) && path.endsWith(".png")) return "image/png";
    if ("image".equals(kind) && path.endsWith(".svg")) return "image/svg+xml";
    throw invalid("Assets must be JavaScript, CSS, PNG or SVG resources with the correct kind.");
  }
  public static String sha256(byte[] bytes) {
    try { return java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)); }
    catch (NoSuchAlgorithmException error) { throw new IllegalStateException(error); }
  }
  private static byte[] readBytes(JarFile jar, JarEntry entry, int maximum) throws IOException {
    if (entry == null || entry.isDirectory() || entry.getSize() > maximum) throw invalid("A declared manifest resource is missing or oversized.");
    try (InputStream input = jar.getInputStream(entry); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
      byte[] buffer = new byte[8192]; int read;
      while ((read = input.read(buffer)) != -1) { if (output.size() + read > maximum) throw invalid("A manifest resource exceeds its limit."); output.write(buffer, 0, read); }
      return output.toByteArray();
    }
  }
  private static boolean scalar(Object value) { return value instanceof String || value instanceof Boolean || value instanceof Number && Double.isFinite(((Number)value).doubleValue()); }
  private static Document object(Object value) { if (!(value instanceof Map)) throw invalid("Manifest entries must be objects."); return new Document((Map<String,Object>)value); }
  private static List<?> list(Document source, String key, int max, boolean required) {
    Object value = source.get(key); if (value == null && !required) return List.of();
    if (!(value instanceof List) || ((List<?>)value).size() > max || required && ((List<?>)value).isEmpty()) throw invalid("Missing or oversized manifest list: " + key + ".");
    return (List<?>) value;
  }
  private static List<Document> objects(Document source, String key, int max, boolean required) { List<Document> result = new ArrayList<>(); for (Object value : list(source,key,max,required)) result.add(object(value)); return result; }
  private static String id(Document source, String key) { String value = text(source,key,100,true); if (!value.matches("[A-Za-z][A-Za-z0-9._-]{0,99}") || Set.of("constructor", "prototype", "__proto__").contains(value)) throw invalid("Manifest identifiers must be stable, non-reserved letters, numbers, dots, underscores or hyphens."); return value; }
  private static String text(Document source, String key, int maximum, boolean required) { Object value = source.get(key); if (value == null && !required) return ""; if (!(value instanceof String) || ((String)value).length() > maximum || required && ((String)value).isBlank() || ((String)value).indexOf('\0') >= 0) throw invalid("Invalid manifest field: " + key + "."); return (String)value; }
  private static void fields(Document source, String... names) { Set<String> allowed = Set.of(names); if (!allowed.containsAll(source.keySet())) throw invalid("The visualization manifest contains unknown fields."); }
  static ValidationException invalid(String message) { return new ValidationException("INVALID_VISUALIZATION_MANIFEST", message); }
}
