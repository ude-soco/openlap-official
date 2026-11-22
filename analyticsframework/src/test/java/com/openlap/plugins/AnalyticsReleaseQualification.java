package com.openlap.plugins;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.Assume.assumeTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.gson.Gson;
import com.openlap.analytics_module.dto.requests.indicator.IndicatorAnalysisRequest;
import com.openlap.analytics_module.entities.Indicator;
import com.openlap.analytics_module.entities.utility_entities.AnalyticsTechniqueReference;
import com.openlap.analytics_module.entities.utility_entities.IndicatorAnalysisTechnique;
import com.openlap.analytics_module.entities.utility_entities.IndicatorType;
import com.openlap.analytics_module.repositories.IndicatorCacheRepository;
import com.openlap.analytics_module.repositories.IndicatorRepository;
import com.openlap.analytics_module.services.impl.IndicatorBasicServiceImpl;
import com.openlap.analytics_module.services.impl.IndicatorUtilityServiceImpl;
import com.openlap.analytics_statements.services.StatementService;
import com.openlap.analytics_technique.entities.AnalyticsTechnique;
import com.openlap.analytics_technique.dto.response.AnalyticsTechniqueResponse.BasicInputRequirement;
import com.openlap.analytics_technique.repositories.AnalyticsTechniqueRepository;
import com.openlap.analytics_technique.services.impl.AnalyticsTechniqueServiceImpl;
import com.openlap.dataset.*;
import com.openlap.dynamicparam.OpenLAPDynamicParam;
import com.openlap.infrastructure.exception.ValidationException;
import com.openlap.plugins.artifacts.PluginArtifactResolver;
import com.openlap.plugins.artifacts.PluginKind;
import com.openlap.plugins.management.PluginCatalogVisibility;
import com.openlap.plugins.management.PluginInspector;
import com.openlap.template.AnalyticsMethod;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.*;
import java.util.jar.JarFile;
import org.junit.Before;
import org.junit.After;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;
import org.springframework.test.util.ReflectionTestUtils;

/** Explicit release gate: ./mvnw -Dtest=AnalyticsReleaseQualification test. No database required. */
public class AnalyticsReleaseQualification {
  @Rule public TemporaryFolder temporary = new TemporaryFolder();
  private final List<AnalyticsTechnique> installed = new ArrayList<>();
  private AnalyticsTechniqueServiceImpl analytics;
  private IndicatorUtilityServiceImpl utility;
  private IndicatorBasicServiceImpl basic;
  private StatementService statements;
  private IndicatorRepository indicators;
  private Path pluginFolder;
  private Path jar;

  @After public void closeLoaders() {
    if (analytics != null) analytics.closePluginLoaders();
  }

  @Before public void installDeliveredJarThroughLocalStartup() throws Exception {
    Path delivery = Path.of(System.getProperty("openlap.analytics.release.jar",
        "../analytics-methods/target/OpenLAP-Analytics-1.3.0.jar")).toAbsolutePath();
    assertThat(delivery).as("Build analytics-methods before release qualification").isRegularFile();
    pluginFolder = temporary.newFolder("plugins").toPath();
    jar = Files.copy(delivery, pluginFolder.resolve(delivery.getFileName()));
    AnalyticsTechniqueRepository catalog = mock(AnalyticsTechniqueRepository.class);
    when(catalog.findAll()).thenAnswer(call -> new ArrayList<>(installed));
    when(catalog.findById(any())).thenAnswer(call -> installed.stream()
        .filter(entry -> entry.getId().equals(call.getArgument(0))).findFirst());
    when(catalog.saveAll(any())).thenAnswer(call -> {
      Iterable<AnalyticsTechnique> entries = call.getArgument(0);
      entries.forEach(entry -> { entry.setId("method-" + installed.size()); installed.add(entry); });
      return new ArrayList<>(installed);
    });
    analytics = new AnalyticsTechniqueServiceImpl(catalog,
        PluginArtifactResolver.local(), PluginCatalogVisibility.legacyOnly());
    ReflectionTestUtils.setField(analytics, "analyticsMethodsJarsFolder", pluginFolder.toString());
    analytics.populateAnalyticsTechniques();
    analytics.populateAnalyticsTechniques();
    assertThat(installed).hasSize(8);
    indicators = mock(IndicatorRepository.class);
    utility = new IndicatorUtilityServiceImpl(null, null, null, analytics, indicators, null);
    statements = mock(StatementService.class);
    IndicatorCacheRepository caches = mock(IndicatorCacheRepository.class);
    when(caches.findById(any())).thenReturn(Optional.empty());
    basic = new IndicatorBasicServiceImpl(analytics, statements, utility, null, caches);
  }

