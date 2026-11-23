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

  CommunityVectorStore(@Qualifier("primaryMongoTemplate") MongoTemplate primary,
      @Value("${openlap.semantic-search.mongodb-uri:}") String uri) {
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
    var options = new Document("index", INDEX).append("path", "embedding").append("queryVector", numbers(vector))
        .append("exact", true).append("limit", limit).append("filter", vectorFilter(request));
    var project = new Document("_id", 0).append("communityId", 1).append("fingerprint", 1)
        .append("score", new Document("$meta", "vectorSearchScore"));
    var result = new ArrayList<Hit>();
    for (var row : vectors.aggregate(List.of(new Document("$vectorSearch", options), new Document("$project", project)))) {
      result.add(new Hit(row.getString("communityId"), row.getString("fingerprint"), row.getDouble("score")));
    }
    return result;
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
