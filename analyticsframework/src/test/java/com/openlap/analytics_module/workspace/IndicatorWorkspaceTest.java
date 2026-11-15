package com.openlap.analytics_module.workspace;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.mongodb.client.*;
import com.openlap.analytics_module.drafts.IndicatorDraftService;
import com.openlap.analytics_module.drafts.IndicatorDraftStore;
import com.openlap.infrastructure.exception.ValidationException;
import com.openlap.user.entities.User;
import com.openlap.user.services.TokenService;
import java.util.*;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.junit.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.mock.web.MockHttpServletRequest;

public class IndicatorWorkspaceTest {
  private static final String OWNER = "0123456789abcdef01234567";

  private IndicatorWorkspaceQuery query(
      int page,
      int size,
      String search,
      String type,
      boolean draftsOnly,
      String sort,
      String direction) {
    return IndicatorWorkspaceQuery.checked(page, size, search, type, draftsOnly, sort, direction);
  }

  @Test
  public void combinedOwnerFilteredInputsAreUnitedBeforeTheSingleCountAndPage() {
    var query = query(2, 10, ".*", "BASIC", false, "updatedAt", "desc");
    List<Document> stages = MongoIndicatorWorkspace.pipeline(OWNER, query);
    assertThat(stages.get(0).get("$match", Document.class))
        .containsEntry("createdBy.$id", new ObjectId(OWNER))
        .containsEntry("indicatorType", "BASIC");
    Document union =
        stages.stream()
            .filter(stage -> stage.containsKey("$unionWith"))
            .findFirst()
            .orElseThrow()
            .get("$unionWith", Document.class);
    assertThat(union.getString("coll")).isEqualTo(IndicatorDraftStore.COLLECTION);
    List<Document> draftStages = union.getList("pipeline", Document.class);
    assertThat(draftStages.get(0).get("$match", Document.class))
        .containsEntry("ownerId", OWNER)
        .containsEntry("status", new Document("$in", List.of("DRAFT", "COMPLETING")))
        .containsEntry("indicatorType", "BASIC");
    // Neither source is independently limited or paged. Both projection stages discard payloads.
    assertThat(stages.subList(0, stages.size() - 1))
        .noneMatch(stage -> stage.containsKey("$skip") || stage.containsKey("$limit"));
    assertThat(draftStages)
        .noneMatch(stage -> stage.containsKey("$skip") || stage.containsKey("$limit"));
    for (Document projection :
        List.of(
            stages.get(1).get("$project", Document.class),
            draftStages.get(1).get("$project", Document.class)))
      assertThat(projection)
          .doesNotContainKeys(
              "configuration",
              "configurationRequest",
              "session",
              "completionPayload",
              "indicatorCode",
              "indicatorQuery");
    Document facet = stages.get(stages.size() - 1).get("$facet", Document.class);
    assertThat(facet.getList("content", Document.class))
        .containsExactly(
            new Document("$sort", new Document("updatedAt", -1).append("kind", 1).append("id", 1)),
            new Document("$skip", 20),
            new Document("$limit", 10));
    assertThat(facet.getList("total", Document.class))
        .containsExactly(new Document("$count", "value"));
    var pattern =
        (java.util.regex.Pattern)
            stages.get(stages.size() - 2).get("$match", Document.class).get("name");
    assertThat(pattern.pattern()).isEqualTo("\\Q.*\\E");
    assertThat(pattern.matcher("An actual .* title").find()).isTrue();
    assertThat(pattern.matcher("Any other title").find()).isFalse();
  }

  @Test
  public void draftsOnlyNeverReadsSavedRowsAndStatusSortingRemainsStable() {
    var stages =
        MongoIndicatorWorkspace.pipeline(OWNER, query(0, 5, "", null, true, "status", "asc"));
    assertThat(stages).noneMatch(stage -> stage.containsKey("$unionWith"));
    assertThat(stages.get(0).get("$match", Document.class))
        .containsEntry("ownerId", OWNER)
        .containsEntry("status", new Document("$in", List.of("DRAFT", "COMPLETING")));
    Document sort =
        stages
            .get(stages.size() - 1)
            .get("$facet", Document.class)
            .getList("content", Document.class)
            .get(0)
            .get("$sort", Document.class);
    assertThat(sort)
        .containsExactlyEntriesOf(new Document("status", 1).append("kind", 1).append("id", 1));
  }

