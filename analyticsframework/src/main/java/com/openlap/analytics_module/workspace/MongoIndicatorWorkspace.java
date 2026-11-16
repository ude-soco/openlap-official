package com.openlap.analytics_module.workspace;

import com.openlap.analytics_module.drafts.IndicatorDraftStore;
import com.openlap.infrastructure.exception.DatabaseOperationException;
import java.time.Instant;
import java.util.*;
import java.util.regex.Pattern;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.domain.*;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Repository;

/** Both kinds are filtered, counted and paged in one aggregate; no client-side page merging. */
@Repository
public class MongoIndicatorWorkspace {
  static final String SAVED = "analytics-indicator";
  private final MongoTemplate mongo;
  private volatile boolean indexed;

  public MongoIndicatorWorkspace(@Qualifier("primaryMongoTemplate") MongoTemplate mongo) {
    this.mongo = mongo;
  }

  private synchronized void indexes() {
    if (indexed) return;
    mongo
        .getCollection(SAVED)
        .createIndex(new Document("createdBy.$id", 1).append("createdOn", -1));
    mongo
        .getCollection(IndicatorDraftStore.COLLECTION)
        .createIndex(new Document("ownerId", 1).append("status", 1).append("updatedAt", -1));
    indexed = true;
  }

  private static Document literal(Object value) {
    return new Document("$literal", value);
  }

  private static Document fallback(Object value, Object otherwise) {
    return new Document("$ifNull", Arrays.asList(value, otherwise));
  }

  private static List<Document> branch(String owner, IndicatorWorkspaceQuery query, boolean draft) {
    Document filter =
        draft
            ? new Document("ownerId", owner)
                .append("status", new Document("$in", List.of("DRAFT", "COMPLETING")))
            : new Document("createdBy.$id", ObjectId.isValid(owner) ? new ObjectId(owner) : owner);
    if (!draft) {
      filter.append("communityCopyPending", null).append("communityDependency", new Document("$ne", true));
    }
    if (query.indicatorType() != null) filter.put("indicatorType", query.indicatorType());
    Document projection =
        new Document("_id", 0)
            .append("id", new Document("$toString", "$_id"))
            .append("kind", literal(draft ? "DRAFT" : "SAVED"))
            .append("status", literal(draft ? "DRAFT" : "SAVED"))
            .append("name", fallback("$name", literal("Untitled indicator")))
            .append("indicatorType", 1)
            .append("communityCopy", new Document("$ne", Arrays.asList(
                fallback(draft ? fallback("$communitySourceId", "$sourceSnapshot.communitySourceId") : "$communitySourceId", literal("")), literal(""))))
            .append("communityAdapted", draft
                ? fallback("$communityAdapted", fallback("$sourceSnapshot.communityAdapted", false))
                : fallback("$communityAdapted", false))
            .append("communityDependency", draft ? literal(false) : fallback("$communityDependency", false))
            .append("createdAt", draft ? fallback("$createdAt", "$lastUpdated") : "$createdOn")
            .append(
                "updatedAt",
                draft
                    ? fallback("$updatedAt", "$lastUpdated")
                    : fallback("$updatedAt", "$createdOn"))
            .append("revision", draft ? fallback("$revision", 0L) : literal(null))
            .append(
                "sourceIndicatorId", draft ? fallback("$sourceIndicatorId", null) : literal(null))
            .append("recoverable", draft ? fallback("$recoverable", false) : literal(null))
            .append(
                "completionPending",
                draft ? new Document("$eq", List.of("$status", "COMPLETING")) : literal(false));
    return List.of(new Document("$match", filter), new Document("$project", projection));
  }

  static List<Document> pipeline(String owner, IndicatorWorkspaceQuery query) {
    List<Document> stages = new ArrayList<>(branch(owner, query, query.draftsOnly()));
    if (!query.draftsOnly())
      stages.add(
          new Document(
              "$unionWith",
              new Document("coll", IndicatorDraftStore.COLLECTION)
                  .append("pipeline", branch(owner, query, true))));
    if (!query.origin().isEmpty()) stages.add(new Document("$match",
        new Document("communityCopy", "COMMUNITY".equals(query.origin()))));
    if (!query.search().isEmpty())
      stages.add(
          new Document(
              "$match",
              new Document(
                  "name",
                  Pattern.compile(Pattern.quote(query.search()), Pattern.CASE_INSENSITIVE))));
    Document sort =
        new Document(query.sortBy(), query.descending() ? -1 : 1).append("kind", 1).append("id", 1);
    stages.add(
        new Document(
            "$facet",
            new Document(
                    "content",
                    List.of(
                        new Document("$sort", sort),
                        new Document("$skip", Math.multiplyExact(query.page(), query.size())),
                        new Document("$limit", query.size())))
                .append("total", List.of(new Document("$count", "value")))));
    return stages;
  }

  public Page<IndicatorWorkspaceRow> page(String owner, IndicatorWorkspaceQuery query) {
    try {
      indexes();
      Document result =
          mongo
              .getCollection(query.draftsOnly() ? IndicatorDraftStore.COLLECTION : SAVED)
              .aggregate(pipeline(owner, query))
              .first();
      if (result == null) return Page.empty(PageRequest.of(query.page(), query.size()));
      List<Document> content = result.getList("content", Document.class, List.of());
      List<Document> total = result.getList("total", Document.class, List.of());
      long count = total.isEmpty() ? 0 : ((Number) total.get(0).get("value")).longValue();
      return new PageImpl<>(
          content.stream().map(MongoIndicatorWorkspace::row).toList(),
          PageRequest.of(query.page(), query.size()),
          count);
    } catch (RuntimeException error) {
      throw new DatabaseOperationException("Could not access the indicator workspace.", error);
    }
  }

  private static IndicatorWorkspaceRow row(Document row) {
    Number revision = row.get("revision", Number.class);
    return new IndicatorWorkspaceRow(
        row.getString("id"),
        row.getString("kind"),
        row.getString("status"),
        row.getString("name"),
        row.getString("indicatorType"),
        instant(row.get("createdAt")),
        instant(row.get("updatedAt")),
        revision == null ? null : revision.longValue(),
        row.getString("sourceIndicatorId"),
        row.getBoolean("recoverable"),
        Boolean.TRUE.equals(row.getBoolean("completionPending")),
        Boolean.TRUE.equals(row.getBoolean("communityCopy")),
        Boolean.TRUE.equals(row.getBoolean("communityDependency")),
        Boolean.TRUE.equals(row.getBoolean("communityAdapted")));
  }

  private static Instant instant(Object value) {
    return value instanceof Date date ? date.toInstant() : null;
  }
}
