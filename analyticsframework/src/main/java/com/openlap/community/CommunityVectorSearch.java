package com.openlap.community;

import com.mongodb.client.MongoCollection;
import jakarta.annotation.PreDestroy;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(name = "openlap.semantic-search.enabled", havingValue = "true")
class CommunityVectorSearch {
  private static final Logger LOG = LoggerFactory.getLogger(CommunityVectorSearch.class);
  private final CommunityCatalogService catalog;
  private final MongoCollection<Document> sources;
  private final CommunityVectorStore store;
  private final CommunitySearchProjection projection;
  private final ObjectProvider<CommunitySearchEncoder> encoders;
  private final long refreshInterval;
  private final int maxCandidates;
  private volatile boolean refreshRequested;
  private long nextRefresh;
  private boolean failed;
  private final ScheduledExecutorService worker = Executors.newSingleThreadScheduledExecutor(work -> {
    Thread thread = new Thread(work, "community-search-indexer");
    thread.setDaemon(true);
    return thread;
  });
  private volatile boolean ready;

  CommunityVectorSearch(CommunityCatalogService catalog, @Qualifier("primaryMongoTemplate") MongoTemplate primary,
      CommunityVectorStore store, CommunitySearchProjection projection, ObjectProvider<CommunitySearchEncoder> encoders,
      @Value("${openlap.semantic-search.refresh-seconds:300}") long refreshInterval,
      @Value("${openlap.semantic-search.max-candidates:10000}") int maxCandidates) {
    this.catalog = catalog;
    this.sources = primary.getCollection(CommunityCatalogService.collection("indicators"));
    this.store = store;
    this.projection = projection;
    this.encoders = encoders;
    this.refreshInterval = Math.max(1, refreshInterval);
    this.maxCandidates = Math.max(1, Math.min(maxCandidates, 100_000));
  }

  @EventListener(ApplicationReadyEvent.class) void start() {
    worker.scheduleWithFixedDelay(() -> {
      if (!ready || refreshRequested || System.nanoTime() >= nextRefresh) {
        refreshRequested = false;
        refresh();
        nextRefresh = System.nanoTime() + TimeUnit.SECONDS.toNanos(refreshInterval);
      }
    }, 0, Math.min(10, refreshInterval), TimeUnit.SECONDS);
  }
  @PreDestroy void stop() { worker.shutdownNow(); }

  /** Handles ordinary saves, raw draft writes, deletions and offline periods via the same pass. */
  void refresh() {
    try {
      var encoder = encoders.getIfAvailable();
      if (encoder == null) return;
      catalog.prepare("indicators");
      boolean queryable = store.prepare();
      var obsolete = store.keys();
      try (var cursor = sources.find(eligible()).projection(projection.projection()).batchSize(64).iterator()) {
        while (cursor.hasNext()) {
          if (Thread.currentThread().isInterrupted()) return;
          var source = projection.project(cursor.next());
          if (!obsolete.remove(CommunityVectorStore.key(source))) store.insert(source, source.embed(encoder));
        }
      }
      // Only a complete scan can establish that an old search revision is obsolete.
      store.remove(obsolete);
      if (!ready && queryable) LOG.info("Community indicator semantic search is ready.");
      ready = queryable;
      failed = false;
    } catch (RuntimeException unavailable) {
      ready = false;
      // Driver and model exceptions may contain connection details or original text.
      if (!failed) LOG.warn("Community indicator indexing will retry ({})", unavailable.getClass().getSimpleName());
      failed = true;
    }
  }

  record RankedPage(List<Document> rows, int total) {}

