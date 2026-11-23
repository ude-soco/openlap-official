package com.openlap.community;

import com.openlap.analytics_module.entities.Indicator;
import com.openlap.infrastructure.exception.NotFoundException;
import com.openlap.infrastructure.exception.ValidationException;
import com.openlap.isc_module.entities.IndicatorSpecificationCard;
import com.openlap.user.entities.User;
import com.openlap.user.services.TokenService;
import jakarta.servlet.http.HttpServletRequest;
import java.time.*;
import java.util.*;
import java.util.regex.Pattern;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.domain.*;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.query.*;
import org.springframework.stereotype.Service;

@Service
public class CommunityCatalogService {
  private final MongoTemplate mongo;
  private final TokenService tokens;
  private final Set<String> indexed = new HashSet<>();
  private final Set<String> migrated = new HashSet<>();
  private static final Set<String> KINDS = Set.of("indicators", "isc");
  public CommunityCatalogService(@Qualifier("primaryMongoTemplate") MongoTemplate mongo, TokenService tokens) {
    this.mongo = mongo; this.tokens = tokens;
  }
  static String collection(String kind) {
    if (!KINDS.contains(kind)) throw unavailable();
    return kind.equals("isc") ? "openlap-isc" : "analytics-indicator";
  }
  static Criteria eligible(String kind) {
    List<Criteria> terms = new ArrayList<>();
    terms.add(Criteria.where("communitySourceId").in(null, ""));
    terms.add(Criteria.where("communityId").exists(true));
    if (kind.equals("isc")) terms.add(Criteria.where("status").in(null, "SAVED"));
    else {
      terms.add(Criteria.where("communityCopyPending").in(null, ""));
      terms.add(Criteria.where("communityDependency").ne(true));
    }
    return new Criteria().andOperator(terms);
  }
  public Page<Map<String, Object>> page(HttpServletRequest request, String kind, int page, int size,
      String search, String sortBy, String direction, String type, String method, String chart, String goal) {
    prepare(kind);
    page = Math.max(0, Math.min(page, 100_000)); size = Math.max(1, Math.min(size, 100));
    String field = "name".equals(sortBy) ? "name" : "updatedAt";
    Sort sort = Sort.by("asc".equalsIgnoreCase(direction) ? Sort.Direction.ASC : Sort.Direction.DESC,
        "communityMetadata." + field).and(Sort.by("communityId"));
    Pageable pageable = PageRequest.of(page, size, sort);
    List<Criteria> terms = new ArrayList<>(List.of(eligible(kind)));
    if (search != null && !search.isBlank()) terms.add(Criteria.where("communityMetadata.name")
        .regex(Pattern.quote(limit(search.strip(), 200)), "i"));
    addFilter(terms, "type", type); addFilter(terms, "method", method);
    addFilter(terms, "chart", chart); addFilter(terms, "goal", goal);
    Query query = new Query(new Criteria().andOperator(terms));
    long total = mongo.count(query, collection(kind));
    query.fields().include("communityId").include("communityMetadata");
    List<Document> rows = mongo.find(query.with(pageable), Document.class, collection(kind));
    return new PageImpl<>(publicRows(request, kind, rows), pageable, total);
  }
  List<Map<String, Object>> publicRows(HttpServletRequest request, String kind, List<Document> rows) {
    User owner = tokens.getUserFromToken(request);
    Map<String, String> copied = copiedIds(kind, rows.stream().map(row -> row.getString("communityId")).toList(), owner.getId());
    return rows.stream().map(row -> row(row, copied.get(row.getString("communityId")))).toList();
  }
  private static void addFilter(List<Criteria> terms, String key, String value) {
    if (value != null && !value.isBlank()) terms.add(Criteria.where("communityMetadata." + key).is(limit(value, 200)));
  }
  private static String limit(String value, int maximum) { return value.length() <= maximum ? value : value.substring(0, maximum); }
  public Map<String, List<String>> filters(String kind) {
    prepare(kind);
    Map<String, List<String>> result = new LinkedHashMap<>();
    for (String field : List.of("type", "method", "chart", "goal")) {
      List<String> values = mongo.findDistinct(new Query(eligible(kind)), "communityMetadata." + field,
          collection(kind), String.class);
      result.put(field + "s", values.stream().filter(value -> value != null && !value.isBlank()).sorted().toList());
    }
    return result;
  }
  public Indicator resolveIndicator(String poolId) {
    prepare("indicators");
    Indicator source = mongo.findOne(new Query(new Criteria().andOperator(eligible("indicators"),
        Criteria.where("communityId").is(validId(poolId)))), Indicator.class);
    if (source == null) throw unavailable();
    return source;
  }
  public IndicatorSpecificationCard resolveIsc(String poolId) {
    prepare("isc");
    IndicatorSpecificationCard source = mongo.findOne(new Query(new Criteria().andOperator(eligible("isc"),
        Criteria.where("communityId").is(validId(poolId)))), IndicatorSpecificationCard.class);
    if (source == null) throw unavailable();
    return source;
  }
  public String copiedId(String kind, String poolId, String owner) {
    return copiedIds(kind, List.of(poolId), owner).get(poolId);
  }
  private Map<String, String> copiedIds(String kind, List<String> poolIds, String owner) {
    if (poolIds.isEmpty()) return Map.of();
    List<Criteria> terms = new ArrayList<>(List.of(Criteria.where("createdBy.$id")
        .is(ObjectId.isValid(owner) ? new ObjectId(owner) : owner),
        new Criteria().orOperator(Criteria.where("communitySourceId").in(poolIds), Criteria.where("communityId").in(poolIds))));
    if (kind.equals("isc")) terms.add(Criteria.where("status").in(null, "SAVED"));
    else {
      terms.add(Criteria.where("communityCopyPending").in(null, ""));
      terms.add(Criteria.where("communityDependency").ne(true));
    }
    Query query = new Query(new Criteria().andOperator(terms));
    query.fields().include("_id").include("communityId").include("communitySourceId");
    Map<String, String> result = new HashMap<>();
    for (Document row : mongo.find(query, Document.class, collection(kind))) {
      String source = row.getString("communitySourceId");
      result.put(source == null || source.isBlank() ? row.getString("communityId") : source, row.get("_id").toString());
    }
    return result;
  }
  static Map<String, Object> row(Document source, String copiedId) {
    Document meta = source.get("communityMetadata", Document.class);
    Map<String, Object> row = new LinkedHashMap<>();
    row.put("id", source.getString("communityId"));
    for (String field : List.of("name", "type", "method", "chart", "goal")) row.put(field, meta == null ? "" : meta.getString(field));
    Object time = meta == null ? null : meta.get("updatedAt");
    row.put("updatedAt", time instanceof Date date ? date.toInstant().toString() : time instanceof LocalDateTime local ? local.toString() : null);
    row.put("copiedId", copiedId);
    return row;
  }
  public Map<String, Object> metadata(String kind, String poolId, String owner) {
    prepare(kind);
    Document source = mongo.findOne(new Query(new Criteria().andOperator(eligible(kind),
        Criteria.where("communityId").is(validId(poolId)))), Document.class, collection(kind));
    if (source == null) throw unavailable();
    return row(source, copiedId(kind, poolId, owner));
  }
  /** UUIDs reveal neither a Mongo ObjectId timestamp nor the creator's private record ID. */
  static String validId(String value) {
    try { if (!UUID.fromString(value).toString().equals(value)) throw unavailable(); return value; }
    catch (RuntimeException failure) { throw unavailable(); }
  }
  static NotFoundException unavailable() { return new NotFoundException("COMMUNITY_ENTRY_UNAVAILABLE", "This community indicator is no longer available."); }

