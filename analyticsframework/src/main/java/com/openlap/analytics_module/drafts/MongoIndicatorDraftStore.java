package com.openlap.analytics_module.drafts;

import com.mongodb.MongoWriteException;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.model.IndexOptions;
import com.openlap.plugins.management.PluginReferenceFence;
import java.util.*;
import java.util.regex.Pattern;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.domain.*;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class MongoIndicatorDraftStore implements IndicatorDraftStore {
  private final MongoTemplate mongo;
  private final PluginReferenceFence plugins;
  private volatile boolean indexed;
  public MongoIndicatorDraftStore(@Qualifier("primaryMongoTemplate") MongoTemplate mongo) {
    this.mongo = mongo; this.plugins = new PluginReferenceFence(mongo);
  }
  private MongoCollection<Document> rows() { return mongo.getCollection(COLLECTION); }
  private synchronized void indexes() {
    if (indexed) return;
    rows().createIndex(new Document("activeSourceKey", 1),
        new IndexOptions().name("unique_active_indicator_edit_draft").unique(true).sparse(true));
    rows().createIndex(new Document("ownerId", 1).append("status", 1).append("updatedAt", -1));
    indexed = true;
  }
  static Document owner(String id) {
    List<Document> choices = new ArrayList<>(); choices.add(new Document("ownerId", id));
    choices.add(new Document("ownerId", new Document("$exists", false))
        .append("createdBy.$id", ObjectId.isValid(id) ? new ObjectId(id) : id));
    return new Document("$or", choices);
  }
  private static Document identity(String id) {
    return new Document("_id", ObjectId.isValid(id)
        ? new Document("$in", List.of(id, new ObjectId(id))) : id);
  }
  @Override public Document find(String owner, String id) {
    return rows().find(new Document("$and", List.of(owner(owner), identity(id)))).first();
  }
  @Override public Document findActiveEdit(String owner, String sourceId) {
    return rows().find(new Document("activeSourceKey", owner + ":" + sourceId)).first();
  }
  @Override public boolean insert(Document document) {
    indexes(); plugins.beforeSave(document, COLLECTION);
    try { rows().insertOne(document); }
    catch (MongoWriteException error) {
      if (error.getError().getCode() != 11000) throw error;
      plugins.afterSave(document); return false;
    }
    plugins.afterSave(document); return true;
  }
  @Override public boolean replace(String owner, Document previous, Document replacement) {
    Document filter = owner(owner); filter.put("_id", previous.get("_id"));
    filter.put("revision", previous.containsKey("revision") ? previous.get("revision") : new Document("$exists", false));
    filter.put("status", previous.containsKey("status") ? previous.get("status") : new Document("$exists", false));
    plugins.beforeSave(replacement, COLLECTION);
    boolean changed = rows().replaceOne(filter, replacement).getMatchedCount() == 1;
    // The conditional write is known to have completed, including a nonmatching CAS.
    plugins.afterSave(replacement);
    if (changed) plugins.afterSave(previous);
    return changed;
  }
  @Override public Page<Document> list(String owner, int page, int size, String search,
      String type, String sortBy, boolean descending) {
    Document filter = new Document("$and", new ArrayList<>(List.of(owner(owner),
        new Document("$or", List.of(new Document("status", "DRAFT"),
            new Document("status", "COMPLETING"), new Document("status", new Document("$exists", false)))))));
    if (!search.isBlank()) filter.put("name", Pattern.compile(Pattern.quote(search), Pattern.CASE_INSENSITIVE));
    if (type != null) filter.put("indicatorType", type);
    long count = rows().countDocuments(filter);
    List<Document> found = rows().find(filter).sort(new Document(sortBy, descending ? -1 : 1).append("_id", 1))
        .skip(Math.multiplyExact(page, size)).limit(size).into(new ArrayList<>());
    return new PageImpl<>(found, PageRequest.of(page, size), count);
  }
}
