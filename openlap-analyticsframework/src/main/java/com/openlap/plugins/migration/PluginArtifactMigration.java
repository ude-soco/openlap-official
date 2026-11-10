package com.openlap.plugins.migration;

import com.openlap.configurations.Utils;
import com.openlap.plugins.PluginJarFiles;
import com.openlap.plugins.artifacts.ArtifactIntegrity;
import com.openlap.plugins.artifacts.PluginArtifact;
import com.openlap.plugins.artifacts.PluginArtifactRegistry;
import com.openlap.plugins.artifacts.PluginCatalog;
import com.openlap.plugins.artifacts.PluginStorageException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Stream;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

/** Explicit, additive import. Never creates catalog entries, changes IDs/statuses or deletes data. */
public final class PluginArtifactMigration {
  private final MongoTemplate mongo;
  private final PluginCatalog catalog;
  private final List<Path> roots = new ArrayList<>();

  public PluginArtifactMigration(MongoTemplate mongo, List<Path> sourceRoots) throws IOException {
    this.mongo = mongo;
    catalog = new PluginCatalog(mongo);
    if (sourceRoots.isEmpty()) throw problem("Supply at least one explicit JAR source root.");
    for (Path root : sourceRoots) {
      Path real = root.toRealPath();
      if (!Files.isDirectory(real)) throw problem("Every JAR source root must be a directory.");
      roots.add(real);
    }
  }

  public PluginArtifactManifest inventory() throws IOException {
    PluginArtifactManifest manifest = new PluginArtifactManifest();
    Map<Path, PluginArtifactManifest.Source> sources = new LinkedHashMap<>();
    Map<String, Set<String>> variants = new HashMap<>();
    for (Path root : roots) {
      try (Stream<Path> paths = Files.walk(root)) {
        for (Path path : (Iterable<Path>) paths::iterator) {
          if (!path.getFileName().toString().toLowerCase(java.util.Locale.ROOT).endsWith(".jar")
              || !Files.isRegularFile(path, LinkOption.NOFOLLOW_LINKS)) continue;
          PluginArtifactManifest.Source source = new PluginArtifactManifest.Source();
          source.sourcePath = path.toRealPath().toString();
          try {
            Path real = requireSource(source.sourcePath);
            source.sizeBytes = Files.size(real);
            requireJarSize(source.sizeBytes);
            PluginJarFiles.validate(real);
            source.sha256 = ArtifactIntegrity.sha256(real);
            variants.computeIfAbsent(real.getFileName().toString(), name -> new HashSet<>()).add(source.sha256);
          } catch (RuntimeException | IOException e) { source.problem = "JAR_UNAVAILABLE_OR_INVALID"; }
          sources.put(path.toRealPath(), source);
        }
      }
    }
    manifest.files.addAll(sources.values());
    manifest.files.sort(java.util.Comparator.comparing(file -> file.sourcePath));
    for (PluginCatalog.Entry entry : catalog.entries()) {
      PluginArtifactManifest.Item item = new PluginArtifactManifest.Item();
      item.kind = entry.getKind();
      item.catalogId = entry.getId();
      item.recordedPath = entry.getRecordedPath();
      try {
        Path recorded = requireSource(entry.getRecordedPath());
        PluginArtifactManifest.Source source = sources.get(recorded);
        if (source == null || source.problem != null) throw problem("Missing source.");
        if (variants.get(recorded.getFileName().toString()).size() > 1) {
          item.problem = "CONFLICTING_COPIES_CHOOSE_SOURCE_EXPLICITLY";
        } else {
          PluginCatalog.verifyClasses(recorded, entry);
          item.sourcePath = recorded.toString();
          item.sha256 = source.sha256;
          item.sizeBytes = source.sizeBytes;
        }
      } catch (RuntimeException | IOException e) { item.problem = "MAP_VERIFIED_SOURCE_EXPLICITLY"; }
      manifest.entries.add(item);
    }
    return manifest;
  }