  Optional<RankedPage> search(CommunitySearchRequest query) {
    if (!ready) return Optional.empty();
    try {
      var encoder = encoders.getIfAvailable();
      if (encoder == null) return Optional.empty();
      // Catalog membership and filters are authoritative even during index lag. This small
      // projection also supplies the normal dashboard sort fields without duplicating them.
      var available = new LinkedHashMap<String, Document>();
      var filter = canonicalFilter(query);
      for (var row : sources.find(filter).limit(maxCandidates + 1).projection(new Document("_id", 0).append("communityId", 1).append("communityMetadata", 1))) {
        available.put(row.getString("communityId"), row);
      }
      if (available.size() > maxCandidates) return Optional.empty();
      if (available.isEmpty()) return Optional.of(new RankedPage(List.of(), 0));
      var hits = store.rank(encoder.query(query.embeddingText()), query, available.size());
      var ordered = rank(query, available, hits);
      if (ordered.isEmpty()) return requestRefresh(); // No partial result pages while the search index catches up.
      var ranked = ordered.get();
      int from = Math.min(query.page() * query.size(), ranked.size());
      int to = Math.min(from + query.size(), ranked.size());
      var ids = ranked.subList(from, to);
      if (ids.isEmpty()) return Optional.of(new RankedPage(List.of(), ranked.size()));
      var revisions = new HashMap<String, String>();
      for (var hit : hits) revisions.put(hit.id(), hit.fingerprint());
      var page = new HashMap<String, Document>();
      filter.put("communityId", new Document("$in", ids));
      for (var original : sources.find(filter).projection(projection.projection())) {
        var current = projection.project(original);
        if (!current.fingerprint().equals(revisions.get(current.id()))) return requestRefresh();
        page.put(current.id(), new Document("communityId", current.id()).append("communityMetadata", original.get("communityMetadata")));
      }
      if (page.size() != ids.size()) return requestRefresh();
      return Optional.of(new RankedPage(ids.stream().map(page::get).toList(), ranked.size()));
    } catch (RuntimeException unavailable) {
      ready = false;
      LOG.warn("Community indicator semantic query unavailable ({})", unavailable.getClass().getSimpleName());
      return Optional.empty();
    }
  }

  private Optional<RankedPage> requestRefresh() {
    refreshRequested = true;
    return Optional.empty();
  }

  static Optional<List<String>> rank(CommunitySearchRequest query, Map<String, Document> available,
      List<CommunityVectorStore.Hit> hits) {
    var scores = new HashMap<String, Double>();
    for (var hit : hits) if (available.containsKey(hit.id())) scores.put(hit.id(), hit.score());
    if (scores.size() != available.size()) return Optional.empty();
    Comparator<String> order;
    if (query.sortBy().equals("relevance")) {
      order = Comparator.<String, Boolean>comparing(id -> query.mode().equals("basic") &&
          query.text().equalsIgnoreCase(metadata(available, id).getString("name"))).reversed()
          .thenComparing(Comparator.<String, Double>comparing(scores::get).reversed());
    } else {
      order = query.sortBy().equals("name")
          ? Comparator.comparing(id -> metadata(available, id).getString("name"), String.CASE_INSENSITIVE_ORDER)
          : Comparator.comparing(id -> metadata(available, id).getDate("updatedAt"), Comparator.nullsFirst(Date::compareTo));
      if (query.sortDirection().equals("desc")) order = order.reversed();
    }
    var result = new ArrayList<>(scores.keySet());
    result.sort(order.thenComparing(Comparator.naturalOrder()));
    return Optional.of(result);
  }

  private static Document metadata(Map<String, Document> rows, String id) {
    return rows.get(id).get("communityMetadata", Document.class);
  }
  private static Document eligible() { return CommunityCatalogService.eligible("indicators").getCriteriaObject(); }
  static Document canonicalFilter(CommunitySearchRequest query) {
    var filter = eligible();
    if (!query.type().isEmpty()) filter.append("communityMetadata.type", query.type());
    if (!query.method().isEmpty()) filter.append("communityMetadata.method", query.method());
    if (!query.chart().isEmpty()) filter.append("communityMetadata.chart", query.chart());
    return filter;
  }
}
