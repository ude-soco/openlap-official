package com.openlap.plugins.migration;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertThrows;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openlap.plugins.artifacts.PluginKind;
import com.openlap.plugins.artifacts.PluginStorageException;
import java.util.HashMap;
import java.util.Map;
import org.junit.Test;

public class PluginArtifactMigrationApplicationTest {
  private static final String[] INVENTORY = {
      "--inventory", "/unavailable/new-inventory.json", "--source-root", "/unavailable/sources"
  };

  @Test
  public void refusesAnImplicitDatabaseTargetBeforeOpeningSourcesOrConnecting() {
    IllegalArgumentException failure = assertThrows(IllegalArgumentException.class,
        () -> PluginArtifactMigrationApplication.execute(INVENTORY, Map.of()));
    assertEquals("Explicit MONGODB_PRIMARY_URI is required for artifact migration.", failure.getMessage());
  }

  @Test
  public void requiresTheDatabaseNameEvenWhenTheUriHasOne() {
    IllegalArgumentException failure = assertThrows(IllegalArgumentException.class,
        () -> PluginArtifactMigrationApplication.execute(INVENTORY,
            Map.of("MONGODB_PRIMARY_URI", "mongodb://invalid.example:27017/other-database")));
    assertEquals("Explicit OPENLAP_MONGODB_DB is required for artifact migration.", failure.getMessage());
  }

  @Test
  public void rejectsBlankTargetsWithoutEchoingOtherConfiguration() {
    for (String key : new String[]{"MONGODB_PRIMARY_URI", "OPENLAP_MONGODB_DB"}) {
      Map<String, String> environment = new HashMap<>();
      environment.put("MONGODB_PRIMARY_URI", "mongodb://sentinel-user:sentinel-secret@invalid.example:27017");
      environment.put("OPENLAP_MONGODB_DB", "reviewed_database");
      environment.put(key, " \t");
      IllegalArgumentException failure = assertThrows(IllegalArgumentException.class,
          () -> PluginArtifactMigrationApplication.execute(INVENTORY, environment));
      assertEquals("Explicit " + key + " is required for artifact migration.", failure.getMessage());
    }
  }

  @Test
  public void reportActionStillRequiresAnExplicitTarget() {
    IllegalArgumentException failure = assertThrows(IllegalArgumentException.class,
        () -> PluginArtifactMigrationApplication.execute(
            new String[]{"--inventory-report", "/unavailable/new.json", "--source-root", "/unavailable"}, Map.of()));
    assertEquals("Explicit MONGODB_PRIMARY_URI is required for artifact migration.", failure.getMessage());
  }

  @Test
  public void operationalReportRoundTripsOnlyTheCatalogManifest() throws Exception {
    PluginArtifactManifest manifest = new PluginArtifactManifest();
    PluginArtifactManifest.Item entry = new PluginArtifactManifest.Item();
    entry.kind = PluginKind.ANALYTICS;
    entry.catalogId = "synthetic-catalog-id";
    entry.recordedPath = "/legacy/analytics.jar";
    entry.problem = "MAP_VERIFIED_SOURCE_EXPLICITLY";
    manifest.entries.add(entry);
    PluginArtifactManifest decoded = new ObjectMapper().readValue(
        PluginArtifactMigrationApplication.inventoryReport(manifest), PluginArtifactManifest.class);
    assertEquals(1, decoded.entries.size());
    assertEquals(entry.recordedPath, decoded.entries.get(0).recordedPath);
    assertEquals(entry.catalogId, decoded.entries.get(0).catalogId);
    assertEquals(entry.problem, decoded.entries.get(0).problem);
  }

  @Test
  public void oversizedOperationalReportsFailBeforePublication() {
    PluginArtifactManifest manifest = new PluginArtifactManifest();
    PluginArtifactManifest.Item entry = new PluginArtifactManifest.Item();
    entry.recordedPath = "x".repeat(65536);
    manifest.entries.add(entry);
    PluginStorageException failure = assertThrows(PluginStorageException.class,
        () -> PluginArtifactMigrationApplication.inventoryReport(manifest));
    assertEquals("Catalog review report exceeds 64 KiB; rerun with --inventory to create only a private inventory file.", failure.getMessage());
  }

  @Test
  public void rejectsAnUnconfiguredActionBeforeConsideringServiceConfiguration() {
    assertThrows(IllegalArgumentException.class,
        () -> PluginArtifactMigrationApplication.execute(new String[]{"--configure-migration-action"}, Map.of()));
  }
}
