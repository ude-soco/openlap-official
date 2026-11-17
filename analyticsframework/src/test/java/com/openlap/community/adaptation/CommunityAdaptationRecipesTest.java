package com.openlap.community.adaptation;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.*;
import com.openlap.analytics_module.drafts.IndicatorDraftConfiguration;
import com.openlap.analytics_module.entities.Indicator;
import com.openlap.analytics_module.entities.utility_entities.*;
import com.openlap.analytics_module.repositories.IndicatorRepository;
import com.openlap.analytics_statements.services.StatementService;
import com.openlap.analytics_technique.entities.AnalyticsTechnique;
import com.openlap.user.entities.User;
import com.openlap.user.entities.utility_entities.LrsConsumer;
import java.util.*;
import org.bson.types.ObjectId;
import org.junit.Test;

public class CommunityAdaptationRecipesTest {
  private final ObjectMapper mapper = new ObjectMapper();
  private final IndicatorRepository indicators = mock(IndicatorRepository.class);
  private final StatementService statements = mock(StatementService.class);
  private final CommunityAdaptationRecipes recipes = new CommunityAdaptationRecipes(indicators, statements, mapper, new IndicatorDraftConfiguration(mapper));
  private final String pool = "b5925a28-89a8-4813-98a1-d515c7500397";

  private User owner() {
    var owner = new User(); owner.setId("author-private-account"); owner.setName("Alice Original"); owner.setEmail("alice@example.com");
    owner.setLrsConsumerList(List.of(new LrsConsumer(new ObjectId(), "author-private-store", "author-private-actor")));
    return owner;
  }
  private Indicator source() {
    var source = new Indicator(); source.setId("original-private-indicator"); source.setCreatedBy(owner()); source.setName("Learning accesses"); source.setIndicatorType(IndicatorType.BASIC);
    source.setIndicatorQuery("{\"lrsStores\":[{\"lrsId\":\"author-private-store\",\"uniqueIdentifier\":\"author-private-actor\"}],\"activityTypes\":[\"https://example.org/material\"],\"actionOnActivities\":[\"https://example.org/accessed\"],\"activities\":{\"statement.object.definition.name.en-US\":[\"Assignment 1\",\"Alice Original assignment\"]},\"duration\":{\"from\":\"2026-01-01T00:00:00Z\",\"until\":\"2026-12-01T00:00:00Z\"},\"userQueryCondition\":\"INCLUDE_ME\"}");
    var method = new AnalyticsTechnique(); method.setId("public-method"); method.setName("Count items"); method.setOutputs("[{\"config\":{\"id\":\"items\",\"title\":\"Items\",\"type\":\"Numeric\"}}]");
    source.setAnalyticsTechniqueReference(new AnalyticsTechniqueReference("[{\"id\":\"n\",\"value\":10},{\"id\":\"label\",\"value\":\"Alice Original\"}]", "{\"mapping\":[]}", method));
    source.setConfigurationRequest("author-private-config-with-cached-code-and-data");
    return source;
  }

  @Test public void snapshotOmitsOriginalIdentitiesQueriesCachesAndPrivateParameterValues() {
    var prepared = recipes.prepare(source(), new User(), pool);
    String reference = prepared.adaptation().toString(), working = prepared.configuration().toString();
    assertThat(reference).doesNotContain("Alice", "alice@", "author-private", "original-private", "configurationRequest", "lrsStores", "uniqueIdentifier", "cached-code");
    assertThat(working).doesNotContain("author-private", "original-private", "Alice");
    assertThat(prepared.adaptation().path("reference").path("analysis").path("method").path("id").asText()).isEqualTo("public-method");
    assertThat(prepared.adaptation().path("reference").path("filters").path("activities").get(1).path("name").asText()).isEqualTo("Not shared");
    assertThat(prepared.configuration().path("filters").path("selectedUserFilter").asText()).isEqualTo("ONLY_ME");
    verifyNoInteractions(statements, indicators);
  }

  @Test public void semanticSelectorIdsWithPrivateActorSegmentsRemainUnresolved() {
    var source = source();
    source.setIndicatorQuery("{\"lrsStores\":[{\"lrsId\":\"private-store\",\"uniqueIdentifier\":\"ab\"}],\"activityTypes\":[\"https://example.org/ab/material\"]}");
    var prepared = recipes.prepare(source, new User(), pool);
    assertThat(prepared.adaptation().toString()).doesNotContain("https://example.org/ab/material", "private-store");
    assertThat(prepared.adaptation().path("reference").path("filters").path("activityTypes").get(0).path("id").asText()).isEmpty();
  }