  @Test public void shadedArchivePassesTheAdminInspectorWithoutBundlingThePluginApi() throws Exception {
    var inspection = new PluginInspector().inspect(PluginKind.ANALYTICS, jar);
    assertThat(inspection.getEntries()).hasSize(8);
    assertThat(analytics.getAllAnalyticsTechniques()).extracting(method -> method.getName())
        .containsExactlyInAnyOrder(
            "Calculate completion or success rate",
            "Count distinct values",
            "Count events by category",
            "Count events over time",
            "Count selected events",
            "Group observations using reproducible K-means++",
            "Summarize numeric values",
            "Summarize numeric values by group");
    assertThat(inspection.getClasses()).containsExactly(
        "com.openlap.analytics.methods.BooleanRate",
        "com.openlap.analytics.methods.DistinctValueCount",
        "com.openlap.analytics.methods.EventCount",
        "com.openlap.analytics.methods.EventFrequency",
        "com.openlap.analytics.methods.EventsOverTime",
        "com.openlap.analytics.methods.GroupedNumericSummary",
        "com.openlap.analytics.methods.NumericSummary",
        "com.openlap.analytics.methods.ReproducibleKMeans");
    try (JarFile archive = new JarFile(jar.toFile())) {
      assertThat(archive.stream().map(entry -> entry.getName()))
          .noneMatch(name -> name.startsWith("com/openlap/template/")
              || name.startsWith("com/openlap/dataset/") || name.startsWith("org/apache/commons/math3/"));
      assertThat(archive.getJarEntry("com/openlap/analytics/methods/CorrelationMethod.class")).isNull();
      assertThat(archive.getJarEntry("META-INF/openlap/analytics.json")).isNotNull();
      assertThat(archive.getJarEntry("META-INF/LICENSE.txt")).isNotNull();
      assertThat(archive.getJarEntry("com/openlap/analytics/internal/math3/stat/descriptive/DescriptiveStatistics.class"))
          .isNotNull();
    }
  }

  @Test public void basicIndicatorsCountEventsWithoutScores() {
    OpenLAPDataSet events = dataset(Map.of(
        "statement.id", Arrays.asList("one", null, "three", "four"),
        "statement.object.definition.name.en-US", List.of("Quiz", "Quiz", "Forum", "Quiz")));
    when(statements.findStatements(any())).thenReturn(events);
    String totalMethod = id("EventCount");
    IndicatorAnalysisRequest total = new IndicatorAnalysisRequest();
    total.setAnalyticsTechniqueId(totalMethod);
    total.setAnalyticsTechniqueMapping(mapping(totalMethod, Map.of("event", "statement.id")));
    assertThat(values(basic.analyzeIndicator(total), "event_count")).containsExactly(4);

    String groupedMethod = id("EventFrequency");
    IndicatorAnalysisRequest byActivity = new IndicatorAnalysisRequest();
    byActivity.setAnalyticsTechniqueId(groupedMethod);
    byActivity.setAnalyticsTechniqueMapping(mapping(groupedMethod,
        Map.of("category", "statement.object.definition.name.en-US")));
    OpenLAPDataSet result = basic.analyzeIndicator(byActivity);
    assertThat(values(result, "category")).containsExactly("Quiz", "Forum");
    assertThat(values(result, "event_count")).containsExactly(3, 1);
    assertThat(values(result, "percentage")).containsExactly(75.0, 25.0);
  }