  public List<PluginCatalog.Entry> preflight(PluginArtifactManifest manifest) throws IOException {
    if (manifest == null || manifest.version != 1 || manifest.entries == null) {
      throw problem("Unsupported or incomplete artifact manifest.");
    }
    List<PluginCatalog.Entry> entries = catalog.entries();
    Map<String, PluginCatalog.Entry> current = index(entries);
    Set<String> seen = new HashSet<>();
    for (PluginArtifactManifest.Item item : manifest.entries) {
      if (item == null || item.kind == null || item.catalogId == null) throw problem("Incomplete catalog mapping.");
      String key = item.kind.name() + ":" + item.catalogId;
      PluginCatalog.Entry entry = current.get(key);
      if (!seen.add(key) || entry == null || !Objects.equals(item.recordedPath, entry.getRecordedPath())) {
        throw problem("The catalog changed or a mapping is duplicated. Rebuild and review the inventory.");
      }
      PluginArtifact identity = PluginArtifact.staged(item.kind, item.sha256, item.sizeBytes, "migration");
      if (entry.getArtifactId() != null && !entry.getArtifactId().equals(identity.getId())) {
        throw problem("A catalog entry already references another artifact. No replacement was performed.");
      }
      Path source = requireSource(item.sourcePath);
      PluginJarFiles.validate(source);
      ArtifactIntegrity.verify(source, identity);
      PluginCatalog.verifyClasses(source, entry);
    }
    if (!seen.equals(current.keySet())) throw problem("The manifest must cover the complete installed catalog.");
    return entries;
  }

  public int apply(PluginArtifactManifest manifest, PluginArtifactRegistry registry) throws IOException {
    List<PluginCatalog.Entry> before = preflight(manifest);
    Map<String, String> artifacts = new HashMap<>();
    // Finish all object writes and verification before attaching any catalog reference.
    for (PluginArtifactManifest.Item item : manifest.entries) {
      PluginArtifact ready = registry.ensureStored(item.kind, requireSource(item.sourcePath), item.sha256,
          item.sizeBytes, "artifact-migration-v1");
      artifacts.put(item.kind.name() + ":" + item.catalogId, ready.getId());
    }
    Map<String, PluginCatalog.Entry> latest = index(catalog.entries());
    if (!latest.keySet().equals(index(before).keySet())) throw problem("The catalog changed during import. Retry after pausing plugin writes.");
    for (PluginCatalog.Entry entry : before) {
      PluginCatalog.Entry now = latest.get(entry.key());
      if (!Objects.equals(now.getRecordedPath(), entry.getRecordedPath()) || !now.getClasses().equals(entry.getClasses())) {
        throw problem("The installed plugin definition changed during import. Rebuild the inventory.");
      }
    }
    for (PluginCatalog.Entry entry : before) {
      String artifactId = artifacts.get(entry.key());
      Criteria predicate = Criteria.where("_id").is(entry.getRawId()).and(entry.pathField()).is(entry.getRecordedPath())
          .orOperator(Criteria.where("artifactId").is(null), Criteria.where("artifactId").is(artifactId));
      if (entry.getKind() == com.openlap.plugins.artifacts.PluginKind.ANALYTICS) {
        predicate.and("implementingClass").is(entry.getClasses().get(0));
      }
      if (mongo.updateFirst(Query.query(predicate), Update.update("artifactId", artifactId), entry.collection()).getMatchedCount() != 1) {
        throw problem("A catalog entry changed during attachment. Completed references are safe to retry.");
      }
    }
    List<PluginCatalog.Entry> after = catalog.entries();
    if (!index(after).keySet().equals(latest.keySet()) || after.stream().anyMatch(entry ->
        !Objects.equals(entry.getArtifactId(), artifacts.get(entry.key()))
            || !Objects.equals(entry.getRecordedPath(), latest.get(entry.key()).getRecordedPath())
            || !entry.getClasses().equals(latest.get(entry.key()).getClasses()))) {
      throw problem("The catalog changed before final verification. Keep local mode enabled and retry.");
    }
    return before.size();
  }

  private Path requireSource(String source) throws IOException {
    if (source == null || source.isEmpty()) throw problem("Every catalog entry needs an explicit source mapping.");
    Path requested = Paths.get(source);
    Utils.requireSafeJarFileName(requested.getFileName().toString());
    Path real = requested.toRealPath();
    // Validate the real filename too, before reading, so a JAR symlink cannot target env/credential files.
    Utils.requireSafeJarFileName(real.getFileName().toString());
    if (roots.stream().noneMatch(real::startsWith) || !Files.isRegularFile(real)) {
      throw problem("Every source JAR must remain inside an explicitly approved source root.");
    }
    return real;
  }

  private static void requireJarSize(long size) {
    if (size <= 0 || size > 100L * 1024 * 1024) throw problem("Source JARs must be nonempty and at most 100 MiB.");
  }

  private static Map<String, PluginCatalog.Entry> index(List<PluginCatalog.Entry> entries) {
    Map<String, PluginCatalog.Entry> result = new HashMap<>();
    entries.forEach(entry -> result.put(entry.key(), entry));
    return result;
  }

  private static PluginStorageException problem(String message) {
    return new PluginStorageException("PLUGIN_MIGRATION_CONFLICT", message);
  }
}
