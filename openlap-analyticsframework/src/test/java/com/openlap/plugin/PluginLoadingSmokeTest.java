package com.openlap.plugin;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import com.openlap.analytics_technique.utilities.AnalyticsMethodsClassPathLoader;
import com.openlap.configurations.Utils;
import com.openlap.dataset.OpenLAPColumnConfigData;
import com.openlap.dataset.OpenLAPColumnDataType;
import com.openlap.dataset.OpenLAPDataColumn;
import com.openlap.dataset.OpenLAPDataColumnFactory;
import com.openlap.dataset.OpenLAPDataSet;
import com.openlap.dataset.OpenLAPPortConfig;
import com.openlap.dataset.OpenLAPPortMapping;
import com.openlap.template.AnalyticsMethod;
import com.openlap.template.DataTransformer;
import com.openlap.template.VisualizationCodeGenerator;
import com.openlap.template.VisualizationEscaper;
import com.openlap.template.VisualizationLibraryInfo;
import com.openlap.template.model.ChartConfiguration;
import com.openlap.template.model.TransformedData;
import com.openlap.visualization_methods.utilities.VisualizerClassPathLoader;
import java.io.File;
import java.io.IOException;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.CodeSource;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.jar.JarEntry;
import java.util.jar.JarOutputStream;
import java.util.stream.Stream;
import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.StandardJavaFileManager;
import javax.tools.ToolProvider;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

public class PluginLoadingSmokeTest {

  private static final String ANALYTICS_CLASS =
      "org.openlap.smoke.analytics.SmokeAnalyticsMethod";
  private static final String VISUALIZATION_LIBRARY_CLASS =
      "org.openlap.smoke.visualization.SmokeVisualizationLibrary";
  private static final String VISUALIZATION_CLASS =
      "org.openlap.smoke.visualization.SmokeVisualization";

  @Rule public TemporaryFolder temporaryFolder = new TemporaryFolder();

  @Test
  public void analyticsPluginJarCanBeDiscoveredLoadedAndRead() throws Exception {
    Path jarPath =
        compileJar(
            "smoke-analytics-plugin.jar",
            source("org/openlap/smoke/analytics/SmokeAnalyticsMethod.java", analyticsSource()));

    assertTrue(Utils.getClassNamesFromJar(jarPath.toString(), "org.openlap.smoke.analytics")
        .contains(ANALYTICS_CLASS));

    try (AnalyticsMethodsClassPathLoader loader =
        new AnalyticsMethodsClassPathLoader(jarPath.toString())) {
      AnalyticsMethod method = loader.loadClass(ANALYTICS_CLASS);

      assertEquals("Smoke Analytics Method", method.getAnalyticsMethodName());
      assertEquals("Loaded by the analytics framework smoke test.", method.getAnalyticsMethodDescription());
      assertEquals("OpenLAP", method.getAnalyticsMethodCreator());
      assertEquals("smoke", method.getType());
      assertFalse(method.hasPMML());
      assertEquals(1, method.getInputPorts().size());
      assertEquals(1, method.getOutputPorts().size());
      assertEquals("score", method.getInputPorts().get(0).getId());
      assertEquals("result", method.getOutputPorts().get(0).getId());
      assertNotNull(method.execute());
    }
  }

  @Test
  public void visualizationPluginJarCanBeDiscoveredLoadedAndGenerateCode() throws Exception {
    Path jarPath =
        compileJar(
            "smoke-visualization-plugin.jar",
            source(
                "org/openlap/smoke/visualization/SmokeVisualizationLibrary.java",
                visualizationLibrarySource()),
            source(
                "org/openlap/smoke/visualization/SmokeDataTransformer.java",
                visualizationTransformerSource()),
            source(
                "org/openlap/smoke/visualization/SmokeVisualization.java",
                visualizationSource()));

    List<String> classNames =
        Utils.getClassNamesFromJar(jarPath.toString(), "org.openlap.smoke.visualization");
    assertTrue(classNames.contains(VISUALIZATION_LIBRARY_CLASS));
    assertTrue(classNames.contains(VISUALIZATION_CLASS));

    try (VisualizerClassPathLoader loader = new VisualizerClassPathLoader(jarPath.toString())) {
      VisualizationLibraryInfo libraryInfo = loader.loadLibraryInfo(VISUALIZATION_LIBRARY_CLASS);
      assertEquals("Smoke Visualization Library", libraryInfo.getName());
      assertEquals("OpenLAP", libraryInfo.getDeveloperName());

      VisualizationCodeGenerator visualization = loader.loadTypeClass(VISUALIZATION_CLASS);
      assertEquals("Smoke Visualization", visualization.getName());
      assertTrue(visualization.getConfiguration().isShowHideLegendAvailable());
      assertTrue(visualization.getConfiguration().isChartTitleAvailable());
      assertEquals(1, visualization.getInput().getColumnsConfigurationData().size());

      String dangerousLabel = "</script><script>alert(1)</script>";
      String generated =
          visualization.generateVisualizationCode(
              inputDataSet(dangerousLabel),
              portConfigFor(visualization),
              Collections.<String, Object>emptyMap());

      assertTrue(
          generated.contains(
              "window.openlapSmokeLabel='\\u003C/script\\u003E\\u003Cscript\\u003Ealert(1)"
                  + "\\u003C/script\\u003E';"));
      assertFalse(generated.contains("</script><script>"));
    }
  }