  @Test public void editorRecommendationsFollowTheManifestAndSurviveDisplayNameChanges() {
    var mapper = new ObjectMapper();
    List<IndicatorType> basicTypes = List.of(IndicatorType.BASIC);
    List<IndicatorType> multiLevelTypes = List.of(IndicatorType.MULTI_LEVEL);
    Map<String, List<IndicatorType>> expected = Map.of(
        id("EventCount"), basicTypes,
        id("EventFrequency"), basicTypes,
        id("DistinctValueCount"), basicTypes,
        id("EventsOverTime"), basicTypes,
        id("BooleanRate"), basicTypes,
        id("GroupedNumericSummary"), basicTypes,
        id("NumericSummary"), List.of(IndicatorType.BASIC, IndicatorType.MULTI_LEVEL),
        id("ReproducibleKMeans"), multiLevelTypes);
    Map<String, BasicInputRequirement> basicInputs = Map.of(
        id("EventCount"), BasicInputRequirement.EVENTS,
        id("EventFrequency"), BasicInputRequirement.CATEGORY,
        id("DistinctValueCount"), BasicInputRequirement.CATEGORY,
        id("EventsOverTime"), BasicInputRequirement.TIMESTAMP,
        id("BooleanRate"), BasicInputRequirement.OUTCOME,
        id("NumericSummary"), BasicInputRequirement.SCORE,
        id("GroupedNumericSummary"), BasicInputRequirement.SCORE_AND_CATEGORY);

    assertThat(analytics.getAllAnalyticsTechniques()).hasSize(expected.size()).allSatisfy(method -> {
      assertThat(method.getRecommendedFor()).containsExactlyElementsOf(expected.get(method.getId()));
      assertThat(method.getBasicInputRequirement()).isEqualTo(basicInputs.get(method.getId()));
      assertThat(mapper.valueToTree(method).path("metadata").isObject()).isTrue();
      assertThat(analytics.getAnalyticsTechniquesById(method.getId()).getRecommendedFor())
          .isEqualTo(method.getRecommendedFor());
    });

    String builtInId = id("ReproducibleKMeans");
    var clustering = mapper.valueToTree(analytics.getAnalyticsTechniquesById(builtInId)).path("metadata");
    assertThat(clustering.path("outputHints").path("x").path("labelFromInput").asText()).isEqualTo("x");
    assertThat(clustering.path("outputHints").path("cluster").path("role").asText()).isEqualTo("CLUSTER");
    installed.stream().filter(method -> method.getId().equals(builtInId)).findFirst().orElseThrow()
        .setName("Renamed clustering");
    assertThat(analytics.getAnalyticsTechniquesById(builtInId).getRecommendedFor())
        .isEqualTo(multiLevelTypes);

    AnalyticsTechnique custom = new AnalyticsTechnique();
    custom.setId("custom-method");
    custom.setName("Pearson correlation");
    custom.setImplementingClass("com.example.custom.PearsonCorrelation");
    custom.setEnabled(true);
    installed.add(custom);
    var unclassified = analytics.getAnalyticsTechniquesById(custom.getId());
    assertThat(unclassified.getRecommendedFor()).isEmpty();
    assertThat(mapper.valueToTree(unclassified).has("recommendedFor")).isFalse();
    assertThat(mapper.valueToTree(unclassified).has("basicInputRequirement")).isFalse();
    assertThat(mapper.valueToTree(unclassified).has("metadata")).isFalse();
    assertThat(analytics.getAllAnalyticsTechniques()).contains(unclassified);

    for (String retired : List.of("PearsonCorrelation", "SpearmanCorrelation")) {
      var prior = new AnalyticsTechnique();
      prior.setId(retired);
      prior.setName("Renamed " + retired);
      prior.setImplementingClass("com.openlap.analytics.methods." + retired);
      prior.setEnabled(true);
      installed.add(prior);
      assertThat(analytics.getAnalyticsTechniquesById(retired).getRecommendedFor()).isEmpty();
      assertThat(analytics.getAllAnalyticsTechniques()).noneMatch(entry -> entry.getId().equals(retired));
    }
  }