  @Test
  @SuppressWarnings("unchecked")
  public void oneAggregatePreservesCombinedTotalsDatesAndIndependentRowKinds() {
    MongoTemplate mongo = mock(MongoTemplate.class);
    MongoCollection<Document> saved = mock(MongoCollection.class),
        drafts = mock(MongoCollection.class);
    when(mongo.getCollection(MongoIndicatorWorkspace.SAVED)).thenReturn(saved);
    when(mongo.getCollection(IndicatorDraftStore.COLLECTION)).thenReturn(drafts);
    AggregateIterable<Document> aggregate = mock(AggregateIterable.class);
    when(saved.aggregate(anyList())).thenReturn(aggregate);
    Date at = new Date(1234000);
    Document savedRow =
        new Document("id", "shared-id")
            .append("kind", "SAVED")
            .append("status", "SAVED")
            .append("name", "Saved")
            .append("indicatorType", "BASIC")
            .append("createdAt", at)
            .append("updatedAt", at)
            .append("completionPending", false);
    Document draftRow =
        new Document("id", "shared-id")
            .append("kind", "DRAFT")
            .append("status", "DRAFT")
            .append("name", "Draft")
            .append("indicatorType", "COMPOSITE")
            .append("createdAt", at)
            .append("updatedAt", at)
            .append("revision", 8L)
            .append("sourceIndicatorId", "saved-source")
            .append("recoverable", true)
            .append("completionPending", true);
    when(aggregate.first())
        .thenReturn(
            new Document("content", List.of(savedRow, draftRow))
                .append("total", List.of(new Document("value", 22))));
    var page =
        new MongoIndicatorWorkspace(mongo)
            .page(OWNER, query(2, 10, "", null, false, "name", "asc"));
    assertThat(page.getTotalElements()).isEqualTo(22);
    assertThat(page.getNumber()).isEqualTo(2);
    assertThat(page.getContent()).hasSize(2);
    assertThat(page.getContent().get(0).kind()).isEqualTo("SAVED");
    assertThat(page.getContent().get(0).revision()).isNull();
    assertThat(page.getContent().get(0).updatedAt()).isEqualTo(at.toInstant());
    var draft = page.getContent().get(1);
    assertThat(draft.kind()).isEqualTo("DRAFT");
    assertThat(draft.revision()).isEqualTo(8);
    assertThat(draft.sourceIndicatorId()).isEqualTo("saved-source");
    assertThat(draft.completionPending()).isTrue();
    verify(saved, times(1)).aggregate(anyList());
    verify(drafts, never()).aggregate(anyList());
    verify(saved, never()).find(any(Document.class));
    verify(drafts, never()).find(any(Document.class));
  }

  @Test
  @SuppressWarnings("unchecked")
  public void draftsOnlyExecutesTheAggregateAgainstDraftsAndPreservesAnEmptyPage() {
    MongoTemplate mongo = mock(MongoTemplate.class);
    MongoCollection<Document> saved = mock(MongoCollection.class),
        drafts = mock(MongoCollection.class);
    when(mongo.getCollection(MongoIndicatorWorkspace.SAVED)).thenReturn(saved);
    when(mongo.getCollection(IndicatorDraftStore.COLLECTION)).thenReturn(drafts);
    AggregateIterable<Document> aggregate = mock(AggregateIterable.class);
    when(drafts.aggregate(anyList())).thenReturn(aggregate);
    when(aggregate.first())
        .thenReturn(new Document("content", List.of()).append("total", List.of()));
    var page =
        new MongoIndicatorWorkspace(mongo)
            .page(OWNER, query(0, 10, "", null, true, "status", "asc"));
    assertThat(page.getContent()).isEmpty();
    assertThat(page.getTotalElements()).isZero();
    verify(drafts).aggregate(anyList());
    verify(saved, never()).aggregate(anyList());
  }

  @Test
  public void metadataQueryUsesAuthenticatedOwnerAndMigratesOnlyThatOwnersLegacyDraftsFirst() {
    TokenService tokens = mock(TokenService.class);
    User owner = new User();
    owner.setId(OWNER);
    when(tokens.getUserFromToken(any())).thenReturn(owner);
    IndicatorDraftService drafts = mock(IndicatorDraftService.class);
    MongoIndicatorWorkspace repository = mock(MongoIndicatorWorkspace.class);
    when(repository.page(eq(OWNER), any()))
        .thenReturn(org.springframework.data.domain.Page.empty());
    var request = new MockHttpServletRequest();
    request.addParameter("ownerId", "another-user");
    var service = new IndicatorWorkspaceService(tokens, drafts, repository);
    service.list(request, 0, 10, "  draft  ", "COMPOSITE", false, "status", "asc");
    var order = inOrder(drafts, repository);
    order.verify(drafts).migrateLegacyForOwner(request);
    ArgumentCaptor<IndicatorWorkspaceQuery> query =
        ArgumentCaptor.forClass(IndicatorWorkspaceQuery.class);
    order.verify(repository).page(eq(OWNER), query.capture());
    assertThat(query.getValue().search()).isEqualTo("draft");
    assertThat(query.getValue().indicatorType()).isEqualTo("COMPOSITE");
  }

  @Test
  public void invalidInputsDoNotQueryOrMigrateAnyPrivateData() {
    var tokens = mock(TokenService.class);
    var drafts = mock(IndicatorDraftService.class);
    var repository = mock(MongoIndicatorWorkspace.class);
    var service = new IndicatorWorkspaceService(tokens, drafts, repository);
    var request = new MockHttpServletRequest();
    assertThatThrownBy(() -> service.list(request, -1, 10, "", null, false, "name", "asc"))
        .isInstanceOf(ValidationException.class);
    assertThatThrownBy(() -> service.list(request, 0, 101, "", null, false, "name", "asc"))
        .isInstanceOf(ValidationException.class);
    assertThatThrownBy(
            () -> service.list(request, 0, 10, "x".repeat(301), null, false, "name", "asc"))
        .isInstanceOf(ValidationException.class);
    assertThatThrownBy(() -> service.list(request, 0, 10, "", "$where", false, "name", "asc"))
        .isInstanceOf(ValidationException.class);
    assertThatThrownBy(() -> service.list(request, 0, 10, "", null, false, "createdBy.$id", "asc"))
        .isInstanceOf(ValidationException.class);
    assertThatThrownBy(() -> service.list(request, 0, 10, "", null, false, "name", "invalid"))
        .isInstanceOf(ValidationException.class);
    verifyNoInteractions(tokens, drafts, repository);
  }
}
