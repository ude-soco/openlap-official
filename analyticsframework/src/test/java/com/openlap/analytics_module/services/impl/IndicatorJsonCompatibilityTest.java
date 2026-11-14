package com.openlap.analytics_module.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.same;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.google.gson.JsonParseException;
import com.openlap.analytics_module.entities.Indicator;
import com.openlap.analytics_module.entities.IndicatorCache;
import com.openlap.analytics_module.entities.utility_entities.AnalyticsTechniqueReference;
import com.openlap.analytics_module.entities.utility_entities.IndicatorType;
import com.openlap.analytics_module.entities.utility_entities.VisualizationTechniqueReference;
import com.openlap.analytics_module.repositories.IndicatorCacheRepository;
import com.openlap.analytics_module.repositories.IndicatorRepository;
import com.openlap.analytics_module.services.IndicatorBasicService;
import com.openlap.analytics_statements.services.StatementService;
import com.openlap.analytics_technique.entities.AnalyticsTechnique;
import com.openlap.analytics_technique.services.AnalyticsTechniqueService;
import com.openlap.dataset.OpenLAPColumnDataType;
import com.openlap.dataset.OpenLAPDataSet;
import com.openlap.dataset.OpenLAPDataSetConfigValidationResult;
import com.openlap.dataset.OpenLAPPortConfig;
import com.openlap.exceptions.AnalyticsMethodInitializationException;
import com.openlap.template.AnalyticsMethod;
import com.openlap.template.VisualizationCodeGenerator;
import com.openlap.visualization_methods.entities.VisLibrary;
import com.openlap.visualization_methods.entities.VisType;
import com.openlap.visualization_methods.services.VisualizationMethodUtilityService;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.Test;
import org.mockito.ArgumentCaptor;

/** Exercises stored Gson JSON through the services that pass it to the published plugin APIs. */
public class IndicatorJsonCompatibilityTest {
  private static final String DATASET = """
      {"columns":{"items":{"configurationData":{"id":"items","type":"Text","required":true},
      "data":["Alpha","Grüße"]},"count":{"configurationData":{"id":"count","type":"Numeric"},
      "data":[10,2.5]}}}
      """;
  private static final String MAPPING = """
      {"mapping":[{"outputPort":{"id":"items","type":"Text"},
      "inputPort":{"id":"labels","type":"Text","required":true}}]}
      """;

  private final IndicatorRepository indicators = mock(IndicatorRepository.class);
  private final IndicatorCacheRepository caches = mock(IndicatorCacheRepository.class);
  private final AnalyticsTechniqueService analytics = mock(AnalyticsTechniqueService.class);
  private final StatementService statements = mock(StatementService.class);
  private final VisualizationMethodUtilityService visualizations =
      mock(VisualizationMethodUtilityService.class);
  private final IndicatorUtilityServiceImpl utility =
      new IndicatorUtilityServiceImpl(null, null, visualizations, analytics, indicators);
  private final IndicatorBasicServiceImpl basic =
      new IndicatorBasicServiceImpl(analytics, statements, utility, null, caches);

  @Test
  public void savedDatasetCacheRestoresPublishedColumnTypesAndValuesWithoutReanalysis() {
    cache(DATASET);

    OpenLAPDataSet restored = basic.analyzeIndicatorByIndicatorId("indicator");

    assertThat(restored.getColumnsConfigurationData()).hasSize(2);
    assertThat(restored.getColumns().get("items").getConfigurationData().getType())
        .isEqualTo(OpenLAPColumnDataType.Text);
    assertThat(restored.getColumns().get("items").getConfigurationData().isRequired()).isTrue();
    assertThat(restored.getColumns().get("items").getData()).containsExactly("Alpha", "Grüße");
    // Raw plugin column values have historically used Gson's Double representation.
    assertThat(restored.getColumns().get("count").getData()).containsExactly(10.0, 2.5);
    verifyNoInteractions(analytics, statements);
  }

  @Test
  public void malformedStoredDatasetDoesNotBecomeAPartialDatasetOrReachAnAnalyticsPlugin() {
    cache("{\"columns\":{\"items\":");

    assertThatThrownBy(() -> basic.analyzeIndicatorByIndicatorId("indicator"))
        .isInstanceOf(JsonParseException.class);

    verifyNoInteractions(analytics, statements);
  }

