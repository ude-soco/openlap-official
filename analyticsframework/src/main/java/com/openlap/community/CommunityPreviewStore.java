package com.openlap.community;

import com.mongodb.MongoWriteException;
import com.mongodb.client.model.FindOneAndUpdateOptions;
import com.mongodb.client.model.ReturnDocument;
import com.openlap.infrastructure.exception.ConflictException;
import com.openlap.infrastructure.exception.ValidationException;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import org.bson.Document;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Repository;

/** Durable preview proofs and idempotent copy claims, shared by every backend replica. */
@Repository
public class CommunityPreviewStore {
  static final String RECEIPTS = "community-indicator-preview";
  static final String COPIES = "community-indicator-copy";
  private final MongoTemplate mongo;
  private volatile boolean indexed;

  public CommunityPreviewStore(@Qualifier("primaryMongoTemplate") MongoTemplate mongo) {
    this.mongo = mongo;
  }

  private synchronized void indexes() {
    if (indexed) return;
    mongo.getCollection(RECEIPTS).createIndex(new Document("expiresAt", 1),
        new com.mongodb.client.model.IndexOptions().expireAfter(0L, java.util.concurrent.TimeUnit.SECONDS));
    mongo.getCollection(COPIES).createIndex(new Document("owner", 1).append("poolId", 1),
        new com.mongodb.client.model.IndexOptions().unique(true));
    mongo.getCollection(COPIES).createIndex(new Document("receiptId", 1));
    mongo.getCollection("analytics-indicator").createIndex(new Document("communityCopyPending", 1).append("createdOn", 1));
    indexed = true;
  }

  public void create(Document receipt) {
    indexes();
    mongo.getCollection(RECEIPTS).insertOne(receipt);
  }

  public Document require(String receiptId, String owner, String poolId) {
    if (receiptId == null || !receiptId.matches("[0-9a-f-]{36}")) throw invalid();
    Document found = mongo.getCollection(RECEIPTS).find(new Document("_id", receiptId)
        .append("owner", owner).append("poolId", poolId)).first();
    if (found == null || !(found.get("expiresAt") instanceof Date expiry)
        || !expiry.toInstant().isAfter(Instant.now())) throw invalid();
    return found;
  }

  public Document existing(String owner, String poolId) {
    return mongo.getCollection(COPIES).find(new Document("owner", owner).append("poolId", poolId)).first();
  }

  public Document claim(Document receipt) {
    indexes();
    Document identity = new Document("owner", receipt.getString("owner"))
        .append("poolId", receipt.getString("poolId"));
    Document inserted = new Document(identity).append("receiptId", receipt.getString("_id"))
        .append("targetId", receipt.getString("targetId")).append("version", receipt.getString("version"))
        .append("targetIds", new java.util.ArrayList<>(receipt.get("targets", Document.class).values())).append("state", "PENDING")
        .append("createdAt", new Date());
    try {
      return mongo.getCollection(COPIES).findOneAndUpdate(identity,
          new Document("$setOnInsert", inserted),
          new FindOneAndUpdateOptions().upsert(true).returnDocument(ReturnDocument.AFTER));
    } catch (MongoWriteException race) {
      if (race.getError().getCode() != 11000) throw race;
      return existing(receipt.getString("owner"), receipt.getString("poolId"));
    }
  }

  public String acquire(Document receipt) {
    String token = java.util.UUID.randomUUID().toString();
    Document filter = new Document("owner", receipt.getString("owner")).append("poolId", receipt.getString("poolId"))
        .append("receiptId", receipt.getString("_id")).append("state", "PENDING")
        .append("$or", List.of(new Document("leaseUntil", new Document("$exists", false)),
            new Document("leaseUntil", new Document("$lt", new Date()))));
    if (mongo.getCollection(COPIES).updateOne(filter, new Document("$set", new Document("lease", token)
        .append("leaseUntil", Date.from(Instant.now().plusSeconds(300))))).getMatchedCount() != 1)
      throw new ConflictException("COPY_IN_PROGRESS", "This community indicator is already being saved. Try again shortly.");
    return token;
  }

  public void requireLease(Document receipt, String token) {
    if (mongo.getCollection(COPIES).find(new Document("owner", receipt.getString("owner"))
        .append("poolId", receipt.getString("poolId")).append("receiptId", receipt.getString("_id"))
        .append("lease", token).append("leaseUntil", new Document("$gt", new Date()))).first() == null)
      throw new ConflictException("COPY_IN_PROGRESS", "This save needs to be retried. Your dashboard will show only complete copies.");
  }