  private Path compileJar(String jarName, SourceFile... sources) throws Exception {
    Path workspace = temporaryFolder.newFolder(jarName.replace(".jar", "")).toPath();
    Path sourceRoot = workspace.resolve("src");
    Path classesRoot = workspace.resolve("classes");
    Files.createDirectories(sourceRoot);
    Files.createDirectories(classesRoot);

    List<File> sourceFiles = new ArrayList<>();
    for (SourceFile source : sources) {
      Path sourceFile = sourceRoot.resolve(source.relativePath);
      Files.createDirectories(sourceFile.getParent());
      Files.write(sourceFile, source.contents.getBytes(StandardCharsets.UTF_8));
      sourceFiles.add(sourceFile.toFile());
    }

    JavaCompiler compiler = ToolProvider.getSystemJavaCompiler();
    assertNotNull("Tests must run on a JDK because smoke plugins are compiled at test time.", compiler);

    DiagnosticCollector<JavaFileObject> diagnostics = new DiagnosticCollector<>();
    try (StandardJavaFileManager fileManager =
        compiler.getStandardFileManager(diagnostics, null, StandardCharsets.UTF_8)) {
      Iterable<? extends JavaFileObject> compilationUnits =
          fileManager.getJavaFileObjectsFromFiles(sourceFiles);
      List<String> options =
          Arrays.asList(
              "--release",
              "11",
              "-classpath",
              compilerClassPath(),
              "-d",
              classesRoot.toString());

      Boolean success =
          compiler.getTask(null, fileManager, diagnostics, options, null, compilationUnits).call();
      assertTrue(formatDiagnostics(diagnostics), success);
    }

    Path jarPath = workspace.resolve(jarName);
    createJar(classesRoot, jarPath);
    return jarPath;
  }

  private String compilerClassPath() throws URISyntaxException {
    Set<String> entries = new LinkedHashSet<>();
    addClassPath(entries, System.getProperty("java.class.path"));
    addClassPath(entries, System.getProperty("surefire.test.class.path"));
    addCodeSource(entries, AnalyticsMethod.class);
    addCodeSource(entries, VisualizationCodeGenerator.class);
    addCodeSource(entries, VisualizationEscaper.class);
    addCodeSource(entries, DataTransformer.class);
    addCodeSource(entries, ChartConfiguration.class);
    addCodeSource(entries, TransformedData.class);
    addCodeSource(entries, OpenLAPDataSet.class);
    return String.join(File.pathSeparator, entries);
  }

  private void addClassPath(Set<String> entries, String classPath) {
    if (classPath == null || classPath.isEmpty()) {
      return;
    }
    entries.addAll(Arrays.asList(classPath.split(File.pathSeparator)));
  }

  private void addCodeSource(Set<String> entries, Class<?> type) throws URISyntaxException {
    CodeSource codeSource = type.getProtectionDomain().getCodeSource();
    if (codeSource != null && codeSource.getLocation() != null) {
      entries.add(new File(codeSource.getLocation().toURI()).getPath());
    }
  }

  private String formatDiagnostics(DiagnosticCollector<JavaFileObject> diagnostics) {
    StringBuilder message = new StringBuilder("Smoke plugin compilation failed.");
    for (Diagnostic<? extends JavaFileObject> diagnostic : diagnostics.getDiagnostics()) {
      message
          .append(System.lineSeparator())
          .append(diagnostic.getKind())
          .append(" ")
          .append(diagnostic.getSource() == null ? "" : diagnostic.getSource().getName())
          .append(":")
          .append(diagnostic.getLineNumber())
          .append(" ")
          .append(diagnostic.getMessage(null));
    }
    return message.toString();
  }

  private void createJar(Path classesRoot, Path jarPath) throws IOException {
    try (JarOutputStream jarOutputStream =
            new JarOutputStream(Files.newOutputStream(jarPath));
        Stream<Path> paths = Files.walk(classesRoot)) {
      for (Path classFile : paths.filter(Files::isRegularFile).toArray(Path[]::new)) {
        String entryName =
            classesRoot.relativize(classFile).toString().replace(File.separatorChar, '/');
        jarOutputStream.putNextEntry(new JarEntry(entryName));
        Files.copy(classFile, jarOutputStream);
        jarOutputStream.closeEntry();
      }
    }
  }