  @Test public void groupedDecimalPreviewAndStoredIndicatorExecuteTheSameRealPlugin() throws Exception {
    String method = id("GroupedNumericSummary");
    OpenLAPDataSet raw = dataset(Map.of(
        "score", Arrays.asList("10.5", null, 30.5, 20.5),
        "learner", List.of("A", "A", "B", "B")));
    OpenLAPPortConfig mapping = mapping(method, Map.of("values", "score", "group", "learner"));
    when(statements.findStatements(any())).thenReturn(raw);
    IndicatorAnalysisRequest request = new IndicatorAnalysisRequest();
    request.setAnalyticsTechniqueId(method);
    request.setAnalyticsTechniqueMapping(mapping);
    request.setAnalyticsTechniqueParams(List.of());
    OpenLAPDataSet preview = basic.analyzeIndicator(request);
    assertThat(values(preview, "group")).containsExactly("A", "B");
    assertThat(values(preview, "mean")).containsExactly(10.5, 25.5);
    assertThat(values(preview, "sum")).containsExactly(10.5, 51.0);
    assertThat(values(preview, "count")).containsExactly(1, 2);
    assertThat(values(preview, "excluded_count")).containsExactly(1, 0);
    assertThat(values(preview, "standard_deviation").get(0)).isNull();
    Gson gson = new Gson();
    Indicator stored = new Indicator();
    stored.setId("saved"); stored.setIndicatorType(IndicatorType.BASIC);
    stored.setCreatedOn(LocalDateTime.now()); stored.setIndicatorQuery("{}");
    stored.setAnalyticsTechniqueReference(new AnalyticsTechniqueReference("[]", gson.toJson(mapping),
        installed.stream().filter(entry -> entry.getId().equals(method)).findFirst().orElseThrow()));
    when(indicators.findById("saved")).thenReturn(Optional.of(stored));
    assertThat(gson.toJson(basic.analyzeIndicatorByIndicatorId("saved"))).isEqualTo(gson.toJson(preview));
    OpenLAPDataSet cached = gson.fromJson(gson.toJson(preview), OpenLAPDataSet.class);
    assertThat(values(cached, "mean")).containsExactly(10.5, 25.5);
    assertThat(values(cached, "standard_deviation").get(0)).isNull();
  }

  @Test public void previouslyInstalledCorrelationsStayExecutableAndOutOfTheEditor() throws Exception {
    String legacyPath = System.getProperty("openlap.analytics.legacy.jar");
    assumeTrue("Supply a local 1.1.0 JAR to exercise the retired implementations", legacyPath != null);
    Path legacy = Path.of(legacyPath);
    Files.copy(legacy, pluginFolder.resolve(legacy.getFileName()));
    analytics.populateAnalyticsTechniques();
    assertThat(installed).hasSize(10);
    assertThat(analytics.getAllAnalyticsTechniques()).hasSize(8);

    String method = id("PearsonCorrelation");
    assertThat(analytics.getAnalyticsTechniquesById(method).getRecommendedFor()).isEmpty();
    installed.stream().filter(entry -> entry.getId().equals(method)).findFirst().orElseThrow()
        .setName("Renamed correlation");
    assertThat(analytics.getAllAnalyticsTechniques()).noneMatch(entry -> entry.getId().equals(method));
    OpenLAPPortConfig mapping = mapping(method, Map.of("x", "first", "y", "second"));
    OpenLAPDataSet result = analyze(method, mapping, dataset(Map.of(
        "first", Arrays.asList("1", null, "2", "3", "4"),
        "second", Arrays.asList("2", "10", "4", null, "8"))), List.of());
    assertThat(((Number) values(result, "correlation").get(0)).doubleValue()).isEqualTo(1.0);
    assertThat(values(result, "count")).containsExactly(3);
    assertThat(values(result, "excluded_count")).containsExactly(2);
    assertThatThrownBy(() -> analyze(method, mapping, dataset(Map.of(
        "first", List.of(1, 1, 1), "second", List.of(1, 2, 3))), List.of()))
        .isInstanceOf(ValidationException.class);

    String spearman = id("SpearmanCorrelation");
    OpenLAPDataSet ranked = analyze(spearman, mapping(spearman, Map.of("x", "first", "y", "second")),
        dataset(Map.of("first", List.of(1, 2, 3), "second", List.of(10, 20, 50))), List.of());
    assertThat(((Number) values(ranked, "correlation").get(0)).doubleValue()).isEqualTo(1.0);
  }

