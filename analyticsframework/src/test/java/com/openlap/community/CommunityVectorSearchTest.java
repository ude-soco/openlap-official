package com.openlap.community;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.mongodb.client.FindIterable;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoCursor;
import com.openlap.infrastructure.exception.ValidationException;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.bson.Document;
import org.bson.conversions.Bson;
import org.junit.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.mock.web.MockHttpServletRequest;

public class CommunityVectorSearchTest {
  private static CommunitySearchRequest basic(String sortBy, String direction) {
    return new CommunitySearchRequest("basic", "Weekly participation", null, null, null, null,
        "BASIC", "Count", "Bar", 0, 10, sortBy, direction);
  }
  private static Document row(String id, String title, long time) {
    return new Document("communityId", id).append("communityMetadata", new Document("name", title).append("updatedAt", new Date(time)));
  }

  @Test public void advancedQueryUsesOnlyProvidedGoalQuestionAndIndicatorText() {
    var query = new CommunitySearchRequest("advanced", "old basic search", " Monitor ", "activity weekly", "", "visit frequency",
        null, null, null, null, null, null, null);
    query.validate();
    assertThat(query.toString()).doesNotContain("activity weekly", "old basic search", "visit frequency");
    assertThat(query.embeddingText()).isEqualTo("Goal: Monitor activity weekly\nIndicator: visit frequency");
    assertThat(query.fallbackText()).isEqualTo("visit frequency");
    assertThatThrownBy(() -> new CommunitySearchRequest("advanced", "unused", "Monitor", "", null, null,
        null, null, null, 0, 10, null, null).validate()).isInstanceOf(ValidationException.class);
    assertThatThrownBy(() -> new CommunitySearchRequest("basic", "a".repeat(201), null, null, null, null,
        null, null, null, 0, 10, null, null)).isInstanceOf(ValidationException.class);
  }

  @Test public void nativeAndCanonicalPrefiltersApplyAllSelectedFacets() {
    var query = basic("relevance", "desc");
    assertThat(CommunityVectorStore.vectorFilter(query).toJson()).contains("BASIC", "Count", "Bar", CommunitySearchEncoder.VERSION);
    assertThat(CommunityVectorSearch.canonicalFilter(query).toJson()).contains("communityMetadata.type", "communityMetadata.method",
        "communityMetadata.chart", "communityCopyPending", "communityDependency", "communitySourceId");
  }

  @Test public void exactTitleWinsAndScoreTiesUseStablePublicIdsEvenAcrossPages() {
    var hits = List.of(new CommunityVectorStore.Hit("b", "b1", .8), new CommunityVectorStore.Hit("a", "a1", .8),
        new CommunityVectorStore.Hit("c", "c1", .5), new CommunityVectorStore.Hit("removed", "r1", 1.0));
    var available = Map.of("a", row("a", "Attendance", 10), "b", row("b", "Learning activity", 30),
        "c", row("c", "Weekly Participation", 20));
    assertThat(CommunityVectorSearch.rank(basic("relevance", "desc"), available, hits)).contains(List.of("c", "a", "b"));
    assertThat(CommunityVectorSearch.rank(basic("updatedAt", "desc"), available, hits)).contains(List.of("b", "c", "a"));
    assertThat(CommunityVectorSearch.rank(basic("name", "asc"), available, hits)).contains(List.of("a", "b", "c"));
    assertThat(CommunityVectorSearch.rank(basic("relevance", "desc"), available, hits.subList(0, 2))).isEmpty();
  }

  @Test public void temporaryIndexFailureAndDisabledFeatureUseTheExistingViewerScopedNameSearch() {
    var viewer = new MockHttpServletRequest();
    var catalog = mock(CommunityCatalogService.class);
    var engines = provider(CommunityVectorSearch.class);
    var engine = mock(CommunityVectorSearch.class);
    when(engines.getIfAvailable()).thenReturn(null, engine);
    var query = basic("relevance", "desc");
    when(engine.search(query)).thenReturn(Optional.empty());
    var visible = Map.<String, Object>of("name", "Weekly participation", "copiedId", "my-copy");
    when(catalog.page(viewer, "indicators", 0, 10, query.text(), "relevance", "desc", "BASIC", "Count", "Bar", ""))
        .thenReturn(new PageImpl<>(List.of(visible)));
    var controller = new CommunityIndicatorSearchController(catalog, engines);
    for (int i = 0; i < 2; i++) {
      var response = controller.search(viewer, query);
      var page = (CommunityIndicatorSearchController.Results) response.getBody().getData();
      assertThat(page.searchMode()).isEqualTo("name");
      assertThat(page.content()).containsExactly(visible);
      assertThat(response.getHeaders().getCacheControl()).contains("private", "no-store");
      assertThat(response.getHeaders().getVary()).contains("Authorization");
    }
  }

