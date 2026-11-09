package com.openlap.plugins.management;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openlap.dataset.OpenLAPColumnDataType;
import com.openlap.infrastructure.exception.ValidationException;
import com.openlap.plugins.PluginJarFiles;
import com.openlap.plugins.artifacts.PluginKind;
import com.openlap.template.AnalyticsMethod;
import com.openlap.template.VisualizationCodeGenerator;
import com.openlap.template.VisualizationLibraryInfo;
import java.io.IOException;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.jar.JarFile;
import java.util.stream.Collectors;
import javassist.ClassPool;
import javassist.CtClass;
import javassist.LoaderClassPath;
import javassist.Modifier;
import javassist.NotFoundException;
import org.bson.Document;

/** Static discovery never initializes classes. Contract inspection is a separate explicit action. */
public final class PluginInspector {
  private static final int MAX_ENTRIES = 64;
  private final ObjectMapper mapper = new ObjectMapper();

  public PluginInspection discover(PluginKind kind, Path jar) {
    PluginJarFiles.validate(jar);
    PluginInspection result = new PluginInspection();
    ClassPool pool = new ClassPool(false);
    pool.appendClassPath(new LoaderClassPath(AnalyticsMethod.class.getClassLoader()));
    List<CtClass> resolved = new ArrayList<>();
    try (JarFile archive = new JarFile(jar.toFile())) {
      List<String> names = archive.stream().filter(entry -> entry.getName().endsWith(".class"))
          .map(entry -> entry.getName().substring(0, entry.getName().length() - 6).replace('/', '.'))
          .sorted().collect(Collectors.toList());
      for (String name : names) {
        if (name.startsWith("com.openlap.template.") || name.startsWith("com.openlap.dataset.")) {
          throw invalid("Do not bundle OpenLAP template or dataset classes; use the supported provided dependencies.");
        }
        if (name.equals("module-info") || name.endsWith("package-info")) continue;
        // Parse directly from owned streams, avoiding a cached JarURLConnection
        // that could retain a staging JAR after upload cleanup (especially on Windows).
        try (java.io.InputStream input = archive.getInputStream(archive.getJarEntry(name.replace('.', '/') + ".class"))) {
          CtClass type = pool.makeClass(input);
          if (!name.equals(type.getName())) throw invalid("Class names must match their archive entry paths.");
          resolved.add(type);
        }
      }
      for (CtClass type : resolved) {
        String name = type.getName();
        if (type.isInterface() || Modifier.isAbstract(type.getModifiers())) continue;
        boolean method = kind == PluginKind.ANALYTICS && type.subtypeOf(pool.get(AnalyticsMethod.class.getName()));
        boolean chart = kind == PluginKind.VISUALIZATION && type.subtypeOf(pool.get(VisualizationCodeGenerator.class.getName()));
        boolean library = kind == PluginKind.VISUALIZATION && type.subtypeOf(pool.get(VisualizationLibraryInfo.class.getName()));
        if (!method && !chart && !library) continue;
        if (name.length() > 512) throw invalid("Plugin entry class names must be at most 512 characters.");
        if (AnalyticsMethod.class.getClassLoader().getResource(name.replace('.', '/') + ".class") != null) {
          throw invalid("A plugin entry conflicts with a class already provided by the backend.");
        }
        if (!Modifier.isPublic(type.getModifiers()) || !Modifier.isPublic(type.getConstructor("()V").getModifiers())) {
          throw invalid("Every plugin entry must be public and have a public no-argument constructor.");
        }
        if (library) {
          if (result.getLibraryClass() != null) throw invalid("Upload exactly one visualization library per JAR.");
          result.setLibraryClass(name);
        } else result.getClasses().add(name);
        if (result.getClasses().size() > MAX_ENTRIES) throw invalid("A JAR may provide at most 64 plugin entries.");
      }
      if (result.getClasses().isEmpty()) throw invalid("No concrete entries implement the selected OpenLAP plugin contract.");
      if (kind == PluginKind.VISUALIZATION && result.getLibraryClass() == null) {
        throw invalid("A visualization JAR needs one VisualizationLibraryInfo implementation and at least one chart type.");
      }
      return result;
    } catch (IOException | NotFoundException e) {
      throw invalid("Plugin classes or their dependencies could not be resolved. Check the supported template and public no-argument constructors.");
    } catch (ValidationException e) { throw e; }
    catch (RuntimeException | StackOverflowError e) { throw invalid("The archive contains unsupported or malformed class definitions."); }
    finally { resolved.forEach(CtClass::detach); }
  }