  @Test public void clusteringKeepsDecimalPointsLabelsAndAssignmentsTogether() {
    String method = id("ReproducibleKMeans");
    OpenLAPPortConfig mapping = mapping(method,
        Map.of("x", "first", "y", "second", "observation", "learner"));
    List<OpenLAPDynamicParam> parameters = analytics.getAnalyticsTechniqueParams(method);
    parameters.stream().filter(param -> param.getId().equals("clusters")).findFirst().orElseThrow().setValue(2);
    OpenLAPDataSet raw = dataset(Map.of("first", List.of(0.5, 100.2, 1.5, 101.2),
        "second", List.of(1.0, 200.0, 2.0, 201.0), "learner", List.of("A", "B", "C", "D")));
    OpenLAPDataSet result = analyze(method, mapping, raw, parameters);
    assertThat(values(result, "observation")).containsExactly("A", "B", "C", "D");
    assertThat(values(result, "x")).containsExactly(0.5, 100.2, 1.5, 101.2);
    assertThat(values(result, "cluster").get(0)).isEqualTo(values(result, "cluster").get(2));
    assertThat(values(result, "cluster").get(1)).isEqualTo(values(result, "cluster").get(3));
    assertThat(values(result, "cluster").get(0)).isNotEqualTo(values(result, "cluster").get(1));
    assertThat(new Gson().toJson(analyze(method, mapping, raw, parameters))).isEqualTo(new Gson().toJson(result));
  }

  private OpenLAPDataSet analyze(String method, OpenLAPPortConfig mapping,
      OpenLAPDataSet data, List<OpenLAPDynamicParam> params) {
    return utility.getAnalyzedDataSetMethod(new IndicatorAnalysisTechnique(method, mapping, params), data);
  }

  private String id(String className) {
    return installed.stream().filter(entry -> entry.getImplementingClass().endsWith("." + className))
        .findFirst().orElseThrow().getId();
  }

  private OpenLAPPortConfig mapping(String method, Map<String, String> selection) {
    AnalyticsMethod contract = analytics.loadAnalyticsMethodInstance(method);
    ArrayList<OpenLAPPortMapping> result = new ArrayList<>();
    selection.forEach((input, source) -> result.add(new OpenLAPPortMapping(
        new OpenLAPColumnConfigData(source, OpenLAPColumnDataType.Text, true, source, ""),
        contract.getInput().getColumns().get(input).getConfigurationData())));
    return new OpenLAPPortConfig(result);
  }

  private static OpenLAPDataSet dataset(Map<String, ? extends List<?>> columns) {
    OpenLAPDataSet result = new OpenLAPDataSet();
    columns.forEach((id, data) -> {
      OpenLAPDataColumn column = new OpenLAPDataColumn(id, OpenLAPColumnDataType.Text, true, id, "");
      column.setData(new ArrayList<>(data)); result.getColumns().put(id, column);
    });
    return result;
  }

  private static List<Object> values(OpenLAPDataSet dataset, String column) {
    return new ArrayList<>(dataset.getColumns().get(column).getData());
  }
}
