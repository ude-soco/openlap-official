package com.openlap.community.adaptation;

import com.openlap.infrastructure.exception.ValidationException;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import org.bson.Document;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Repository;

/** A short-lived capability for one successful private draft preview, never a cached dataset. */
@Repository
public class AdaptationProofStore {
  static final String COLLECTION = "community-indicator-adaptation-preview";
  private final MongoTemplate mongo;
  private volatile boolean indexed;

  public AdaptationProofStore(@Qualifier("primaryMongoTemplate") MongoTemplate mongo) { this.mongo = mongo; }

  private synchronized void indexes() {
    if (indexed) return;
    mongo.getCollection(COLLECTION).createIndex(new Document("expiresAt", 1),
        new com.mongodb.client.model.IndexOptions().expireAfter(0L, java.util.concurrent.TimeUnit.SECONDS));
    indexed = true;
  }

  public String create(String owner, String draftId, long revision, String hash, AdaptationExecution.Result result) {
    indexes();
    String id = UUID.randomUUID().toString();
    mongo.getCollection(COLLECTION).insertOne(new Document("_id", id).append("owner", owner)
        .append("draftId", draftId).append("revision", revision).append("configurationHash", hash)
        .append("bindingsHash", result.bindingsHash()).append("pluginsHash", result.pluginsHash())
        .append("createdAt", new Date()).append("expiresAt", Date.from(Instant.now().plusSeconds(900))));
    return id;
  }

  public Document require(String id, String owner, String draftId, long revision, String hash) {
    if (id == null || !id.matches("[0-9a-f-]{36}")) throw invalid();
    Document value = mongo.getCollection(COLLECTION).find(new Document("_id", id).append("owner", owner)
        .append("draftId", draftId).append("revision", revision).append("configurationHash", hash)).first();
    if (value == null || !(value.get("expiresAt") instanceof Date expiry) || !expiry.toInstant().isAfter(Instant.now())) throw invalid();
    return value;
  }

  public static ValidationException invalid() {
    return new ValidationException("ADAPTATION_PREVIEW_REQUIRED", "Preview this draft with your current data before saving it.");
  }
}
