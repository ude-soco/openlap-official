package com.openlap.community.adaptation;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.google.gson.Gson;
import com.openlap.analytics_module.drafts.IndicatorDraftConfiguration;
import com.openlap.analytics_module.entities.Indicator;
import com.openlap.analytics_module.entities.utility_entities.*;
import com.openlap.analytics_module.services.IndicatorUtilityService;
import com.openlap.analytics_module.services.impl.*;
import com.openlap.analytics_statements.dtos.request.*;
import com.openlap.analytics_statements.entities.utility_entities.UserQueryCondition;
import com.openlap.analytics_statements.services.StatementService;
import com.openlap.analytics_technique.entities.AnalyticsTechnique;
import com.openlap.analytics_technique.services.AnalyticsTechniqueService;
import com.openlap.dataset.*;
import com.openlap.infrastructure.exception.ValidationException;
import com.openlap.user.entities.User;
import com.openlap.user.entities.utility_entities.LrsConsumer;
import com.openlap.user.services.TokenService;
import com.openlap.visualization_methods.entities.*;
import com.openlap.visualization_methods.services.VisualizationMethodUtilityService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.*;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.*;
import org.mockito.ArgumentCaptor;

class AdaptationExecutionTest {
  final TokenService tokens = mock(TokenService.class);
  final StatementService statements = mock(StatementService.class);
  final AnalyticsTechniqueService methods = mock(AnalyticsTechniqueService.class);
  final VisualizationMethodUtilityService charts = mock(VisualizationMethodUtilityService.class);
  final IndicatorUtilityService utility = mock(IndicatorUtilityService.class);
  final IndicatorDraftDefinitionService definitions = mock(IndicatorDraftDefinitionService.class);
  final ObjectMapper mapper = new ObjectMapper();
  final Gson gson = new Gson();
  final AdaptationExecution execution = new AdaptationExecution(tokens, statements, methods, charts, utility,
      definitions, new ComplexIndicatorMerger(), new IndicatorDraftConfiguration(mapper), mapper);
  final HttpServletRequest request = mock(HttpServletRequest.class);
  final User viewer = new User();
  final AnalyticsTechnique method = new AnalyticsTechnique();
  final VisLibrary library = new VisLibrary();
  final VisType chart = new VisType();
  final String lrs = new ObjectId().toHexString();

  @BeforeEach void setup() throws Exception {
    viewer.setId(new ObjectId().toHexString());
    viewer.setLrsConsumerList(new ArrayList<>(List.of(new LrsConsumer(new ObjectId(), lrs, "my-learner"))));
    when(tokens.getUserFromToken(request)).thenReturn(viewer);
    when(statements.validateLrsUser(any())).thenReturn(true);
    when(statements.findStatements(any())).thenReturn(data("statement.object.id", OpenLAPColumnDataType.Text, List.of("one", "two")));
    method.setId("count"); method.setName("Count"); method.setArtifactId("method-sha1"); method.setOutputs("[]");
    when(methods.fetchAnalyticsTechniqueMethod(anyString())).thenReturn(method);
    when(methods.validateAnalyticsTechniqueMapping(anyString(), any())).thenReturn(new OpenLAPDataSetConfigValidationResult(true, "Valid"));
    when(methods.getAnalyticsTechniqueOutputs(anyString())).thenReturn(List.of(column("items", OpenLAPColumnDataType.Text), column("count", OpenLAPColumnDataType.Numeric)));
    when(utility.getAnalyzedDataSetMethod(any(), any())).thenAnswer(call -> output(List.of("one", "two"), List.of(4, 8)));
    library.setId("lib"); library.setName("Library"); library.setArtifactId("chart-sha1");
    chart.setId("bar"); chart.setName("Bar"); chart.setVisualizationLib(library);
    when(charts.fetchVisualizationLibraryMethod("lib")).thenReturn(library);
    when(charts.fetchVisualizationTypeMethod("bar")).thenReturn(chart);
    when(charts.validateAnalyticsTechniqueToVisualizationMapping(eq("bar"), any())).thenReturn(new OpenLAPDataSetConfigValidationResult(true, "Valid"));
    when(utility.getIndicatorCodeMethod(any(), eq("lib"), eq("bar"), any(), any(), eq(true))).thenReturn("private-chart");
    when(definitions.prepare(eq(request), eq(IndicatorType.BASIC), any())).thenAnswer(call -> {
      JsonNode payload = call.getArgument(2);
      Indicator result = new Indicator(); result.setCreatedBy(viewer); result.setName(payload.path("name").asText()); result.setIndicatorType(IndicatorType.BASIC);
      result.setIndicatorQuery(payload.path("indicatorQuery").toString()); result.setConfigurationRequest(payload.path("configuration").asText());
      result.setAnalyticsTechniqueReference(new AnalyticsTechniqueReference("[]", payload.path("analyticsTechniqueMapping").toString(), method));
      result.setVisualizationTechniqueReference(new VisualizationTechniqueReference("{}", payload.path("visualizationMapping").toString(), library, chart)); return result;
    });
  }

