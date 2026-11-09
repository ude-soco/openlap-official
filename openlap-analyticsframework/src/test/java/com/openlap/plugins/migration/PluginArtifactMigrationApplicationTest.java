package com.openlap.plugins.migration;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertThrows;

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
  public void rejectsAnUnconfiguredActionBeforeConsideringServiceConfiguration() {
    assertThrows(IllegalArgumentException.class,
        () -> PluginArtifactMigrationApplication.execute(new String[]{"--configure-migration-action"}, Map.of()));
  }
}
