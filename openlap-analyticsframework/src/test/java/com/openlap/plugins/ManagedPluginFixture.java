package com.openlap.plugins;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.jar.JarEntry;
import java.util.jar.JarOutputStream;
import javax.tools.ToolProvider;

final class ManagedPluginFixture {
  static Path create(Path folder, String suffix, boolean broken) throws Exception {
    return create(folder, suffix, broken, suffix);
  }

  static Path create(Path folder, String suffix, boolean broken, String marker) throws Exception {
    return create(folder, suffix, broken, marker, false);
  }

  static Path create(Path folder, String suffix, boolean broken, String marker, boolean extra) throws Exception {
    Map<String, String> sources = new LinkedHashMap<>();
    String analytics = "ManagedAnalytics" + suffix;
    String library = "ManagedLibrary" + suffix;
    String chart = "ManagedChart" + suffix;
    String transformer = "ManagedTransformer" + suffix;
    sources.put(analytics, "public class " + analytics + " extends com.openlap.template.AnalyticsMethod {"
        + " public " + analytics + "() { System.setProperty(\"openlap.fixture.inspected\", \"yes\");"
        + " setInput(new com.openlap.dataset.OpenLAPDataSet()); setOutput(new com.openlap.dataset.OpenLAPDataSet());"
        + " setParams(new com.openlap.dynamicparam.OpenLAPDynamicParams()); setType(\"test\"); }"
        + " protected void implementationExecution() {throw new AssertionError(\"Must not execute during inspection\");}"
        + " public Boolean hasPMML(){return false;} public java.io.InputStream getPMMLInputStream(){return null;}"
        + " public String getAnalyticsMethodName(){" + (broken ? "throw new IllegalStateException(\"private-plugin-detail\");" : "return \"Method " + marker + "\";") + "}"
        + " public String getAnalyticsMethodDescription(){return \"Fixture\";}"
        + " public String getAnalyticsMethodCreator(){return \"Test\";} }");
    if (extra) sources.put(analytics + "Extra", "public class " + analytics + "Extra extends " + analytics + " {"
        + " public String getAnalyticsMethodName(){return \"Extra " + marker + "\";} }");
    sources.put(library, "public class " + library + " extends com.openlap.template.VisualizationLibraryInfo {"
        + " public String getName(){return \"Library " + marker + "\";} public String getDescription(){return \"Fixture\";}"
        + " public String getDeveloperName(){return \"Test\";} }");
    sources.put(chart, "public class " + chart + " extends com.openlap.template.VisualizationCodeGenerator {"
        + " public String getName(){return \"Chart " + marker + "\";}"
        + " public com.openlap.template.model.ChartConfiguration getConfiguration(){return new com.openlap.template.model.ChartConfiguration("
        + String.join(",", java.util.Collections.nCopies(28, "false")) + ");}"
        + " public void initializeDataSetConfiguration(){setInput(new com.openlap.dataset.OpenLAPDataSet());}"
        + " public Class getDataTransformer(){return " + transformer + ".class;}"
        + " public String visualizationLibraryScript(){return \"\";}"
        + " public String visualizationCode(com.openlap.template.DataTransformer t,java.util.Map<String,Object> v){throw new AssertionError(\"Must not render during inspection\");} }");
    sources.put(transformer, "public class " + transformer + " implements com.openlap.template.DataTransformer {"
        + " public com.openlap.template.model.TransformedData<?> transformData(com.openlap.dataset.OpenLAPDataSet data){return null;} }");
    Path src = Files.createTempDirectory(folder, "managed-src-");
    Path pkg = Files.createDirectories(src.resolve("managedfixture"));
    java.util.List<String> arguments = new java.util.ArrayList<>();
    java.util.Collections.addAll(arguments, "-classpath", System.getProperty("java.class.path"), "-d", src.toString());
    for (Map.Entry<String, String> entry : sources.entrySet()) {
      Path file = pkg.resolve(entry.getKey() + ".java");
      Files.write(file, ("package managedfixture;" + entry.getValue()).getBytes(StandardCharsets.UTF_8));
      arguments.add(file.toString());
    }
    ByteArrayOutputStream errors = new ByteArrayOutputStream();
    int result = ToolProvider.getSystemJavaCompiler().run(null, null, errors, arguments.toArray(new String[0]));
    if (result != 0) throw new AssertionError(errors.toString(StandardCharsets.UTF_8.name()));
    Path target = folder.resolve("plugin-" + suffix + ".jar");
    try (JarOutputStream output = new JarOutputStream(Files.newOutputStream(target))) {
      for (String name : sources.keySet()) {
        output.putNextEntry(new JarEntry("managedfixture/" + name + ".class"));
        Files.copy(pkg.resolve(name + ".class"), output);
        output.closeEntry();
      }
    }
    return target;
  }
}