  @Test void basicExecutesOnlyExplicitlySelectedOwnConnectionAndOwnRecipe() {
    var draft = draft("BASIC", basic());
    var result = execution.execute(request, draft, "analysis", Map.of());
    var capture = ArgumentCaptor.forClass(StatementsRequest.class);
    verify(statements).findStatements(capture.capture());
    assertThat(capture.getValue().getUserQueryCondition()).isEqualTo(UserQueryCondition.ONLY_ME);
    assertThat(capture.getValue().getLrsStores()).extracting(LrsStoresStatementRequest::getUniqueIdentifier).containsExactly("my-learner");
    assertThat(result.root().getIndicatorQuery()).contains("clicked", "My activity").doesNotContain("original-id", "original-actor");
    assertThat(result.root().getCreatedBy()).isSameAs(viewer);
  }

  @Test void anyOwnRegisteredLrsCanReplaceTheCommunityConnection() {
    String alternate = new ObjectId().toHexString();
    viewer.getLrsConsumerList().add(new LrsConsumer(new ObjectId(), alternate, "alternate-me"));
    ObjectNode config = basic();
    ((ObjectNode) config.path("dataset").path("selectedLRSList").get(0)).put("lrsId", alternate).put("uniqueIdentifier", "alternate-me");
    assertThat(execution.execute(request, draft("BASIC", config), "analysis", Map.of()).root().getIndicatorQuery()).contains(alternate, "alternate-me");
  }

  @Test void missingConnectionAndNonPersonalScopeFailBeforeReadingData() {
    ObjectNode missing = basic();
    ((ObjectNode) missing.path("dataset").path("selectedLRSList").get(0)).put("uniqueIdentifier", "someone-else");
    assertThatThrownBy(() -> execution.execute(request, draft("BASIC", missing), "analysis", Map.of()))
        .isInstanceOf(ValidationException.class).extracting("code").isEqualTo("MISSING_LRS");
    ObjectNode other = basic(); ((ObjectNode) other.path("filters")).put("selectedUserFilter", "INCLUDE_ME");
    assertThatThrownBy(() -> execution.execute(request, draft("BASIC", other), "analysis", Map.of()))
        .isInstanceOf(ValidationException.class).extracting("code").isEqualTo("PERSONAL_DATA_REQUIRED");
    verify(statements, never()).findStatements(any());
  }

  @Test void invalidLaterChildCannotCausePartialDataExecution() {
    ObjectNode config = complex("COMPOSITE");
    ((ObjectNode) config.path("sourceDrafts").path("two").path("dataset").path("selectedLRSList").get(0)).put("uniqueIdentifier", "original-actor");
    assertThatThrownBy(() -> execution.execute(request, draft("COMPOSITE", config), "combine", Map.of())).isInstanceOf(ValidationException.class);
    verify(statements, never()).findStatements(any());
  }

  @Test void compositeCombinesRealOutputsUnderPrivateSlotsAndFillsMissingValues() throws Exception {
    when(utility.getAnalyzedDataSetMethod(any(), any())).thenReturn(output(List.of("one"), List.of(4)), output(List.of("two"), List.of(8)));
    var result = execution.execute(request, draft("COMPOSITE", complex("COMPOSITE")), "combine", Map.of());
    assertThat(result.data().getColumns().get("key").getData()).containsExactly("one", "two");
    assertThat(result.data().getColumns().get("source_one__count").getData()).containsExactly(4, 0);
    assertThat(result.data().getColumns().get("source_two__count").getData()).containsExactly(0, 8);
    assertThat(result.leaves()).hasSize(2);
    verifyNoInteractions(charts, definitions);
  }