  @Test
  public void storedMappingsAndDynamicParametersKeepTheAnalyticsPluginContract()
      throws AnalyticsMethodInitializationException {
    Indicator indicator = indicator();
    AnalyticsTechnique technique = new AnalyticsTechnique();
    technique.setId("technique");
    indicator.setIndicatorQuery("{}");
    indicator.setAnalyticsTechniqueReference(new AnalyticsTechniqueReference("""
        [{"id":"limit","value":10},{"id":"enabled","value":false},
        {"id":"title","value":"Grüße"}]
        """, MAPPING, technique));
    when(caches.findById("indicator")).thenReturn(Optional.empty());
    OpenLAPDataSet input = new OpenLAPDataSet();
    OpenLAPDataSet output = new OpenLAPDataSet();
    when(statements.findStatements(any())).thenReturn(input);
    AnalyticsMethod plugin = mock(AnalyticsMethod.class);
    when(analytics.loadAnalyticsMethodInstance("technique")).thenReturn(plugin);
    when(plugin.execute()).thenReturn(output);

    assertThat(basic.analyzeIndicatorByIndicatorId("indicator")).isSameAs(output);

    ArgumentCaptor<OpenLAPPortConfig> mapping = ArgumentCaptor.forClass(OpenLAPPortConfig.class);
    verify(plugin).initialize(same(input), mapping.capture(),
        eq(Map.of("limit", "10", "enabled", "false", "title", "Grüße")));
    assertMapping(mapping.getValue());
  }

  @Test
  @SuppressWarnings("unchecked")
  public void storedVisualizationOptionsReachThePublishedMapApiWithNestedValuesIntact()
      throws Exception {
    Indicator indicator = indicator();
    VisLibrary library = new VisLibrary();
    library.setId("library");
    VisType type = new VisType();
    type.setId("chart");
    indicator.setVisualizationTechniqueReference(new VisualizationTechniqueReference("""
        {"title":"Grüße","legend":true,"axes":{"labels":["A","B"],"limit":10},
        "optional":null}
        """, MAPPING, library, type));
    when(caches.findById("indicator")).thenReturn(Optional.empty());
    when(visualizations.fetchVisualizationLibraryMethod("library")).thenReturn(library);
    when(visualizations.fetchVisualizationTypeMethod("chart")).thenReturn(type);
    when(visualizations.validateAnalyticsTechniqueToVisualizationMapping(eq("chart"), any()))
        .thenReturn(new OpenLAPDataSetConfigValidationResult(true, "Valid"));
    VisualizationCodeGenerator plugin = mock(VisualizationCodeGenerator.class);
    when(visualizations.loadVisTypeInstance("chart")).thenReturn(plugin);
    when(plugin.generateVisualizationCode(any(), any(), any())).thenReturn("<div>Chart</div>");
    OpenLAPDataSet data = new OpenLAPDataSet();
    IndicatorBasicService analysis = mock(IndicatorBasicService.class);
    when(analysis.analyzeIndicatorByIndicatorId("indicator")).thenReturn(data);
    IndicatorServiceImpl service = new IndicatorServiceImpl(
        indicators, null, caches, null, null, null, analysis, utility, null, null, null, null);

    assertThat(service.generateIndicatorCode("indicator", false)).isEqualTo("<div>Chart</div>");

    ArgumentCaptor<Map<String, Object>> options = ArgumentCaptor.forClass(Map.class);
    ArgumentCaptor<OpenLAPPortConfig> mapping = ArgumentCaptor.forClass(OpenLAPPortConfig.class);
    verify(plugin).generateVisualizationCode(same(data), mapping.capture(), options.capture());
    assertMapping(mapping.getValue());
    assertThat(options.getValue()).containsEntry("title", "Grüße").containsEntry("legend", true)
        .containsEntry("optional", null);
    Map<String, Object> axes = (Map<String, Object>) options.getValue().get("axes");
    assertThat(axes).containsEntry("labels", List.of("A", "B")).containsEntry("limit", 10.0);
    // Assert the public Map contract; Gson's concrete implementation may change between releases.
    ArgumentCaptor<IndicatorCache> written = ArgumentCaptor.forClass(IndicatorCache.class);
    verify(caches).save(written.capture());
    assertThat(written.getValue().getAnalyzedDataset()).isEqualTo("{\"columns\":{}}");
  }

  private void cache(String json) {
    Indicator indicator = indicator();
    when(caches.findById("indicator")).thenReturn(Optional.of(new IndicatorCache(
        "indicator", "<div>Saved chart</div>", json, indicator.getCreatedOn(), LocalDateTime.now())));
  }

  private Indicator indicator() {
    Indicator indicator = new Indicator();
    indicator.setId("indicator");
    indicator.setIndicatorType(IndicatorType.BASIC);
    indicator.setCreatedOn(LocalDateTime.of(2020, 1, 1, 0, 0));
    when(indicators.findById("indicator")).thenReturn(Optional.of(indicator));
    return indicator;
  }

  private void assertMapping(OpenLAPPortConfig mapping) {
    assertThat(mapping.getMapping()).hasSize(1);
    assertThat(mapping.getMapping().get(0).getOutputPort().getId()).isEqualTo("items");
    assertThat(mapping.getMapping().get(0).getInputPort().getId()).isEqualTo("labels");
    assertThat(mapping.getMapping().get(0).getInputPort().getType()).isEqualTo(OpenLAPColumnDataType.Text);
    assertThat(mapping.getMapping().get(0).getInputPort().isRequired()).isTrue();
  }
}
