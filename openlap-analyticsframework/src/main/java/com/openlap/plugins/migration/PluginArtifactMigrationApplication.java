package com.openlap.plugins.migration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.openlap.plugins.artifacts.PluginArtifactRegistry;
import com.openlap.plugins.artifacts.PluginArtifactRepository;
import com.openlap.plugins.artifacts.PluginStorageException;
import com.openlap.plugins.artifacts.PluginStorageProperties;
import com.openlap.plugins.artifacts.S3ArtifactObjectStore;
import java.io.Writer;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.repository.support.MongoRepositoryFactory;

/** Starts no HTTP server, seeds no users, and connects only to the primary OpenLAP database. */
public final class PluginArtifactMigrationApplication {
  private PluginArtifactMigrationApplication() {}

  public static void main(String[] args) {
    try { execute(args); }
    catch (Exception e) {
      String message = e instanceof PluginStorageException ? e.getMessage()
          : "Migration failed; check the manifest, sources, configuration and service availability.";
      System.err.println(message);
      System.err.println(usage().getMessage());
      System.err.println("Keep local mode enabled until the complete catalog passes verification. No catalog entries were removed.");
      System.exit(1);
    }
  }

  static void execute(String[] args) throws Exception {
    execute(args, System.getenv());
  }

  static void execute(String[] args, Map<String, String> environment) throws Exception {
    String action = null;
    Path manifestPath = null;
    List<Path> roots = new ArrayList<>();
    for (int i = 0; i < args.length; i++) {
      String option = args[i];
      if (i + 1 >= args.length) throw usage();
      if ("--source-root".equals(option)) roots.add(Paths.get(args[++i]));
      else if (("--inventory".equals(option) || "--check".equals(option) || "--apply".equals(option)) && action == null) {
        action = option;
        manifestPath = Paths.get(args[++i]);
      } else throw usage();
    }
    if (action == null || roots.isEmpty()) throw usage();
    if (!manifestPath.getFileName().toString().endsWith(".json")) throw usage();
    String uri = requireEnvironment(environment, "MONGODB_PRIMARY_URI");
    String database = requireEnvironment(environment, "OPENLAP_MONGODB_DB");
    ObjectMapper mapper = new ObjectMapper();
    MongoClient client = MongoClients.create(uri);
    try {
      MongoTemplate mongo = new MongoTemplate(client, database);
      PluginArtifactMigration migration = new PluginArtifactMigration(mongo, roots);
      if ("--inventory".equals(action)) {
        PluginArtifactManifest manifest = migration.inventory();
        try (Writer output = Files.newBufferedWriter(manifestPath, StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE)) {
          mapper.writerWithDefaultPrettyPrinter().writeValue(output, manifest);
        }
        System.out.println("Inventory written: " + manifest.entries.size() + " catalog entries. Review every missing or conflicting source before applying.");
        return;
      }
      Path realManifest = manifestPath.toRealPath();
      if (!realManifest.getFileName().toString().endsWith(".json")) throw usage();
      PluginArtifactManifest manifest = mapper.readValue(realManifest.toFile(), PluginArtifactManifest.class);
      migration.preflight(manifest);
      if ("--check".equals(action)) {
        System.out.println("Preflight passed for " + manifest.entries.size() + " catalog entries. No data changed.");
        return;
      }
      PluginStorageProperties properties = PluginStorageProperties.forMigration(environment);
      try (S3ArtifactObjectStore store = S3ArtifactObjectStore.connect(properties)) {
        PluginArtifactRepository repository = new MongoRepositoryFactory(mongo).getRepository(PluginArtifactRepository.class);
        int count = migration.apply(manifest, new PluginArtifactRegistry(repository, mongo, store));
        System.out.println("Artifact references verified for " + count + " catalog entries. IDs, metadata and enabled states were preserved.");
      }
    } finally { client.close(); }
  }

  private static String requireEnvironment(Map<String, String> environment, String name) {
    String value = environment.get(name);
    if (value == null || value.trim().isEmpty()) {
      throw new IllegalArgumentException("Explicit " + name + " is required for artifact migration.");
    }
    return value;
  }

  private static IllegalArgumentException usage() {
    return new IllegalArgumentException("Use --inventory FILE, --check FILE or --apply FILE, with one or more --source-root DIRECTORY arguments.");
  }
}
