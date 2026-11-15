package com.openlap.community;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.gson.Gson;
import com.openlap.analytics_module.entities.Indicator;
import com.openlap.analytics_module.entities.utility_entities.*;
import com.openlap.analytics_module.repositories.IndicatorRepository;
import com.openlap.analytics_module.services.IndicatorUtilityService;
import com.openlap.analytics_module.services.impl.ComplexIndicatorMerger;
import com.openlap.analytics_statements.dtos.request.*;
import com.openlap.analytics_statements.entities.utility_entities.UserQueryCondition;
import com.openlap.analytics_statements.services.StatementService;
import com.openlap.analytics_technique.entities.AnalyticsTechnique;
import com.openlap.dataset.*;
import com.openlap.infrastructure.exception.ValidationException;
import com.openlap.user.entities.User;
import com.openlap.user.entities.utility_entities.LrsConsumer;
import com.openlap.visualization_methods.entities.*;
import java.util.*;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class CommunityIndicatorExecutionTest {
  final IndicatorRepository repository = mock(IndicatorRepository.class);
  final StatementService statements = mock(StatementService.class);
  final IndicatorUtilityService utility = mock(IndicatorUtilityService.class);
  final CommunityIndicatorExecution execution = new CommunityIndicatorExecution(repository, statements, utility,
      new ComplexIndicatorMerger(), new ObjectMapper());
  final Gson gson = new Gson();
  final User creator = user("Creator Person", "author@example.test");
  final User viewer = user("Viewer Person", "viewer@example.test");
  final String lrs = new ObjectId().toHexString();
  final AnalyticsTechnique method = new AnalyticsTechnique();
  final VisLibrary library = new VisLibrary();
  final VisType chart = new VisType();

  @BeforeEach void setup() throws Exception {
    method.setId(new ObjectId().toHexString()); method.setName("Count items");
    library.setId(new ObjectId().toHexString()); library.setName("Chart library");
    chart.setId(new ObjectId().toHexString()); chart.setName("Bar chart"); chart.setVisualizationLib(library);
    viewer.setLrsConsumerList(new ArrayList<>(List.of(connection(lrs, "viewer-id"))));
    when(statements.validateLrsUser(any())).thenReturn(true);
    when(statements.findStatements(any())).thenAnswer(invocation -> data("items", OpenLAPColumnDataType.Text, List.of("viewer activity")));
    when(utility.getAnalyzedDataSetMethod(any(), any())).thenAnswer(invocation -> output());
    when(utility.getIndicatorCodeMethod(any(), anyString(), anyString(), any(), any(), eq(true))).thenReturn("viewer-only-chart");
  }

  @Test void basicUsesViewerIdentityOnlyAndPreservesOriginalFilters() {
    Indicator source = basic("Activity count");
    String originalQuery = source.getIndicatorQuery();
    var graph = execution.execute(source, viewer, Map.of(), Map.of());
    var query = gson.fromJson(graph.root().getIndicatorQuery(), StatementsRequest.class);
    assertThat(query.getUserQueryCondition()).isEqualTo(UserQueryCondition.ONLY_ME);
    assertThat(query.getLrsStores()).extracting(LrsStoresStatementRequest::getUniqueIdentifier).containsExactly("viewer-id");
    assertThat(query.getActivities()).containsEntry("statement.object.definition.name.en", new ArrayList<>(List.of("Course activity")));
    assertThat(query.getDuration().getFrom()).isEqualTo("2026-01-01");
    assertThat(source.getIndicatorQuery()).isEqualTo(originalQuery);
    assertThat(graph.root().getCreatedBy()).isSameAs(viewer);
    assertThat(graph.root().getId()).isNotEqualTo(source.getId());
    assertThat(graph.root().getConfigurationRequest()).doesNotContain("creator-id", creator.getId(), creator.getEmail(), source.getId());
    verifyNoInteractions(repository);
  }

  @Test void missingAnyRequiredLrsBlocksBeforeReadingAnyData() {
    Indicator source = basic("Multi source");
    var query = gson.fromJson(source.getIndicatorQuery(), StatementsRequest.class);
    query.getLrsStores().add(new LrsStoresStatementRequest(new ObjectId().toHexString(), "creator-other-id"));
    source.setIndicatorQuery(gson.toJson(query));
    assertThatThrownBy(() -> execution.execute(source, viewer, Map.of(), Map.of()))
        .isInstanceOf(ValidationException.class).extracting("code").isEqualTo("MISSING_LRS");
    verify(statements, never()).findStatements(any());
    verifyNoInteractions(utility);
  }

  @Test void multipleStoresAreExecutedAsExactStoreActorPairsAndUnitedBeforeAnalysis() throws Exception {
    Indicator source = basic("Two sources");
    String second = new ObjectId().toHexString();
    var query = gson.fromJson(source.getIndicatorQuery(), StatementsRequest.class);
    query.getLrsStores().add(new LrsStoresStatementRequest(second, "creator-other"));
    source.setIndicatorQuery(gson.toJson(query));
    viewer.getLrsConsumerList().add(connection(second, "viewer-second"));
    when(statements.findStatements(any())).thenAnswer(invocation -> {
      var request = invocation.getArgument(0, StatementsRequest.class);
      assertThat(request.getLrsStores()).hasSize(1);
      return data("items", OpenLAPColumnDataType.Text,
          List.of(request.getLrsStores().get(0).getUniqueIdentifier()));
    });
    execution.execute(source, viewer, Map.of(), Map.of());
    var captured = ArgumentCaptor.forClass(OpenLAPDataSet.class);
    verify(utility).getAnalyzedDataSetMethod(any(), captured.capture());
    assertThat(captured.getValue().getColumns().get("items").getData()).containsExactly("viewer-id", "viewer-second");
  }

  @Test void ambiguousLearnerIdentityCannotBeChosenArbitrarily() {
    viewer.getLrsConsumerList().add(connection(lrs, "another-viewer-id"));
    assertThatThrownBy(() -> execution.execute(basic("Activity count"), viewer, Map.of(), Map.of()))
        .isInstanceOf(ValidationException.class).extracting("code").isEqualTo("CHOOSE_CONNECTION");
    verify(statements, never()).findStatements(any());
  }

  @Test void connectionSelectionCannotInjectAnotherAccountIdentifier() {
    assertThatThrownBy(() -> execution.execute(basic("Activity count"), viewer, Map.of(lrs, new ObjectId().toHexString()), Map.of()))
        .isInstanceOf(ValidationException.class).extracting("code").isEqualTo("MISSING_LRS");
  }

  @Test void explicitViewerOwnedIdentitySelectionWorks() {
    var desired = connection(lrs, "selected-viewer"); viewer.getLrsConsumerList().add(desired);
    var graph = execution.execute(basic("Activity count"), viewer, Map.of(lrs, desired.getId().toHexString()), Map.of());
    assertThat(graph.root().getIndicatorQuery()).contains("selected-viewer").doesNotContain("creator-id");
  }

  @Test void duplicateRegistrationOfSameIdentityDoesNotCauseAmbiguity() {
    viewer.getLrsConsumerList().add(connection(lrs, "viewer-id"));
    assertThat(execution.execute(basic("Activity count"), viewer, Map.of(), Map.of()).previewCode()).isEqualTo("viewer-only-chart");
  }

  @Test void noRawViewerDataMeansNoSuccessfulPreviewEvenIfMethodCouldReturnZeroCount() {
    when(statements.findStatements(any())).thenReturn(new OpenLAPDataSet());
    assertThatThrownBy(() -> execution.execute(basic("Activity count"), viewer, Map.of(), Map.of()))
        .isInstanceOf(ValidationException.class).extracting("code").isEqualTo("NO_DATA");
    verifyNoInteractions(utility);
  }

  @Test void compositeCopiesAndAnalyzesEveryLeafWithoutOriginalIdExecution() {
    var first = basic("Creator Person secret one"); var second = basic("Secret two");
    Indicator composite = complex(IndicatorType.COMPOSITE, first, second);
    var graph = execution.execute(composite, viewer, Map.of(), Map.of());
    assertThat(graph.leaves()).hasSize(2);
    assertThat(graph.root().getIndicators()).extracting(i -> i.getIndicator().getId())
        .doesNotContain(first.getId(), second.getId());
    assertThat(graph.root().getIndicators()).extracting(IndicatorsToMerge::getLabel).containsExactly("Source 1", "Source 2");
    assertThat(graph.leaves()).allSatisfy(leaf -> {
      assertThat(leaf.getCreatedBy()).isSameAs(viewer);
      assertThat(leaf.getIndicatorQuery()).contains("viewer-id", "ONLY_ME").doesNotContain("creator-id");
    });
    assertThat(graph.root().getConfigurationRequest()).doesNotContain(first.getId(), second.getId(), creator.getName(), "creator-id");
    verify(utility, times(2)).getAnalyzedDataSetMethod(any(), any());
    verify(repository).findById(first.getId()); verify(repository).findById(second.getId());
    verify(repository, never()).save(any());
  }

  @Test void compositeRetainsWideMappingByRewritingSourceColumnIdentities() {
    var first = basic("One"); var second = basic("Two");
    Indicator composite = complex(IndicatorType.COMPOSITE, first, second);
    composite.getVisualizationTechniqueReference().setAnalyticsTechniqueToVisualizationMapping(mapping("source_" + first.getId() + "__count", OpenLAPColumnDataType.Numeric, "y"));
    var graph = execution.execute(composite, viewer, Map.of(), Map.of());
    assertThat(graph.root().getVisualizationTechniqueReference().getAnalyticsTechniqueToVisualizationMapping())
        .contains("source_" + graph.leaves().get(0).getId() + "__count").doesNotContain(first.getId());
    assertThat(graph.root().getConfigurationRequest()).contains("\"dataMode\":\"aligned\"");
  }

  @Test void compositeRejectsDifferentAnalyticsMethods() {
    var first = basic("One"); var second = basic("Two");
    var other = new AnalyticsTechnique(); other.setId(new ObjectId().toHexString());
    second.getAnalyticsTechniqueReference().setAnalyticsTechnique(other);
    Indicator composite = complex(IndicatorType.COMPOSITE, first, second);
    assertThatThrownBy(() -> execution.execute(composite, viewer, Map.of(), Map.of())).isInstanceOf(com.openlap.infrastructure.exception.OpenLapException.class);
    verify(statements, never()).findStatements(any());
  }

  @Test void multilevelRebindsEachLeafAndRewritesFinalMethodMappingsBeforeExecutingIt() {
    var first = basic("One"); var second = basic("Two");
    Indicator multi = complex(IndicatorType.MULTI_LEVEL, first, second);
    multi.setAnalyticsTechniqueReference(new AnalyticsTechniqueReference("[]", mapping("source_" + first.getId() + "__count", OpenLAPColumnDataType.Numeric, "items"), method));
    multi.getVisualizationTechniqueReference().setAnalyticsTechniqueToVisualizationMapping(mapping("count", OpenLAPColumnDataType.Numeric, "y"));
    var graph = execution.execute(multi, viewer, Map.of(), Map.of());
    assertThat(graph.root().getAnalyticsTechniqueReference().getQueryToAnalyticsTechniqueMapping())
        .contains("source_" + graph.leaves().get(0).getId() + "__count").doesNotContain(first.getId());
    verify(utility, times(3)).getAnalyzedDataSetMethod(any(), any());
  }

  @Test void fullGraphFingerprintChangesWhenALeafDefinitionChanges() {
    var first = basic("One"); var second = basic("Two");
    Indicator multi = complex(IndicatorType.MULTI_LEVEL, first, second);
    String before = execution.fingerprint(multi);
    second.setIndicatorQuery(second.getIndicatorQuery().replace("2026-01-01", "2026-02-01"));
    assertThat(execution.fingerprint(multi)).isNotEqualTo(before);
  }

  @Test void copyConfigurationDropsFreeTextChartOptionsAndAuthorPortMetadata() {
    var source = basic("Activity count");
    source.getVisualizationTechniqueReference().setAdditionalParams("{\"title\":\"author@example.test\",\"height\":500}");
    source.getVisualizationTechniqueReference().setAnalyticsTechniqueToVisualizationMapping(source.getVisualizationTechniqueReference().getAnalyticsTechniqueToVisualizationMapping().replace("Output", "author@example.test"));
    var graph = execution.execute(source, viewer, Map.of(), Map.of());
    assertThat(graph.root().getConfigurationRequest()).doesNotContain("author@example.test");
    assertThat(graph.root().getVisualizationTechniqueReference().getAdditionalParams()).contains("height");
  }

  @Test void authorIdentifyingMethodParametersCannotBecomeACopiedPrivateDefinition() {
    var source = basic("Activity count");
    source.getAnalyticsTechniqueReference().setAdditionalParams("[{\"id\":\"label\",\"value\":\"author@example.test\"}]");
    assertThatThrownBy(() -> execution.execute(source, viewer, Map.of(), Map.of())).isInstanceOf(ValidationException.class);
  }

  @Test void nestedPrivateMethodParameterValuesCannotLeakIntoTheCopiedDefinition() {
    var source = basic("Activity count");
    source.getAnalyticsTechniqueReference().setAdditionalParams("[{\"id\":\"options\",\"value\":{\"labels\":[\"author@example.test\"]}}]");
    assertThatThrownBy(() -> execution.execute(source, viewer, Map.of(), Map.of())).isInstanceOf(ValidationException.class);
  }

  @Test void savedTargetIdsAreStableForReceiptRetries() {
    var source = basic("Activity count"); var id = new ObjectId().toHexString();
    var first = execution.execute(source, viewer, Map.of(), Map.of(source.getId(), id));
    var second = execution.execute(source, viewer, Map.of(), first.targets());
    assertThat(second.root().getId()).isEqualTo(id);
    assertThat(second.bindingsHash()).isEqualTo(first.bindingsHash());
  }

  @Test void privateActivitySelectorBlocksRatherThanSilentlyRedactingTheQuery() {
    var source = basic("Activity count");
    source.setIndicatorQuery(source.getIndicatorQuery().replace("Course activity", "creator-id activity"));
    assertThatThrownBy(() -> execution.execute(source, viewer, Map.of(), Map.of()))
        .isInstanceOf(ValidationException.class).extracting("code").isEqualTo("INCOMPATIBLE");
    verify(statements, never()).findStatements(any());
  }

  @Test void connectionChoicesExposeOnlyViewerOwnedIdentitiesInMatchedStores() {
    var source = basic("Activity count");
    viewer.getLrsConsumerList().add(connection(lrs, "second-viewer"));
    viewer.getLrsConsumerList().add(connection("unrelated-store", "unrelated-viewer"));
    var choices = execution.connectionChoices(source, viewer);
    assertThat(choices).hasSize(1);
    assertThat(choices.get(0).lrsId()).isEqualTo(lrs);
    assertThat(choices.get(0).options()).extracting(CommunityIndicatorExecution.ConnectionOption::label)
        .containsExactly("viewer-id", "second-viewer");
    assertThat(gson.toJson(choices)).doesNotContain("creator-id", creator.getName(), creator.getId(), "unrelated-viewer");
  }

  Indicator basic(String name) {
    Indicator value = new Indicator(); value.setId(new ObjectId().toHexString()); value.setName(name);
    value.setIndicatorType(IndicatorType.BASIC); value.setCreatedBy(creator);
    var query = new StatementsRequest(new ArrayList<>(List.of(new LrsStoresStatementRequest(lrs, "creator-id"))),
        List.of("pdf"), List.of("viewed"), Map.of("statement.object.definition.name.en", new ArrayList<>(List.of("Course activity"))),
        new StatementDuration("2026-01-01", "2026-11-15"), List.of("items"), UserQueryCondition.INCLUDE_ME);
    value.setIndicatorQuery(gson.toJson(query));
    value.setAnalyticsTechniqueReference(new AnalyticsTechniqueReference("[]", mapping("items", OpenLAPColumnDataType.Text, "items"), method));
    value.setVisualizationTechniqueReference(new VisualizationTechniqueReference("{}", mapping("count", OpenLAPColumnDataType.Numeric, "y"), library, chart));
    return value;
  }

  Indicator complex(IndicatorType type, Indicator first, Indicator second) {
    Indicator value = new Indicator(); value.setId(new ObjectId().toHexString()); value.setName("Community analysis");
    value.setCreatedBy(creator); value.setIndicatorType(type);
    String key = gson.toJson(new OpenLAPColumnConfigData("items", OpenLAPColumnDataType.Text, true, "Matching items", ""));
    value.setColumnToMerge(key);
    value.setIndicators(List.of(new IndicatorsToMerge(first, key, List.of("count"), "Creator Person one"),
        new IndicatorsToMerge(second, key, List.of("count"), "Creator Person two")));
    value.setVisualizationTechniqueReference(new VisualizationTechniqueReference("{}", mapping("combined_value", OpenLAPColumnDataType.Numeric, "y"), library, chart));
    when(repository.findById(first.getId())).thenReturn(Optional.of(first));
    when(repository.findById(second.getId())).thenReturn(Optional.of(second));
    return value;
  }

  String mapping(String output, OpenLAPColumnDataType type, String input) {
    return gson.toJson(new OpenLAPPortConfig(new ArrayList<>(List.of(new OpenLAPPortMapping(
        new OpenLAPColumnConfigData(output, type, true, "Output", ""), new OpenLAPColumnConfigData(input, type, true, "Input", ""))))));
  }

  static User user(String name, String email) { User value = new User(); value.setId(new ObjectId().toHexString()); value.setName(name); value.setEmail(email); return value; }
  static LrsConsumer connection(String store, String actor) { return new LrsConsumer(new ObjectId(), store, actor); }
  static OpenLAPDataSet output() throws Exception { var result = data("items", OpenLAPColumnDataType.Text, List.of("viewer activity")); add(result, "count", OpenLAPColumnDataType.Numeric, List.of(7)); return result; }
  static OpenLAPDataSet data(String id, OpenLAPColumnDataType type, List<?> values) throws Exception { var result = new OpenLAPDataSet(); add(result, id, type, values); return result; }
  @SuppressWarnings({"rawtypes", "unchecked"}) static void add(OpenLAPDataSet result, String id, OpenLAPColumnDataType type, List<?> values) throws Exception {
    var column = new OpenLAPDataColumn(id, type, true, id, ""); column.setData(new ArrayList(values)); result.addOpenLAPDataColumn(column);
  }
}