  @Test void compositeRequiresSameMethodBeforeAnyExecution() {
    ObjectNode config = complex("COMPOSITE");
    ((ObjectNode) config.path("sourceDrafts").path("two").path("analysis").path("selectedAnalyticsMethod").path("method")).put("id", "different");
    assertThatThrownBy(() -> execution.execute(request, draft("COMPOSITE", config), "combine", Map.of()))
        .isInstanceOf(ValidationException.class).hasMessageContaining("same analytics method");
    verify(statements, never()).findStatements(any());
  }

  @Test void multiLevelUsesIntersectionAndRunsTheFinalMethodOnActualMergedColumns() throws Exception {
    when(utility.getAnalyzedDataSetMethod(any(), any())).thenReturn(output(List.of("one", "two"), List.of(4, 8)),
        output(List.of("two", "three"), List.of(2, 9)), output(List.of("final"), List.of(8)));
    var result = execution.execute(request, draft("MULTI_LEVEL", complex("MULTI_LEVEL")), "analysis", Map.of());
    var capture = ArgumentCaptor.forClass(OpenLAPDataSet.class);
    verify(utility, times(3)).getAnalyzedDataSetMethod(any(), capture.capture());
    assertThat(capture.getAllValues().get(2).getColumns().get("key").getData()).containsExactly("two");
    assertThat(capture.getAllValues().get(2).getColumns().get("source_one__count").getData()).containsExactly(8);
    assertThat(result.data().getColumns().get("items").getData()).containsExactly("final");
  }

  @Test void emptyChildStopsTheGraphInsteadOfFallingBackToAnotherSource() {
    when(utility.getAnalyzedDataSetMethod(any(), any())).thenReturn(new OpenLAPDataSet());
    assertThatThrownBy(() -> execution.execute(request, draft("COMPOSITE", complex("COMPOSITE")), "combine", Map.of()))
        .isInstanceOf(ValidationException.class).extracting("code").isEqualTo("NO_DATA");
    verify(utility, times(1)).getAnalyzedDataSetMethod(any(), any());
  }

  @Test void finalPreviewValidatesChildChartsAndRemapsOnlyOwnedSourceNamespaces() {
    var draft = draft("COMPOSITE", complex("COMPOSITE"));
    var result = execution.execute(request, draft, "visualization", Map.of("root", "new-parent", "one", "new-one", "two", "new-two"));
    assertThat(result.previewCode()).isEqualTo("private-chart");
    assertThat(result.root().getConfigurationRequest()).contains("new-one", "new-two").doesNotContain("sourceDrafts", "original-id");
    execution.remapForPublication(result, result.targets());
    assertThat(result.root().getVisualizationTechniqueReference().getAnalyticsTechniqueToVisualizationMapping()).contains("source_new-one__count");
    assertThat(result.root().getIndicators()).extracting(source -> source.getIndicator().getId()).containsExactly("new-one", "new-two");
    verify(definitions, times(2)).prepare(eq(request), eq(IndicatorType.BASIC), any());
  }

  @Test void changingPluginVersionChangesThePreviewFingerprint() {
    Document draft = draft("BASIC", basic());
    String before = execution.execute(request, draft, "visualization", Map.of()).pluginsHash();
    method.setArtifactId("method-sha2");
    assertThat(execution.execute(request, draft, "visualization", Map.of()).pluginsHash()).isNotEqualTo(before);
  }

  @Test void childWithUnusableChartCanStillCombineButCannotBecomeASavedDependency() {
    ObjectNode config = complex("COMPOSITE");
    ((ObjectNode) config.path("sourceDrafts").path("two").path("visualization").path("selectedType")).put("id", "missing");
    assertThat(execution.execute(request, draft("COMPOSITE", config), "combine", Map.of()).data()).isNotNull();
    assertThatThrownBy(() -> execution.execute(request, draft("COMPOSITE", config), "visualization", Map.of()))
        .isInstanceOf(ValidationException.class).hasMessageContaining("Source 2");
  }

