package com.openlap.content.migration;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.openlap.content.ContentEntry;
import com.openlap.content.ContentKind;
import com.openlap.content.ContentValidator;
import com.openlap.infrastructure.exception.ConflictException;
import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.bson.Document;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

/** Explicit migration only. Never attached to application startup. */
public class HomepageContentMigration {
  public static final String ID = "homepage-content-v1";
  public static final String LEDGER = "content_migrations";
  private final MongoTemplate mongo;
  private final ContentValidator validator;
  private final ObjectMapper mapper;

  public HomepageContentMigration(MongoTemplate mongo, ContentValidator validator, ObjectMapper mapper) {
    this.mongo = mongo;
    this.validator = validator;
    this.mapper = mapper;
  }

  /** Returns false after completion, even if imported content was later deleted. */
  public boolean migrate(boolean resumeAbandoned) throws IOException {
    Query identity = Query.query(Criteria.where("_id").is(ID));
    try {
      mongo.upsert(identity, new Update().setOnInsert("state", "PENDING"), LEDGER);
    } catch (DuplicateKeyException anotherInitializer) {
      // Concurrent creation of the same ledger identity is safe; only one claim below wins.
    }
    Document ledger = mongo.findOne(identity, Document.class, LEDGER);
    if (ledger != null && ledger.get("completedAt") != null) return false;
    if (resumeAbandoned) {
      mongo.updateFirst(Query.query(Criteria.where("_id").is(ID).and("completedAt").is(null)),
          new Update().unset("owner"), LEDGER);
    }
    String owner = UUID.randomUUID().toString();
    Query claim = Query.query(Criteria.where("_id").is(ID).and("completedAt").is(null).and("owner").is(null));
    Document claimed = mongo.findAndModify(claim, new Update().set("owner", owner).set("state", "RUNNING")
        .set("startedAt", new Date()), FindAndModifyOptions.options().returnNew(true), Document.class, LEDGER);
    if (claimed == null) {
      Document current = mongo.findOne(identity, Document.class, LEDGER);
      if (current != null && current.get("completedAt") != null) return false;
      throw new ConflictException("Another content migration owns the lock. Stop it before using --resume-abandoned.");
    }
    Query owned = Query.query(Criteria.where("_id").is(ID).and("owner").is(owner));
    try {
      for (ContentKind kind : ContentKind.values()) importKind(kind);
      mongo.updateFirst(owned, new Update().set("state", "COMPLETED").set("completedAt", new Date()).unset("owner"), LEDGER);
      return true;
    } catch (IOException | RuntimeException e) {
      mongo.updateFirst(owned, new Update().set("state", "FAILED").unset("owner"), LEDGER);
      throw e;
    }
  }

  private void importKind(ContentKind kind) throws IOException {
    List<Map<String, Object>> fixture = fixture(kind);
    List<String> ids = new ArrayList<>();
    Instant now = Instant.now();
    int order = 0;
    for (Map<String, Object> raw : fixture) {
      Map<String, Object> data = new LinkedHashMap<>(raw);
      String id = String.valueOf(data.remove(kind == ContentKind.NEWS ? "slug" : "id"));
      Map<String, Object> payload = validator.validate(kind, data, true);
      ids.add(id);
      Update insert = new Update().setOnInsert("draft", payload).setOnInsert("published", payload)
          .setOnInsert("status", "PUBLISHED").setOnInsert("version", 1L)
          .setOnInsert("createdAt", now).setOnInsert("updatedAt", now)
          .setOnInsert("createdBy", "migration:" + ID).setOnInsert("updatedBy", "migration:" + ID)
          .setOnInsert("sortOrder", (long) order++);
      mongo.upsert(Query.query(Criteria.where("_id").is(id)), insert, kind.getCollection());
      ContentEntry saved = mongo.findById(id, ContentEntry.class, kind.getCollection());
      if (saved == null || !payload.equals(saved.getDraft()) || !payload.equals(saved.getPublished())
          || !"PUBLISHED".equals(saved.getStatus()) || saved.getDeletedAt() != null) {
        throw new IllegalStateException("Content migration collision for " + kind.getPath() + "/" + id
            + ": existing content differs from the migration source. No existing content was overwritten."
            + " Resolve the collision before retrying; keep content editing disabled until migration completes.");
      }
    }
    long found = mongo.count(Query.query(Criteria.where("_id").in(ids)), kind.getCollection());
    if (found != fixture.size()) throw new IllegalStateException("Content migration verification failed for " + kind.getPath());
    String dateField = kind == ContentKind.NEWS ? "published.date" : "published.year";
    mongo.indexOps(kind.getCollection()).ensureIndex(new Index().on("status", Sort.Direction.ASC)
        .on(dateField, Sort.Direction.DESC).on("sortOrder", Sort.Direction.ASC).on("_id", Sort.Direction.ASC));
    mongo.indexOps(kind.getCollection()).ensureIndex(new Index().on("updatedAt", Sort.Direction.DESC).on("_id", Sort.Direction.ASC));
  }

  public List<Map<String, Object>> fixture(ContentKind kind) throws IOException {
    String path = "/content-migration/" + kind.getPath() + ".json";
    try (InputStream stream = HomepageContentMigration.class.getResourceAsStream(path)) {
      if (stream == null) throw new IOException("Missing migration fixture: " + path);
      return mapper.readValue(stream, new TypeReference<List<Map<String, Object>>>() {});
    }
  }
}