  /** Bounded metadata-only migration; no datasets, statement queries or raw editor configuration. */
  synchronized void prepare(String kind) {
    String collection = collection(kind);
    if (!indexed.contains(kind)) {
      mongo.indexOps(collection).ensureIndex(new Index().on("communityId", Sort.Direction.ASC).unique().sparse());
      mongo.indexOps(collection).ensureIndex(new Index().on("communityMetadata.name", Sort.Direction.ASC));
      mongo.indexOps(collection).ensureIndex(new Index().on("communityMetadata.updatedAt", Sort.Direction.DESC));
      mongo.indexOps(collection).ensureIndex(new Index().on("communityMetadata.schemaVersion", Sort.Direction.ASC));
      indexed.add(kind);
    }
    if (migrated.contains(kind)) return;
    Criteria missing = new Criteria().orOperator(Criteria.where("communityId").is(null),
        Criteria.where("communityMetadata.schemaVersion").ne(CommunityMetadata.VERSION));
    while (true) {
      Query query = new Query(missing).limit(50);
      query.fields().include("_id").include("communityId").include("name").include("indicatorName")
          .include("createdBy").include("createdOn").include("updatedOn").include("indicatorType")
          .include("requirements").include("visRef")
          .include("indicators.indicator")
          .include("analyticsTechniqueReference.analyticsTechnique")
          .include("visualizationTechniqueReference.visType");
      List<?> sources = kind.equals("isc") ? mongo.find(query, IndicatorSpecificationCard.class) : mongo.find(query, Indicator.class);
      if (sources.isEmpty()) break;
      for (Object source : sources) {
        Document output = new Document(); String id, poolId;
        if (source instanceof Indicator value) {
          id = value.getId(); poolId = value.getCommunityId();
          if (value.getCreatedOn() != null) output.put("createdOn", Date.from(value.getCreatedOn().atZone(ZoneId.systemDefault()).toInstant()));
          CommunityMetadata.populate(value, output);
        } else {
          IndicatorSpecificationCard value = (IndicatorSpecificationCard) source;
          id = value.getId(); poolId = value.getCommunityId();
          if (value.getCreatedOn() != null) output.put("createdOn", Date.from(value.getCreatedOn().atZone(ZoneId.systemDefault()).toInstant()));
          if (value.getUpdatedOn() != null) output.put("updatedOn", Date.from(value.getUpdatedOn().atZone(ZoneId.systemDefault()).toInstant()));
          CommunityMetadata.populate(value, output);
        }
        Document set = new Document("communityMetadata", output.get("communityMetadata"));
        if (poolId == null) set.put("communityId", UUID.randomUUID().toString());
        Query identity = new Query(Criteria.where("_id").is(ObjectId.isValid(id) ? new ObjectId(id) : id));
        // Existing IDs may be String or ObjectId. Converter-produced identity handles both.
        identity = new Query(new Criteria().andOperator(new Criteria().orOperator(Criteria.where("_id").is(id),
            Criteria.where("_id").is(ObjectId.isValid(id) ? new ObjectId(id) : id)), missing));
        mongo.updateFirst(identity, new Update().set("communityMetadata", set.get("communityMetadata"))
            .set("communityId", poolId == null ? set.getString("communityId") : poolId), collection);
      }
      if (sources.size() < 50) break;
    }
    migrated.add(kind);
  }
}