  @Test public void numericParameterValuesCannotExposeKnownActorIdentifiers() {
    var source = source();
    source.setIndicatorQuery("{\"lrsStores\":[{\"lrsId\":\"private-store\",\"uniqueIdentifier\":\"777777\"}]}");
    source.getAnalyticsTechniqueReference().setAdditionalParams("[{\"id\":\"threshold\",\"value\":777777}]");
    var prepared = recipes.prepare(source, new User(), pool);
    assertThat(prepared.adaptation().toString()).doesNotContain("777777", "private-store");
    assertThat(prepared.adaptation().path("reference").path("analysis").path("params").get(0).path("value").isNull()).isTrue();
  }

  @Test public void encodedContactInformationIsNotPublishedAsASemanticSelector() {
    var source = source();
    source.setIndicatorQuery("{\"activityTypes\":[\"https://example.org/alice%2540example.com/material\"]}");
    var prepared = recipes.prepare(source, new User(), pool);
    assertThat(prepared.adaptation().toString()).doesNotContain("alice%2540example.com");
    assertThat(prepared.adaptation().path("reference").path("filters").path("activityTypes").get(0).path("id").asText()).isEmpty();
  }

  @Test public void differentLrsPrefillsOnlyTheViewersExactChoicesAndLeavesDifferentVerbUnresolved() {
    var viewer = new User(); viewer.setLrsConsumerList(List.of(new LrsConsumer(new ObjectId(), "viewer-store", "viewer-actor")));
    when(statements.findUniqueActivityTypes(any())).thenReturn(List.of(Map.of("id", "https://example.org/material", "name", "Material")));
    when(statements.findUniqueActionOnActivities(any())).thenReturn(List.of(Map.of("id", "https://example.org/clicked", "name", "Clicked")));
    var prepared = recipes.prepare(source(), viewer, pool);
    assertThat(prepared.configuration().path("dataset").path("selectedLRSList").get(0).path("lrsId").asText()).isEqualTo("viewer-store");
    var filter = prepared.configuration().path("filters").path("selectedActivities").get(0);
    assertThat(filter.path("selectedActivityType").path("id").asText()).isEqualTo("https://example.org/material");
    assertThat(filter.path("selectedActionList")).isEmpty();
    assertThat(prepared.adaptation().path("reference").path("filters").path("actions").get(0).path("id").asText()).endsWith("/accessed");
    verify(statements, never()).findStatements(any());
    verify(statements, never()).findUniqueActivities(any());
  }

  @Test public void missingSourceAndDisabledMethodRemainRepairableWithoutExecution() {
    var leaf = source(); leaf.getAnalyticsTechniqueReference().getAnalyticsTechnique().setEnabled(false);
    var root = source(); root.setIndicatorType(IndicatorType.COMPOSITE); root.setIndicators(List.of(new IndicatorsToMerge(leaf, "{\"id\":\"items\"}", List.of("items"), "Alice Original"), new IndicatorsToMerge(null, null)));
    when(indicators.findById(leaf.getId())).thenReturn(Optional.of(leaf));
    var prepared = recipes.prepare(root, new User(), pool);
    assertThat(prepared.configuration().path("sourceDrafts").size()).isEqualTo(2);
    assertThat(prepared.configuration().path("sources").get(0).path("id").asText()).isEqualTo("source-1");
    assertThat(prepared.configuration().path("sourceDrafts")).allSatisfy(child ->
        assertThat(child.path("filters").path("selectedUserFilter").asText()).isEqualTo("ONLY_ME"));
    assertThat(prepared.configuration().path("sourceDrafts").path("source-1").path("analysis").path("selectedAnalyticsMethod").path("method").path("id").asText()).isEmpty();
    assertThat(prepared.adaptation().path("reference").path("sources").get(1).path("reference").path("unavailable").asBoolean()).isTrue();
    assertThat(prepared.adaptation().toString()).doesNotContain(leaf.getId(), "Alice");
    verifyNoInteractions(statements);
  }

  @Test public void complexNamespacesAreReplacedWithAnonymousSlotsAndSnapshotIsIndependentOfEdits() {
    var leaf = source(); var root = source(); root.setId("another-private-root"); root.setIndicatorType(IndicatorType.MULTI_LEVEL);
    root.setIndicators(List.of(new IndicatorsToMerge(leaf, "{\"id\":\"items\"}", List.of("items"), "Custom label")));
    root.getAnalyticsTechniqueReference().setQueryToAnalyticsTechniqueMapping("{\"mapping\":[{\"inputPort\":{\"id\":\"numbers\",\"type\":\"Numeric\"},\"outputPort\":{\"id\":\"source_original-private-indicator__items\",\"type\":\"Numeric\"}}]}");
    when(indicators.findById(leaf.getId())).thenReturn(Optional.of(leaf));
    var prepared = recipes.prepare(root, new User(), pool);
    String frozen = prepared.adaptation().toString();
    assertThat(frozen).contains("source_source-1__items").doesNotContain("source_original-private-indicator__items");
    leaf.setName("Changed later"); root.setName("Changed root");
    assertThat(prepared.adaptation().toString()).isEqualTo(frozen);
  }
}
