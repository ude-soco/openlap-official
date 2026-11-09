package com.openlap.plugins.management;

import com.openlap.infrastructure.exception.ConflictException;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Component;

/** One atomic installation-state transition publishes all entries together. Fail closed on DB errors. */
@Component
public class PluginCatalogVisibility {
  private final MongoTemplate mongo;

  public PluginCatalogVisibility(MongoTemplate mongo) { this.mongo = mongo; }

  public static PluginCatalogVisibility legacyOnly() { return new PluginCatalogVisibility(null); }

  public boolean isInstalled(String installationId) {
    return installationId == null || (mongo != null && mongo.exists(Query.query(Criteria.where("_id").is(installationId)
        .and("state").is("ACTIVE")), "plugin-installation"));
  }

  public void requireInstalled(String installationId) {
    if (!isInstalled(installationId)) throw new ConflictException("PLUGIN_INSTALLATION_INCOMPLETE",
        "This plugin installation is incomplete. Finish activation in Administration before using it.");
  }
}
