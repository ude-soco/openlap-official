package com.openlap.community;

import static org.assertj.core.api.Assertions.*;
import static org.junit.Assume.assumeNotNull;

import com.mongodb.client.MongoClients;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import org.bson.Document;
import org.junit.Test;
import org.springframework.data.mongodb.core.MongoTemplate;

public class CommunityVectorStoreTest {
  @Test public void unknownEngineCannotSilentlyChangeRetrieval() {
    assertThatThrownBy(() -> new CommunityVectorStore(null, "", "unknown"))
        .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("mongo-aggregation");
  }

  // Set -Dopenlap.test.mongo-port=<local port> to qualify the real MongoDB operators, including on 4.4.
  @Test public void ordinaryMongoRanksUnitVectorsAndRefusesPartialResults() throws Exception {
    String port = System.getProperty("openlap.test.mongo-port");
    assumeNotNull(port);
    String database = "search_it_" + UUID.randomUUID().toString().replace("-", "");
    try (var client = MongoClients.create("mongodb://127.0.0.1:" + Integer.parseInt(port) + "/?directConnection=true")) {
      var mongo = new MongoTemplate(client, database);
      var store = new CommunityVectorStore(mongo, "", "mongo-aggregation");
      try {
        var executor = Executors.newFixedThreadPool(2);
        try {
          var start = new CyclicBarrier(2);
          java.util.concurrent.Callable<Boolean> prepare = () -> { start.await(); return store.prepare(); };
          var first = executor.submit(prepare);
          var second = executor.submit(prepare);
          assertThat(first.get(15, TimeUnit.SECONDS)).isTrue();
          assertThat(second.get(15, TimeUnit.SECONDS)).isTrue();
        } finally {
          executor.shutdownNow();
        }

        var aligned = source("a", "BASIC");
        var perpendicular = source("b", "BASIC");
        var opposite = source("c", "BASIC");
        store.insert(aligned, unit(1, 0));
        store.insert(perpendicular, unit(0, 1));
        store.insert(opposite, unit(-1, 0));
        store.insert(source("another type", "COMPOSITE"), unit(1, 0));
        var request = new CommunitySearchRequest("basic", "visits", null, null, null, null,
            "BASIC", "Count", "Bar", 0, 10, "relevance", "desc");

        var hits = store.rank(unit(1, 0), request, 3);
        assertThat(hits.stream().collect(Collectors.toMap(CommunityVectorStore.Hit::id, CommunityVectorStore.Hit::score)))
            .isEqualTo(Map.of("a", 1.0, "b", 0.5, "c", 0.0));
        assertThat(hits).contains(new CommunityVectorStore.Hit("a", aligned.fingerprint(), 1));

        var obsolete = source("removed", "BASIC");
        store.insert(obsolete, unit(0, 1));
        assertThat(store.rank(unit(1, 0), request, 3)).isEmpty();
        store.remove(List.of(CommunityVectorStore.key(obsolete)));
        assertThat(store.rank(unit(1, 0), request, 3)).hasSize(3);

        var collection = mongo.getCollection(CommunityVectorStore.COLLECTION);
        collection.updateOne(new Document("_id", CommunityVectorStore.key(aligned)),
            new Document("$set", new Document("embedding", List.of(1.0))));
        assertThat(store.rank(unit(1, 0), request, 3)).extracting(CommunityVectorStore.Hit::id)
            .containsExactlyInAnyOrder("b", "c");
      } finally {
        mongo.getDb().drop();
      }
    }
  }

  private static CommunitySearchDocument source(String id, String type) {
    return new CommunitySearchDocument(id, type, "Count", "Bar", Map.of(CommunitySearchDocument.Field.NAME, id));
  }

  private static float[] unit(float x, float y) {
    float[] values = new float[CommunitySearchEncoder.DIMENSIONS];
    values[0] = x;
    values[1] = y;
    return values;
  }
}
