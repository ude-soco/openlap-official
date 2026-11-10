package com.openlap.plugins;

import com.openlap.infrastructure.exception.ConflictException;

/** Legacy removal cannot protect references or shared JARs. Keep it closed during migration. */
public class LegacyPluginDeletionException extends ConflictException {
  public LegacyPluginDeletionException() {
    super("PLUGIN_DELETE_UNAVAILABLE",
        "This legacy operation cannot safely remove installed plugins. "
            + "Use Disable in Administration to retire a plugin and preserve existing indicators.");
  }
}
