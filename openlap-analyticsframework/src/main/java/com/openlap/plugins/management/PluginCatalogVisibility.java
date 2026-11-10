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

  public boolean isRecordAvailable(org.bson.Document row) {
    String state = row.getString("removalState");
    if (state == null) return true;
    if (mongo == null) return false;
    org.bson.Document operation = mongo.getCollection("plugin-removal").find(new org.bson.Document("_id", row.getString("removalOperation"))).first();
    return operation != null && (("RESTORED".equals(state) && "RESTORED".equals(operation.getString("state")))
        || ("REMOVING".equals(state) && "CANCELLED".equals(operation.getString("state"))));
  }

  public void requireRecordAvailable(org.bson.Document row) {
    if (!isRecordAvailable(row)) throw new ConflictException("PLUGIN_REMOVED", "This plugin was removed or is being removed. Choose an available entry or restore it from Removed entries.");
  }

  public boolean isVisible(String installationId, String collection, String id) {
    if (!isInstalled(installationId)) return false;
    if (mongo == null) return true;
    org.bson.Document row = row(collection, id);
    return row != null && isRecordAvailable(row);
  }

  public void requireExecutable(String installationId, String collection, String id) {
    requireInstalled(installationId);
    if (mongo == null) return;
    org.bson.Document row = row(collection, id);
    if (row == null) throw new ConflictException("PLUGIN_REMOVED", "This plugin is no longer available.");
    // Removal freezes reference creation, while existing in-flight execution can finish using retained bytes.
    if (!"REMOVING".equals(row.getString("removalState"))) requireRecordAvailable(row);
  }

  private org.bson.Document row(String collection, String id) {
    org.bson.Document row = mongo.getCollection(collection).find(new org.bson.Document("_id", id)).first();
    if (row == null && org.bson.types.ObjectId.isValid(id)) row = mongo.getCollection(collection).find(new org.bson.Document("_id", new org.bson.types.ObjectId(id))).first();
    return row;
  }
}
