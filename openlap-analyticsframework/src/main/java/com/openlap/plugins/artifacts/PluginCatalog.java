package com.openlap.plugins.artifacts;

import com.mongodb.DBRef;
import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.jar.JarFile;
import lombok.Getter;
import com.openlap.plugins.management.PluginCatalogVisibility;
import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;

/** Raw catalog reads preserve legacy IDs and avoid dereferencing unrelated indicator data. */
public final class PluginCatalog {
  private final MongoTemplate mongo;
  private final PluginCatalogVisibility visibility;

  public PluginCatalog(MongoTemplate mongo) { this.mongo = mongo; this.visibility = new PluginCatalogVisibility(mongo); }

  @Getter
  public static final class Entry {
    private final PluginKind kind;
    private final Object rawId;
    private final String id;
    private final String recordedPath;
    private final String artifactId;
    private final List<String> classes;

    Entry(PluginKind kind, Document row, String pathField, List<String> classes) {
      this.kind = kind;
      this.rawId = row.get("_id");
      this.id = rawId.toString();
      this.recordedPath = row.getString(pathField);
      this.artifactId = row.getString("artifactId");
      this.classes = Collections.unmodifiableList(new ArrayList<>(classes));
    }

    public String collection() { return kind == PluginKind.ANALYTICS ? "analytics-technique" : "visualization-library"; }
    public String pathField() { return kind == PluginKind.ANALYTICS ? "fileName" : "frameworkLocation"; }
    public String key() { return kind.name() + ":" + id; }
  }

  public List<Entry> entries() {
    List<Entry> entries = new ArrayList<>();
    for (Document method : mongo.findAll(Document.class, "analytics-technique")) {
      if (!installed(method)) continue;
      entries.add(new Entry(PluginKind.ANALYTICS, method, "fileName", Collections.singletonList(className(method))));
    }
    Map<String, Document> libraries = new HashMap<>();
    Map<String, List<String>> classes = new HashMap<>();
    for (Document library : mongo.findAll(Document.class, "visualization-library")) {
      if (!installed(library)) continue;
      String id = library.get("_id").toString();
      libraries.put(id, library);
      classes.put(id, new ArrayList<>());
    }
    for (Document type : mongo.findAll(Document.class, "visualization-type")) {
      if (!installed(type)) continue;
      String parent = referenceId(type.get("visualizationLib"));
      if (!libraries.containsKey(parent)) {
        throw new PluginStorageException("PLUGIN_CATALOG_INVALID", "A visualization type references a missing library. Repair the catalog before migration.");
      }
      classes.get(parent).add(className(type));
    }
    libraries.forEach((id, row) -> entries.add(new Entry(PluginKind.VISUALIZATION, row, "frameworkLocation", classes.get(id))));
    entries.sort(java.util.Comparator.comparing(Entry::key));
    return entries;
  }

  public static void verifyClasses(Path jar, Entry entry) throws IOException {
    try (JarFile archive = new JarFile(jar.toFile())) {
      for (String name : entry.getClasses()) {
        if (archive.getJarEntry(name.replace('.', '/') + ".class") == null) {
          throw new PluginStorageException("PLUGIN_CLASS_MISSING", "The selected JAR does not contain every class required by its catalog entry.");
        }
      }
    }
  }

  private static String className(Document row) {
    String name = row.getString("implementingClass");
    if (name == null || name.isEmpty()) {
      throw new PluginStorageException("PLUGIN_CATALOG_INVALID", "An installed plugin has no implementing class.");
    }
    return name;
  }

  private boolean installed(Document row) {
    return visibility.isInstalled(row.getString("installationId")) && visibility.isRecordAvailable(row);
  }

  private static String referenceId(Object value) {
    Object id = value instanceof DBRef ? ((DBRef) value).getId()
        : value instanceof Document ? ((Document) value).get("$id") : null;
    return id == null ? null : id.toString();
  }
}