  ObjectNode basic() {
    return mapper.valueToTree(Map.of("schemaVersion", 1, "type", "BASIC", "indicator", Map.of("indicatorName", "My source", "type", "BASIC"),
        "dataset", Map.of("selectedLRSList", List.of(Map.of("lrsId", lrs, "uniqueIdentifier", "my-learner"))),
        "filters", Map.of("selectedUserFilter", "ONLY_ME", "selectedTime", Map.of("from", "2026-01-01", "until", "2026-11-16"),
            "selectedActivities", List.of(Map.of("id", "filter", "selectedActivityType", Map.of("id", "pdf", "name", "PDF"),
                "selectedActionList", List.of(Map.of("id", "clicked", "name", "Clicked")), "selectedActivityList", List.of(Map.of("id", "My activity", "name", "My activity", "queryId", "statement.object.definition.name.en"))))),
        "analysis", Map.of("selectedAnalyticsMethod", Map.of("method", Map.of("id", "count", "name", "Count"), "mapping", map("statement.object.id", OpenLAPColumnDataType.Text, "items")), "params", List.of()),
        "visualization", Map.of("selectedLibrary", Map.of("id", "lib", "name", "Library"), "selectedType", Map.of("id", "bar", "name", "Bar"), "mapping", map("count", OpenLAPColumnDataType.Numeric, "y"), "params", Map.of())));
  }

  ObjectNode complex(String type) {
    List<Object> sources = new ArrayList<>();
    for (String slot : List.of("one", "two")) sources.add(Map.of("id", slot, "name", slot, "label", slot,
        "analyticsMethod", Map.of("id", "count", "name", "Count"), "outputs", List.of(Map.of("id", "items", "type", "Text"), Map.of("id", "count", "type", "Numeric")), "keyColumnId", "items", "measureColumnIds", List.of("count")));
    return mapper.valueToTree(Map.of("schemaVersion", 1, "type", type, "name", "My variant", "sources", sources,
        "sourceDrafts", Map.of("one", basic(), "two", basic()), "analysis", Map.of("methodId", "count", "mapping", map("source_one__count", OpenLAPColumnDataType.Numeric, "items"), "params", List.of()),
        "visualization", Map.of("libraryId", "lib", "typeId", "bar", "mapping", map("COMPOSITE".equals(type) ? "source_one__count" : "count", OpenLAPColumnDataType.Numeric, "y"), "params", Map.of(), "dataMode", "aligned")));
  }
  Document draft(String type, JsonNode config) { return new Document("_id", "draft-test").append("ownerId", viewer.getId()).append("indicatorType", type).append("name", "My variant")
      .append("configuration", Document.parse(config.toString())).append("adaptation", new Document("poolId", "original-id").append("reference", new Document("notExecutable", "original-actor"))); }
  Object map(String output, OpenLAPColumnDataType type, String input) { return mapper.valueToTree(new OpenLAPPortConfig(new ArrayList<>(List.of(new OpenLAPPortMapping(column(output, type), column(input, type)))))); }
  static OpenLAPColumnConfigData column(String id, OpenLAPColumnDataType type) { return new OpenLAPColumnConfigData(id, type, true, id, ""); }
  static OpenLAPDataSet output(List<String> keys, List<Integer> counts) throws Exception { var result = data("items", OpenLAPColumnDataType.Text, keys); add(result, "count", OpenLAPColumnDataType.Numeric, counts); return result; }
  static OpenLAPDataSet data(String id, OpenLAPColumnDataType type, List<?> values) throws Exception { var result = new OpenLAPDataSet(); add(result, id, type, values); return result; }
  @SuppressWarnings({"rawtypes", "unchecked"}) static void add(OpenLAPDataSet data, String id, OpenLAPColumnDataType type, List<?> values) throws Exception { var column = new OpenLAPDataColumn(id, type, true, id, ""); column.setData(new ArrayList(values)); data.addOpenLAPDataColumn(column); }
}