  private OpenLAPDataSet inputDataSet(String label) throws Exception {
    OpenLAPDataSet dataSet = new OpenLAPDataSet();
    dataSet.addOpenLAPDataColumn(
        OpenLAPDataColumnFactory.createOpenLAPDataColumnOfType(
            "sourceLabel", OpenLAPColumnDataType.Text, true, "Source Label", "Label from analytics"));

    @SuppressWarnings("unchecked")
    OpenLAPDataColumn<String> labelColumn =
        (OpenLAPDataColumn<String>) dataSet.getColumns().get("sourceLabel");
    labelColumn.setData(new ArrayList<>(Collections.singletonList(label)));
    return dataSet;
  }

  private OpenLAPPortConfig portConfigFor(VisualizationCodeGenerator visualization) {
    OpenLAPColumnConfigData sourcePort =
        new OpenLAPColumnConfigData(
            "sourceLabel", OpenLAPColumnDataType.Text, true, "Source Label", "Label from analytics");
    OpenLAPColumnConfigData inputPort =
        visualization.getInput().getColumns().get("label").getConfigurationData();
    return new OpenLAPPortConfig(
        new ArrayList<>(Collections.singletonList(new OpenLAPPortMapping(sourcePort, inputPort))));
  }

  private SourceFile source(String relativePath, String contents) {
    return new SourceFile(relativePath, contents);
  }

  private String analyticsSource() {
    return ""
        + "package org.openlap.smoke.analytics;\n"
        + "\n"
        + "import com.openlap.dataset.OpenLAPColumnDataType;\n"
        + "import com.openlap.dataset.OpenLAPDataColumnFactory;\n"
        + "import com.openlap.dataset.OpenLAPDataSet;\n"
        + "import com.openlap.exceptions.OpenLAPDataColumnException;\n"
        + "import com.openlap.template.AnalyticsMethod;\n"
        + "import java.io.InputStream;\n"
        + "\n"
        + "public class SmokeAnalyticsMethod extends AnalyticsMethod {\n"
        + "  public SmokeAnalyticsMethod() {\n"
        + "    try {\n"
        + "      OpenLAPDataSet input = new OpenLAPDataSet();\n"
        + "      input.addOpenLAPDataColumn(OpenLAPDataColumnFactory.createOpenLAPDataColumnOfType(\n"
        + "          \"score\", OpenLAPColumnDataType.Numeric, true, \"Score\", \"Input score\"));\n"
        + "      setInput(input);\n"
        + "      OpenLAPDataSet output = new OpenLAPDataSet();\n"
        + "      output.addOpenLAPDataColumn(OpenLAPDataColumnFactory.createOpenLAPDataColumnOfType(\n"
        + "          \"result\", OpenLAPColumnDataType.Numeric, true, \"Result\", \"Output result\"));\n"
        + "      setOutput(output);\n"
        + "      setType(\"smoke\");\n"
        + "    } catch (OpenLAPDataColumnException exception) {\n"
        + "      throw new IllegalStateException(exception);\n"
        + "    }\n"
        + "  }\n"
        + "\n"
        + "  protected void implementationExecution() {\n"
        + "  }\n"
        + "\n"
        + "  public Boolean hasPMML() {\n"
        + "    return false;\n"
        + "  }\n"
        + "\n"
        + "  public InputStream getPMMLInputStream() {\n"
        + "    return null;\n"
        + "  }\n"
        + "\n"
        + "  public String getAnalyticsMethodName() {\n"
        + "    return \"Smoke Analytics Method\";\n"
        + "  }\n"
        + "\n"
        + "  public String getAnalyticsMethodDescription() {\n"
        + "    return \"Loaded by the analytics framework smoke test.\";\n"
        + "  }\n"
        + "\n"
        + "  public String getAnalyticsMethodCreator() {\n"
        + "    return \"OpenLAP\";\n"
        + "  }\n"
        + "}\n";
  }

  private String visualizationLibrarySource() {
    return ""
        + "package org.openlap.smoke.visualization;\n"
        + "\n"
        + "import com.openlap.template.VisualizationLibraryInfo;\n"
        + "\n"
        + "public class SmokeVisualizationLibrary extends VisualizationLibraryInfo {\n"
        + "  public String getName() {\n"
        + "    return \"Smoke Visualization Library\";\n"
        + "  }\n"
        + "\n"
        + "  public String getDescription() {\n"
        + "    return \"Loaded by the analytics framework smoke test.\";\n"
        + "  }\n"
        + "\n"
        + "  public String getDeveloperName() {\n"
        + "    return \"OpenLAP\";\n"
        + "  }\n"
        + "}\n";
  }