  /** Executes trusted constructors and metadata methods, but never executes analytics or renders a chart. */
  public PluginInspection inspect(PluginKind kind, Path jar) {
    PluginInspection result = discover(kind, jar);
    try (URLClassLoader loader = new URLClassLoader(new URL[] {jar.toUri().toURL()}, AnalyticsMethod.class.getClassLoader())) {
      if (kind == PluginKind.VISUALIZATION) {
        VisualizationLibraryInfo library = instance(loader, result.getLibraryClass(), VisualizationLibraryInfo.class);
        result.setLibrary(new Document("name", text(library.getName(), 300, true))
            .append("description", text(library.getDescription(), 10000, false))
            .append("creator", text(library.getDeveloperName(), 300, false)));
      }
      for (String name : result.getClasses()) {
        Document entry = new Document("implementingClass", name);
        if (kind == PluginKind.ANALYTICS) {
          AnalyticsMethod method = instance(loader, name, AnalyticsMethod.class);
          entry.append("name", text(method.getAnalyticsMethodName(), 300, true))
              .append("description", text(method.getAnalyticsMethodDescription(), 10000, false))
              .append("creator", text(method.getAnalyticsMethodCreator(), 300, false))
              .append("type", text(method.getType(), 100, false));
          if (method.getInputPorts() == null || method.getOutputPorts() == null || method.getParams() == null) {
            throw invalid("Analytics entries must initialize their input, output and parameter contracts.");
          }
          entry.append("outputs", method.getOutputPorts().stream()
              .filter(port -> port.getType() == OpenLAPColumnDataType.Numeric)
              .map(port -> text(port.getId(), 300, true)).collect(Collectors.joining(",")));
          entry.append("inputs", plain(method.getInputPorts())).append("parameters", plain(method.getParams()))
              .append("outputPorts", plain(method.getOutputPorts()));
        } else {
          VisualizationCodeGenerator chart = instance(loader, name, VisualizationCodeGenerator.class);
          entry.append("name", text(chart.getName(), 300, true));
          if (chart.getConfiguration() == null) throw invalid("Every chart type must provide a chart configuration.");
          chart.initializeDataSetConfiguration();
          if (chart.getInput() == null) throw invalid("Every chart type must initialize its input contract.");
          if (chart.getDataTransformer() == null
              || !com.openlap.template.DataTransformer.class.isAssignableFrom(chart.getDataTransformer())) {
            throw invalid("Every chart type must provide a compatible data transformer.");
          }
          if (!java.lang.reflect.Modifier.isPublic(chart.getDataTransformer().getModifiers())
              || java.lang.reflect.Modifier.isAbstract(chart.getDataTransformer().getModifiers())) {
            throw invalid("Data transformers must be public, concrete classes with a public no-argument constructor.");
          }
          chart.getDataTransformer().getConstructor();
          entry.append("chartConfiguration", chartConfiguration(chart.getConfiguration()))
              .append("inputs", plain(chart.getInput().getColumnsConfigurationData()));
        }
        result.getEntries().add(entry);
      }
      // Bound the entire persisted review, including plugin-provided port/parameter metadata.
      if (mapper.writeValueAsBytes(result).length > 1024 * 1024) throw invalid("Plugin review metadata exceeds 1 MiB.");
      return result;
    } catch (ValidationException e) { throw e; }
    catch (ReflectiveOperationException | IOException | LinkageError | AssertionError | RuntimeException e) {
      throw invalid("Plugin contract inspection failed. Check constructors, metadata and dependencies; no entries were activated.");
    }
  }

  private Object plain(Object value) throws IOException {
    byte[] bytes = mapper.writeValueAsBytes(value);
    if (bytes.length > 128 * 1024) throw invalid("A plugin contract exceeds the 128 KiB metadata limit.");
    return mapper.readValue(bytes, Object.class);
  }

  private static Document chartConfiguration(com.openlap.template.model.ChartConfiguration configuration) throws IllegalAccessException {
    // Mongo persists field names (isShowHideLegendAvailable), while Jackson uses
    // getter properties (showHideLegendAvailable). Keep the template's constructor
    // field names so existing Spring Data readers can instantiate it after restart.
    Document result = new Document();
    for (java.lang.reflect.Field field : com.openlap.template.model.ChartConfiguration.class.getDeclaredFields()) {
      if (field.getType() == boolean.class && !java.lang.reflect.Modifier.isStatic(field.getModifiers())) {
        field.setAccessible(true);
        result.put(field.getName(), field.getBoolean(configuration));
      }
    }
    return result;
  }

  private static <T> T instance(ClassLoader loader, String name, Class<T> contract) throws ReflectiveOperationException {
    return contract.cast(Class.forName(name, true, loader).getConstructor().newInstance());
  }

  private static String text(String value, int max, boolean required) {
    String result = value == null ? "" : value.trim();
    if (result.length() > max || (required && result.isEmpty()) || result.indexOf('\0') >= 0) {
      throw invalid("Plugin metadata contains an empty required field or exceeds its supported length.");
    }
    return result;
  }

  private static ValidationException invalid(String message) { return new ValidationException("INVALID_PLUGIN_CONTRACT", message); }
}
