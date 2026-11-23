package com.openlap.community;

import com.mongodb.ConnectionString;
import com.mongodb.MongoClientSettings;
import com.mongodb.MongoCommandException;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.UpdateOptions;
import jakarta.annotation.PreDestroy;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import org.bson.Document;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

/** Rebuildable, separate from the authoritative application database. */
@Component
@ConditionalOnProperty(name = "openlap.semantic-search.enabled", havingValue = "true")
class CommunityVectorStore {
  static final String COLLECTION = "community_indicator_vectors_v1";
  static final String INDEX = "community_semantic_v1";
  private final MongoClient client;
  private final MongoDatabase database;
  private final MongoCollection<Document> vectors;
  private final boolean aggregateCosine;

  CommunityVectorStore(@Qualifier("primaryMongoTemplate") MongoTemplate primary,
      @Value("${openlap.semantic-search.mongodb-uri:}") String uri,
      @Value("${openlap.semantic-search.engine:vector-index}") String engine) {
    aggregateCosine = switch (engine) {
      case "mongo-aggregation" -> true;
      case "vector-index" -> false;
      default -> throw new IllegalArgumentException("Select vector-index or mongo-aggregation for the semantic search engine.");
    };
    if (uri.isBlank()) {
      client = null;
      database = primary.getDb();
    } else {
      ConnectionString connection = new ConnectionString(uri);
      if (connection.getDatabase() == null) throw new IllegalArgumentException("Provide a database name in the semantic search MongoDB URI.");
      var settings = MongoClientSettings.builder().applyConnectionString(connection)
          .applyToClusterSettings(cluster -> cluster.serverSelectionTimeout(3, TimeUnit.SECONDS)).build();
      client = MongoClients.create(settings);
      database = client.getDatabase(connection.getDatabase());
    }
    vectors = database.getCollection(COLLECTION);
  }

  @PreDestroy void close() { if (client != null) client.close(); }

  boolean prepare() {
    if (database.listCollectionNames().filter(new Document("name", COLLECTION)).first() == null) {
      try { database.createCollection(COLLECTION); }
      catch (MongoCommandException race) { if (race.getErrorCode() != 48) throw race; }
    }
    if (aggregateCosine) {
      vectors.createIndex(new Document("version", 1).append("type", 1).append("method", 1).append("chart", 1));
      return true;
    }
    var status = vectors.aggregate(List.of(new Document("$listSearchIndexes", new Document("name", INDEX)))).first();
    if (status != null) return Boolean.TRUE.equals(status.getBoolean("queryable"));
    var fields = new ArrayList<Document>();
    fields.add(new Document("type", "vector").append("path", "embedding").append("numDimensions", CommunitySearchEncoder.DIMENSIONS).append("similarity", "cosine"));
    for (String field : List.of("version", "type", "method", "chart")) fields.add(new Document("type", "filter").append("path", field));
    var index = new Document("name", INDEX).append("type", "vectorSearch").append("definition", new Document("fields", fields));
    database.runCommand(new Document("createSearchIndexes", COLLECTION).append("indexes", List.of(index)));
    return false; // The search process builds this index asynchronously.
  }

  Set<String> keys() {
    var result = new HashSet<String>();
    for (Document row : vectors.find(versionFilter()).projection(new Document("_id", 1)).batchSize(100)) {
      result.add(row.getString("_id"));
    }
    return result;
  }

  static String key(CommunitySearchDocument doc) {
    // Immutable revisions prevent the search process from scoring an old vector while MongoDB
    // hydrates that same _id with an edited indicator's new fingerprint.
    return CommunitySearchEncoder.VERSION + ":" + doc.id() + ":" + doc.fingerprint();
  }

  void insert(CommunitySearchDocument doc, float[] vector) {
    var definition = new Document("communityId", doc.id()).append("fingerprint", doc.fingerprint())
        .append("version", CommunitySearchEncoder.VERSION).append("type", doc.type())
        .append("method", doc.method()).append("chart", doc.chart()).append("embedding", numbers(vector));
    vectors.updateOne(new Document("_id", key(doc)), new Document("$setOnInsert", definition), new UpdateOptions().upsert(true));
  }

  void remove(Collection<String> obsolete) {
    List<String> keys = List.copyOf(obsolete);
    for (int start = 0; start < keys.size(); start += 100) {
      vectors.deleteMany(new Document("_id", new Document("$in", keys.subList(start, Math.min(start + 100, keys.size())))));
    }
  }

  record Hit(String id, String fingerprint, double score) {}

  List<Hit> rank(float[] vector, CommunitySearchRequest request, int limit) {
    var pipeline = aggregateCosine ? aggregationRanking(vector, request, limit) : indexedRanking(vector, request, limit);
    var result = new ArrayList<Hit>();
    try (var rows = vectors.aggregate(pipeline).iterator()) {
      while (rows.hasNext()) {
        if (result.size() == limit) return List.of(); // Extra derived revisions: refresh before serving this page.
        var row = rows.next();
        result.add(new Hit(row.getString("communityId"), row.getString("fingerprint"), row.getDouble("score")));
      }
    }
    return result;
  }

  private static List<Document> indexedRanking(float[] vector, CommunitySearchRequest request, int limit) {
    var options = new Document("index", INDEX).append("path", "embedding").append("queryVector", numbers(vector))
        .append("exact", true).append("limit", limit).append("filter", vectorFilter(request));
    var project = new Document("_id", 0).append("communityId", 1).append("fingerprint", 1)
        .append("score", new Document("$meta", "vectorSearchScore"));
    return List.of(new Document("$vectorSearch", options), new Document("$project", project));
  }

  private static List<Document> aggregationRanking(float[] vector, CommunitySearchRequest request, int limit) {
    // Both vectors are unit length. Their dot product is cosine similarity; MongoDB Vector Search
    // reports this score on a 0..1 scale. $zip and $reduce also work on ordinary MongoDB 4.4.
    var pairs = new Document("$zip", new Document("inputs", List.of("$embedding", numbers(vector))));
    var product = new Document("$multiply", List.of(
        new Document("$arrayElemAt", List.of("$$this", 0)), new Document("$arrayElemAt", List.of("$$this", 1))));
    var cosine = new Document("$reduce", new Document("input", pairs).append("initialValue", 0.0)
        .append("in", new Document("$add", List.of("$$value", product))));
    var score = new Document("$divide", List.of(new Document("$add", List.of(1, cosine)), 2));
    // Apply the budget *before* scoring. limit is the bounded number of eligible catalog entries.
    return List.of(new Document("$match", vectorFilter(request)), new Document("$limit", limit + 1),
        new Document("$match", new Document("embedding", new Document("$size", CommunitySearchEncoder.DIMENSIONS))),
        new Document("$project", new Document("_id", 0).append("communityId", 1).append("fingerprint", 1).append("score", score)));
  }

  static Document vectorFilter(CommunitySearchRequest request) {
    var terms = new ArrayList<Document>();
    terms.add(versionFilter());
    if (!request.type().isEmpty()) terms.add(new Document("type", request.type()));
    if (!request.method().isEmpty()) terms.add(new Document("method", request.method()));
    if (!request.chart().isEmpty()) terms.add(new Document("chart", request.chart()));
    return terms.size() == 1 ? terms.get(0) : new Document("$and", terms);
  }

  private static Document versionFilter() { return new Document("version", CommunitySearchEncoder.VERSION); }

  private static List<Double> numbers(float[] vector) {
    var result = new ArrayList<Double>(vector.length);
    for (float value : vector) result.add((double) value);
    return result;
  }
}
