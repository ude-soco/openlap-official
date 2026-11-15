package com.openlap.community;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.openlap.analytics_module.entities.Indicator;
import com.openlap.infrastructure.exception.NotFoundException;
import com.openlap.isc_module.entities.IndicatorSpecificationCard;
import com.openlap.user.services.TokenService;
import java.util.*;
import org.bson.Document;
import org.junit.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.IndexOperations;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

public class CommunityCatalogTest {
  static final String POOL = "24b8b27d-488b-4d1c-9c63-09514ac9b3e0";
  @Test public void publicRowsAreAnAllowlistAndNeverIncludePrivateSourceFields() {
    Document doc = new Document("_id", "private-source-id").append("communityId", POOL)
        .append("createdBy", "Alice").append("indicatorQuery", "private query")
        .append("configurationRequest", "private config")
        .append("communityMetadata", new Document("name", "Weekly access").append("type", "BASIC")
            .append("method", "Count items").append("chart", "Bar chart").append("goal", "")
            .append("updatedAt", new Date(1000)));
    var row = CommunityCatalogService.row(doc, null);
    assertThat(row.keySet()).containsExactly("id", "name", "type", "method", "chart", "goal", "updatedAt", "copiedId");
    assertThat(CommunitySanitizer.json(row)).doesNotContain("Alice", "private-", "private query", "private config");
    assertThat(row.get("id")).isEqualTo(POOL);
  }
  @Test public void privateRecordIdsAndNoncanonicalOpaqueIdsCannotResolveCommunityEntries() {
    for (String id : List.of("0123456789abcdef01234567", "Alice", POOL.toUpperCase(), "", "../../isc/private"))
      assertThatThrownBy(() -> CommunityCatalogService.validId(id)).isInstanceOf(NotFoundException.class);
    assertThat(CommunityCatalogService.validId(POOL)).isEqualTo(POOL);
  }
  @Test public void poolEligibilityExcludesDraftsCopiesHiddenSourcesAndUnfinishedCopies() {
    String isc = CommunityCatalogService.eligible("isc").getCriteriaObject().toJson();
    assertThat(isc).contains("status", "SAVED", "communitySourceId", "communityId").doesNotContain("DRAFT");
    String indicator = CommunityCatalogService.eligible("indicators").getCriteriaObject().toJson();
    assertThat(indicator).contains("communityCopyPending", "communityDependency", "communitySourceId");
  }
  @Test public void searchAndSortingUsePublicMetadataAndMigrationIsNotRepeatedForEveryRequest() {
    var mongo = mock(MongoTemplate.class); var tokens = mock(TokenService.class);
    var indexes = mock(IndexOperations.class); var request = new MockHttpServletRequest();
    when(mongo.indexOps(anyString())).thenReturn(indexes);
    when(mongo.find(any(Query.class), eq(Indicator.class))).thenReturn(List.of());
    when(mongo.find(any(Query.class), eq(Document.class), anyString())).thenReturn(List.of());
    when(tokens.getUserFromToken(request)).thenReturn(CommunitySanitizerTest.creator());
    CommunityCatalogService service = new CommunityCatalogService(mongo, tokens);
    service.page(request, "indicators", 0, 10, "Alice.*", "createdBy", "asc", "BASIC", "", "", "");
    service.page(request, "indicators", 0, 10, "", "name", "desc", "", "", "", "");
    ArgumentCaptor<Query> query = ArgumentCaptor.forClass(Query.class);
    verify(mongo, times(2)).count(query.capture(), eq("analytics-indicator"));
    assertThat(query.getAllValues().get(0).getQueryObject().toJson()).contains("communityMetadata.name", "Alice.*").doesNotContain("createdBy");
    verify(mongo, times(1)).find(any(Query.class), eq(Indicator.class));
    ArgumentCaptor<Query> page = ArgumentCaptor.forClass(Query.class);
    verify(mongo, times(2)).find(page.capture(), eq(Document.class), eq("analytics-indicator"));
    assertThat(page.getAllValues().get(0).getSortObject()).containsKey("communityMetadata.updatedAt").doesNotContainKey("createdBy");
    assertThat(page.getAllValues().get(1).getSortObject()).containsKey("communityMetadata.name");
  }
  @Test public void alreadySavedLookupExcludesHiddenSupportingBasicsAndPendingGraphs() {
    var mongo = mock(MongoTemplate.class); var tokens = mock(TokenService.class);
    when(mongo.find(any(Query.class), eq(Document.class), eq("analytics-indicator")))
        .thenReturn(List.of(new Document("_id", "root-copy-id").append("communitySourceId", POOL)));
    var service = new CommunityCatalogService(mongo, tokens);
    assertThat(service.copiedId("indicators", POOL, "0123456789abcdef01234567")).isEqualTo("root-copy-id");
    ArgumentCaptor<Query> query = ArgumentCaptor.forClass(Query.class);
    verify(mongo).find(query.capture(), eq(Document.class), eq("analytics-indicator"));
    assertThat(query.getValue().getQueryObject().toJson()).contains("communityDependency", "communityCopyPending", "createdBy.$id");
    assertThat(query.getValue().getQueryObject().toJson()).contains("$ne", "true");
  }
  @Test public void viewerSpecificCatalogResponsesCannotBeCached() {
    var controller = new CommunityCatalogController(mock(CommunityCatalogService.class), mock(CommunityIscService.class), mock(CommunityIndicatorDetails.class));
    var response = new MockHttpServletResponse(); controller.privateResponses(response);
    assertThat(response.getHeader("Cache-Control")).contains("no-store", "private");
    assertThat(response.getHeader("Vary")).isEqualTo("Authorization");
  }
}
