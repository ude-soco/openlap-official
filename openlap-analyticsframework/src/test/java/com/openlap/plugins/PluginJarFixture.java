package com.openlap.plugins;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.jar.JarEntry;
import java.util.jar.JarOutputStream;
import javax.tools.ToolProvider;

/** Builds real, isolated plugin versions with identical class names for loader regressions. */
final class PluginJarFixture {
  static final String ANALYTICS_CLASS = "fixture.VersionedAnalytics";
  static final String VISUALIZATION_CLASS = "fixture.VersionedChart";

  static Path create(Path folder, String name, String marker) throws IOException {
    Path sourceDir = Files.createTempDirectory(folder, "fixture-src-");
    Path packageDir = Files.createDirectories(sourceDir.resolve("fixture"));
    Path helper = packageDir.resolve("LazyMarker.java");
    Path analytics = packageDir.resolve("VersionedAnalytics.java");
    Path chart = packageDir.resolve("VersionedChart.java");
    Files.write(helper, ("package fixture; public class LazyMarker {"
        + " public static String value() { return \"" + marker + "\"; }}")
        .getBytes(StandardCharsets.UTF_8));
    Files.write(analytics, ("package fixture;"
        + " public class VersionedAnalytics extends com.openlap.template.AnalyticsMethod {"
        + " protected void implementationExecution() {}"
        + " public Boolean hasPMML() {return false;}"
        + " public java.io.InputStream getPMMLInputStream() {return null;}"
        + " public String getAnalyticsMethodName() {return LazyMarker.value();}"
        + " public String getAnalyticsMethodDescription() {return \"test\";}"
        + " public String getAnalyticsMethodCreator() {return \"test\";} }")
        .getBytes(StandardCharsets.UTF_8));
    Files.write(chart, ("package fixture;"
        + " public class VersionedChart extends com.openlap.template.VisualizationCodeGenerator {"
        + " public String getName() {return LazyMarker.value();}"
        + " public com.openlap.template.model.ChartConfiguration getConfiguration() {return null;}"
        + " public void initializeDataSetConfiguration() {}"
        + " public Class getDataTransformer() {return null;}"
        + " public String visualizationLibraryScript() {return \"\";}"
        + " public String visualizationCode(com.openlap.template.DataTransformer transformer,"
        + " java.util.Map<String,Object> values) {return getName();} }")
        .getBytes(StandardCharsets.UTF_8));
    ByteArrayOutputStream errors = new ByteArrayOutputStream();
    int result = ToolProvider.getSystemJavaCompiler().run(null, null, errors,
        "-classpath", System.getProperty("java.class.path"),
        "-d", sourceDir.toString(), helper.toString(), analytics.toString(), chart.toString());
    if (result != 0) throw new AssertionError(errors.toString(StandardCharsets.UTF_8.name()));
    Path target = folder.resolve(name);
    try (JarOutputStream jar = new JarOutputStream(Files.newOutputStream(target))) {
      for (String className : new String[] {"LazyMarker", "VersionedAnalytics", "VersionedChart"}) {
        jar.putNextEntry(new JarEntry("fixture/" + className + ".class"));
        Files.copy(packageDir.resolve(className + ".class"), jar);
        jar.closeEntry();
      }
    }
    return target;
  }
}