  public void releaseLease(Document receipt, String token) {
    mongo.getCollection(COPIES).updateOne(new Document("owner", receipt.getString("owner"))
        .append("poolId", receipt.getString("poolId")).append("lease", token),
        new Document("$unset", new Document("lease", "").append("leaseUntil", "")));
  }

  public void complete(Document receipt, String token) {
    if (mongo.getCollection(COPIES).updateOne(new Document("owner", receipt.getString("owner"))
            .append("poolId", receipt.getString("poolId")).append("receiptId", receipt.getString("_id")).append("lease", token),
        new Document("$set", new Document("state", "SAVED").append("savedAt", new Date())))
        .getMatchedCount() != 1) throw new ConflictException("COPY_CHANGED", "The community copy changed. Refresh your dashboard.");
  }


  public List<Document> expiredClaims() {
    return mongo.getCollection(COPIES).find(new Document("state", "PENDING")
        .append("createdAt", new Document("$lt", Date.from(Instant.now().minusSeconds(15 * 60))))).limit(25).into(new java.util.ArrayList<>());
  }

  public String acquireCleanup(Document copy) {
    String token = java.util.UUID.randomUUID().toString();
    Document filter = new Document("owner", copy.getString("owner")).append("poolId", copy.getString("poolId"))
        .append("receiptId", copy.getString("receiptId"))
        .append("$or", List.of(new Document("leaseUntil", new Document("$exists", false)),
            new Document("leaseUntil", new Document("$lt", new Date()))));
    if (mongo.getCollection(COPIES).updateOne(filter, new Document("$set", new Document("lease", token)
        .append("leaseUntil", Date.from(Instant.now().plusSeconds(300))))).getMatchedCount() != 1)
      throw new ConflictException("COPY_IN_PROGRESS", "This community indicator is already being saved. Try again shortly.");
    return token;
  }

  public void abandon(Document copy, String token) {
    mongo.getCollection(COPIES).deleteOne(new Document("owner", copy.getString("owner"))
        .append("poolId", copy.getString("poolId")).append("receiptId", copy.getString("receiptId")).append("lease", token));
  }

  public void recoverComplete(Document copy, String token) {
    mongo.getCollection(COPIES).updateOne(new Document("owner", copy.getString("owner"))
        .append("poolId", copy.getString("poolId")).append("receiptId", copy.getString("receiptId")).append("lease", token),
        new Document("$set", new Document("state", "SAVED")).append("$unset", new Document("lease", "").append("leaseUntil", "")));
  }

  /** Only IDs/provenance are read. A late worker can insert after its abandoned claim was removed. */
  static List<Document> orphanPipeline(Date cutoff) {
    return List.of(
        new Document("$match", new Document("communityCopyPending", new Document("$type", "string").append("$ne", ""))
            .append("createdOn", new Document("$lt", cutoff))),
        new Document("$project", new Document("_id", 1).append("createdBy", 1).append("createdOn", 1)
            .append("communitySourceId", 1).append("communitySourceVersion", 1)
            .append("communityCopyPending", 1).append("communityDependency", 1)),
        new Document("$lookup", new Document("from", COPIES).append("localField", "communityCopyPending")
            .append("foreignField", "receiptId").append("as", "_copyClaims")),
        new Document("$match", new Document("_copyClaims", new Document("$size", 0))),
        new Document("$sort", new Document("communityDependency", 1).append("createdOn", 1).append("_id", 1)),
        new Document("$limit", 50),
        new Document("$project", new Document("_copyClaims", 0)));
  }

  public List<Document> orphanPendingRows() {
    indexes();
    return mongo.getCollection("analytics-indicator").aggregate(orphanPipeline(
        Date.from(Instant.now().minusSeconds(15 * 60)))).into(new java.util.ArrayList<>());
  }

  public boolean hasClaim(String owner, String poolId, String receiptId) {
    return mongo.getCollection(COPIES).find(new Document("owner", owner).append("poolId", poolId)
        .append("receiptId", receiptId)).projection(new Document("_id", 1)).first() != null;
  }

  public static ValidationException invalid() {
    return new ValidationException("PREVIEW_REQUIRED", "Preview this indicator with your data again before saving it.");
  }
}