  @Test public void reconcilerSkipsUnchangedVectorsAndOnlyCleansAfterACompleteScan() {
    var fixture = new IndexFixture();
    var current = row("pool", "Learning activity", 10);
    var searchDoc = new CommunitySearchDocument("pool", "BASIC", "Count", "Bar", Map.of(CommunitySearchDocument.Field.NAME, "Learning activity"));
    when(fixture.projection.project(current)).thenReturn(searchDoc);
    String key = CommunityVectorStore.key(searchDoc);
    when(fixture.store.keys()).thenReturn(new HashSet<>(Set.of(key, "obsolete")), new HashSet<>(Set.of("other")));
    when(fixture.cursor.hasNext()).thenReturn(true, false, true);
    when(fixture.cursor.next()).thenReturn(current).thenThrow(new IllegalStateException("interrupted read"));
    fixture.service.refresh();
    verify(fixture.store).remove(Set.of("obsolete"));
    verify(fixture.store, never()).insert(any(), any());
    fixture.service.refresh();
    verify(fixture.store, times(1)).remove(any());
  }

  @Test public void anIndexHitForAnEditedIndicatorIsNeverReturnedBeforeItsCurrentRevisionIsSearchable() {
    var fixture = new IndexFixture();
    var updated = row("pool", "Weekly participation", 20).append("indicatorQuery", "private-unrelated-data");
    var sourceDoc = new CommunitySearchDocument("pool", "BASIC", "Count", "Bar", Map.of(CommunitySearchDocument.Field.NAME, "Weekly participation"));
    when(fixture.projection.project(updated)).thenReturn(sourceDoc);
    when(fixture.store.keys()).thenReturn(new HashSet<>());
    fixture.service.refresh();
    var query = basic("relevance", "desc");
    when(fixture.encoder.query(query.text())).thenReturn(new float[]{1});
    when(fixture.store.rank(any(), eq(query), eq(1))).thenReturn(
        List.of(new CommunityVectorStore.Hit("pool", "obsolete-fingerprint", .99)),
        List.of(new CommunityVectorStore.Hit("pool", sourceDoc.fingerprint(), .95)));
    var first = one(updated); var second = one(updated); var third = one(updated); var fourth = one(updated);
    when(fixture.found.iterator()).thenReturn(first, second, third, fourth);
    assertThat(fixture.service.search(query)).isEmpty();
    var current = fixture.service.search(query).orElseThrow();
    assertThat(current.total()).isEqualTo(1);
    assertThat(current.rows().get(0).keySet()).containsExactly("communityId", "communityMetadata");
  }

  @SuppressWarnings("unchecked")
  private static MongoCursor<Document> one(Document result) {
    MongoCursor<Document> cursor = mock(MongoCursor.class);
    when(cursor.hasNext()).thenReturn(true, false);
    when(cursor.next()).thenReturn(result);
    return cursor;
  }

  @Test public void changingIndexedFieldsCreatesAnImmutableVectorRevision() {
    var first = new CommunitySearchDocument("id", "BASIC", "Count", "Bar", Map.of(CommunitySearchDocument.Field.NAME, "Count visits"));
    var edit = new CommunitySearchDocument("id", "BASIC", "Count", "Bar", Map.of(CommunitySearchDocument.Field.NAME, "Count attempts"));
    assertThat(CommunityVectorStore.key(first)).isNotEqualTo(CommunityVectorStore.key(edit));
  }

  @SuppressWarnings("unchecked")
  private static <T> ObjectProvider<T> provider(Class<T> type) { return mock(ObjectProvider.class); }

  @SuppressWarnings("unchecked")
  private static class IndexFixture {
    final CommunityVectorStore store = mock(CommunityVectorStore.class);
    final CommunitySearchProjection projection = mock(CommunitySearchProjection.class);
    final MongoCursor<Document> cursor = mock(MongoCursor.class);
    final CommunityVectorSearch service;
    final FindIterable<Document> found = mock(FindIterable.class);
    final CommunitySearchEncoder encoder = mock(CommunitySearchEncoder.class);
    IndexFixture() {
      var mongo = mock(MongoTemplate.class);
      MongoCollection<Document> sources = mock(MongoCollection.class);
      when(mongo.getCollection("analytics-indicator")).thenReturn(sources);
      when(sources.find(any(Bson.class))).thenReturn(found);
      when(found.projection(any())).thenReturn(found);
      when(found.batchSize(anyInt())).thenReturn(found);
      when(found.limit(anyInt())).thenReturn(found);
      when(found.iterator()).thenReturn(cursor);
      when(store.prepare()).thenReturn(true);
      var encoders = provider(CommunitySearchEncoder.class);
      when(encoders.getIfAvailable()).thenReturn(encoder);
      service = new CommunityVectorSearch(mock(CommunityCatalogService.class), mongo, store, projection, encoders, 300, 10000);
    }
  }
}