  private String visualizationTransformerSource() {
    return ""
        + "package org.openlap.smoke.visualization;\n"
        + "\n"
        + "import com.openlap.dataset.OpenLAPDataColumn;\n"
        + "import com.openlap.dataset.OpenLAPDataSet;\n"
        + "import com.openlap.exceptions.UnTransformableData;\n"
        + "import com.openlap.template.DataTransformer;\n"
        + "import com.openlap.template.model.TransformedData;\n"
        + "\n"
        + "public class SmokeDataTransformer implements DataTransformer {\n"
        + "  private String firstLabel = \"\";\n"
        + "\n"
        + "  public TransformedData<?> transformData(OpenLAPDataSet openLAPDataSet)\n"
        + "      throws UnTransformableData {\n"
        + "    OpenLAPDataColumn<?> labelColumn = openLAPDataSet.getColumns().get(\"label\");\n"
        + "    if (labelColumn == null || labelColumn.getData().isEmpty()) {\n"
        + "      throw new UnTransformableData(\"Missing label data.\");\n"
        + "    }\n"
        + "    firstLabel = String.valueOf(labelColumn.getData().get(0));\n"
        + "    TransformedData<String> transformedData = new TransformedData<String>();\n"
        + "    transformedData.setData(firstLabel);\n"
        + "    return transformedData;\n"
        + "  }\n"
        + "\n"
        + "  public String getFirstLabel() {\n"
        + "    return firstLabel;\n"
        + "  }\n"
        + "}\n";
  }

  private String visualizationSource() {
    return ""
        + "package org.openlap.smoke.visualization;\n"
        + "\n"
        + "import com.openlap.dataset.OpenLAPColumnDataType;\n"
        + "import com.openlap.dataset.OpenLAPDataColumnFactory;\n"
        + "import com.openlap.dataset.OpenLAPDataSet;\n"
        + "import com.openlap.exceptions.OpenLAPDataColumnException;\n"
        + "import com.openlap.exceptions.VisualizationCodeGenerationException;\n"
        + "import com.openlap.template.DataTransformer;\n"
        + "import com.openlap.template.VisualizationCodeGenerator;\n"
        + "import com.openlap.template.VisualizationEscaper;\n"
        + "import com.openlap.template.model.ChartConfiguration;\n"
        + "import java.util.Map;\n"
        + "\n"
        + "public class SmokeVisualization extends VisualizationCodeGenerator {\n"
        + "  public String getName() {\n"
        + "    return \"Smoke Visualization\";\n"
        + "  }\n"
        + "\n"
        + "  public ChartConfiguration getConfiguration() {\n"
        + "    return new ChartConfiguration(\n"
        + "        true, false, false, false, false, false,\n"
        + "        false, false, false, true, false, false,\n"
        + "        false, false, false, false, false, false,\n"
        + "        false, false, false, false, false, false,\n"
        + "        false, false, false, false);\n"
        + "  }\n"
        + "\n"
        + "  public void initializeDataSetConfiguration() {\n"
        + "    try {\n"
        + "      OpenLAPDataSet input = new OpenLAPDataSet();\n"
        + "      input.addOpenLAPDataColumn(OpenLAPDataColumnFactory.createOpenLAPDataColumnOfType(\n"
        + "          \"label\", OpenLAPColumnDataType.Text, true, \"Label\", \"Label to render\"));\n"
        + "      setInput(input);\n"
        + "      setOutput(new OpenLAPDataSet());\n"
        + "    } catch (OpenLAPDataColumnException exception) {\n"
        + "      throw new IllegalStateException(exception);\n"
        + "    }\n"
        + "  }\n"
        + "\n"
        + "  public Class getDataTransformer() {\n"
        + "    return SmokeDataTransformer.class;\n"
        + "  }\n"
        + "\n"
        + "  public String visualizationLibraryScript() {\n"
        + "    return \"\";\n"
        + "  }\n"
        + "\n"
        + "  public String visualizationCode(DataTransformer dataTransformer,\n"
        + "      Map<String, Object> additionalParams) throws VisualizationCodeGenerationException {\n"
        + "    SmokeDataTransformer smokeTransformer = (SmokeDataTransformer) dataTransformer;\n"
        + "    return \"<script>window.openlapSmokeLabel='\"\n"
        + "        + VisualizationEscaper.escapeJavaScriptString(smokeTransformer.getFirstLabel())\n"
        + "        + \"';</script>\";\n"
        + "  }\n"
        + "}\n";
  }

  private static final class SourceFile {
    private final String relativePath;
    private final String contents;

    private SourceFile(String relativePath, String contents) {
      this.relativePath = relativePath;
      this.contents = contents;
    }
  }
}
