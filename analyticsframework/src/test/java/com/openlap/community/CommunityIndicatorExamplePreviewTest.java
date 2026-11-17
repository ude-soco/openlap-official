package com.openlap.community;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.google.gson.Gson;
import com.openlap.analytics_module.entities.Indicator;
import com.openlap.analytics_module.entities.utility_entities.IndicatorType;
import com.openlap.analytics_module.entities.utility_entities.VisualizationTechniqueReference;
import com.openlap.analytics_module.services.IndicatorUtilityService;
import com.openlap.dataset.*;
import com.openlap.visualization_methods.entities.VisLibrary;
import com.openlap.visualization_methods.entities.VisType;
import com.openlap.visualization_methods.services.VisualizationMethodUtilityService;
import com.openlap.visualization_methods.services.VisualizationTypeService;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;

class CommunityIndicatorExamplePreviewTest {
  final CommunityCatalogService catalog = mock(CommunityCatalogService.class);
  final VisualizationMethodUtilityService charts = mock(VisualizationMethodUtilityService.class);
  final VisualizationTypeService types = mock(VisualizationTypeService.class);
  final IndicatorUtilityService utility = mock(IndicatorUtilityService.class);
  final CommunityIndicatorExamplePreview service = new CommunityIndicatorExamplePreview(catalog, charts, types, utility);
  final Gson gson = new Gson();
  final Indicator source = spy(new Indicator());
  final VisLibrary library = new VisLibrary();
  final VisType chart = new VisType();
  final String secret = "private-creator@example.test";
  final OpenLAPColumnConfigData category = column("category", OpenLAPColumnDataType.Text, true);
  final OpenLAPColumnConfigData value = column("value", OpenLAPColumnDataType.Numeric, true);

  @BeforeEach void setup() {
    library.setId("library"); chart.setId("chart"); chart.setVisualizationLib(library);
    source.setIndicatorType(IndicatorType.BASIC);
    source.setVisualizationTechniqueReference(new VisualizationTechniqueReference("{}",
        mapping(port(secret + "-category", category), port(secret + "-value", value)), library, chart));
    when(catalog.resolveIndicator("pool")).thenReturn(source);
    when(charts.fetchVisualizationLibraryMethod("library")).thenReturn(library);
    when(charts.fetchVisualizationTypeMethod("chart")).thenReturn(chart);
    when(types.getVisTypeInputs("chart")).thenReturn(List.of(category, value));
    when(charts.validateAnalyticsTechniqueToVisualizationMapping(eq("chart"), any()))
        .thenReturn(new OpenLAPDataSetConfigValidationResult(true, "Valid"));
    when(utility.getIndicatorCodeMethod(any(), eq("library"), eq("chart"), any(), any(), eq(true)))
        .thenAnswer(call -> gson.toJson(List.of(call.getArgument(0), call.getArgument(3), call.getArgument(4))));
    // Example generation must not inspect an owner, query, analytics method, children or stored chart result.
    doThrow(new AssertionError("Creator query read")).when(source).getIndicatorQuery();
    doThrow(new AssertionError("Creator connections read")).when(source).getCreatedBy();
    doThrow(new AssertionError("Analytics method read")).when(source).getAnalyticsTechniqueReference();
    doThrow(new AssertionError("Complex sources resolved")).when(source).getIndicators();
    doThrow(new AssertionError("Saved configuration read")).when(source).getConfigurationRequest();
  }

  @ParameterizedTest
  @EnumSource(IndicatorType.class)
  void everyIndicatorKindRendersItsFinalChartWithoutCreatorDataOrLearnerConnections(IndicatorType type) {
    source.setIndicatorType(type);
    source.getVisualizationTechniqueReference().setAdditionalParams("{\"title\":\"" + secret
        + "\",\"colors\":[\"#123456\",\"#abcdef\"],\"legendPosition\":\"bottom\",\"width\":9000,\"height\":9000}");
    var result = service.preview("pool");
    assertThat(result.status()).isEqualTo("READY");
    assertThat(result.visualizationTypeId()).isEqualTo("chart");
    assertThat(result.message()).contains("sample values");
    assertThat(result.previewCode()).contains("exampleColumn1", "Category1", "Value2", "Example 1", "#123456", "bottom")
        .doesNotContain(secret, "private creator", "receiptId");
    var data = ArgumentCaptor.forClass(OpenLAPDataSet.class);
    var mapping = ArgumentCaptor.forClass(OpenLAPPortConfig.class);
    var params = ArgumentCaptor.forClass(Object.class);
    verify(utility).getIndicatorCodeMethod(data.capture(), eq("library"), eq("chart"), mapping.capture(), params.capture(), eq(true));
    assertThat(data.getValue().getColumns()).hasSize(2);
    assertThat(data.getValue().getColumns().get("exampleColumn1").getData()).hasSize(6).allMatch(String.class::isInstance);
    assertThat(data.getValue().getColumns().get("exampleColumn2").getData()).hasSize(6).allMatch(Number.class::isInstance);
    assertThat(mapping.getValue().getMapping()).extracting(port -> port.getInputPort().getId()).containsExactly("category", "value");
    assertThat(((Map<?, ?>) params.getValue()).get("width")).isEqualTo(800.0);
    assertThat(((Map<?, ?>) params.getValue()).get("height")).isEqualTo(450.0);
  }

  @Test void sharedNumericColumnsKeepTheirRelationshipWithIdentifierSafeAliases() {
    var first = column("x", OpenLAPColumnDataType.Numeric, true);
    var second = column("y", OpenLAPColumnDataType.Numeric, true);
    when(types.getVisTypeInputs("chart")).thenReturn(List.of(first, second));
    source.getVisualizationTechniqueReference().setAnalyticsTechniqueToVisualizationMapping(mapping(port(secret, first), port(secret, second)));
    assertThat(service.preview("pool").status()).isEqualTo("READY");
    var data = ArgumentCaptor.forClass(OpenLAPDataSet.class);
    var mapping = ArgumentCaptor.forClass(OpenLAPPortConfig.class);
    verify(utility).getIndicatorCodeMethod(data.capture(), anyString(), anyString(), mapping.capture(), any(), anyBoolean());
    assertThat(data.getValue().getColumns()).containsOnlyKeys("exampleColumn1");
    assertThat(mapping.getValue().getMapping()).extracting(port -> port.getOutputPort().getId())
        .containsExactly("exampleColumn1", "exampleColumn1");
  }

  @Test void groupedChartsReceiveRepresentativeCategoriesAndTwoSyntheticSeries() {
    var series = column("series", OpenLAPColumnDataType.Text, false);
    chart.setVisualizationDescriptor(Map.of("inputRoles", Map.of("category", "category", "series", "series")));
    when(types.getVisTypeInputs("chart")).thenReturn(List.of(category, value, series));
    source.getVisualizationTechniqueReference().setAnalyticsTechniqueToVisualizationMapping(mapping(
        port("a", category), port("b", value), port("c", series)));
    assertThat(service.preview("pool").status()).isEqualTo("READY");
    var data = ArgumentCaptor.forClass(OpenLAPDataSet.class);
    verify(utility).getIndicatorCodeMethod(data.capture(), anyString(), anyString(), any(), any(), anyBoolean());
    assertThat(data.getValue().getColumns().get("exampleColumn1").getData()).containsExactly("Example 1", "Example 1", "Example 2", "Example 2", "Example 3", "Example 3");
    assertThat(data.getValue().getColumns().get("exampleColumn3").getData()).containsExactly("Series A", "Series B", "Series A", "Series B", "Series A", "Series B");
  }

  @Test void optionalUnmappedPortsDoNotAddUnwantedSeries() {
    when(types.getVisTypeInputs("chart")).thenReturn(List.of(category, value, column("group", OpenLAPColumnDataType.Text, false)));
    assertThat(service.preview("pool").status()).isEqualTo("READY");
    var data = ArgumentCaptor.forClass(OpenLAPDataSet.class);
    verify(utility).getIndicatorCodeMethod(data.capture(), anyString(), anyString(), any(), any(), anyBoolean());
    assertThat(data.getValue().getColumns()).hasSize(2);
  }

  @ParameterizedTest
  @ValueSource(strings = {"invalid-json", "null", "{}", "{\"mapping\":[]}", "{\"mapping\":[null]}"})
  void malformedMappingsFailWithSafeFeedback(String mapping) {
    source.getVisualizationTechniqueReference().setAnalyticsTechniqueToVisualizationMapping(mapping);
    assertUnavailable();
  }

  @Test void missingRequiredInputsFailInsteadOfInventingAnotherChartMapping() {
    source.getVisualizationTechniqueReference().setAnalyticsTechniqueToVisualizationMapping(mapping(port("a", category)));
    assertUnavailable();
  }

  @Test void duplicateOrChangedInputContractsFailSafely() {
    source.getVisualizationTechniqueReference().setAnalyticsTechniqueToVisualizationMapping(mapping(port("a", category), port("b", category), port("c", value)));
    assertUnavailable();
    source.getVisualizationTechniqueReference().setAnalyticsTechniqueToVisualizationMapping(mapping(
        port("a", column("category", OpenLAPColumnDataType.Numeric, true)), port("b", value)));
    assertUnavailable();
  }

  @Test void disabledOrMismatchedRenderersAreNeverInvoked() {
    chart.setEnabled(false);
    assertThat(service.preview("pool").status()).isEqualTo("PLUGIN_UNAVAILABLE");
    chart.setEnabled(true); library.setEnabled(false);
    assertThat(service.preview("pool").status()).isEqualTo("PLUGIN_UNAVAILABLE");
    library.setEnabled(true); var other = new VisLibrary(); other.setId("other"); chart.setVisualizationLib(other);
    assertThat(service.preview("pool").status()).isEqualTo("PLUGIN_UNAVAILABLE");
    verifyNoInteractions(types, utility);
  }

  @Test void unavailablePluginAndRendererErrorsNeverExposeExceptionDetails() {
    when(charts.fetchVisualizationTypeMethod("chart")).thenThrow(new IllegalStateException(secret + " /private/plugin.jar"));
    var plugin = service.preview("pool");
    assertThat(plugin.status()).isEqualTo("PLUGIN_UNAVAILABLE"); assertThat(gson.toJson(plugin)).doesNotContain(secret, "/private");
    doReturn(chart).when(charts).fetchVisualizationTypeMethod("chart");
    doThrow(new IllegalStateException(secret + " /private/plugin.jar")).when(utility)
        .getIndicatorCodeMethod(any(), anyString(), anyString(), any(), any(), anyBoolean());
    var result = service.preview("pool");
    assertThat(result.status()).isEqualTo("EXAMPLE_UNAVAILABLE"); assertThat(gson.toJson(result)).doesNotContain(secret, "/private");
  }

  @Test void invalidCurrentSchemaAndMappingValidationCannotReachTheRenderer() {
    when(types.getVisTypeInputs("chart")).thenReturn(List.of(category, category));
    assertUnavailable();
    when(types.getVisTypeInputs("chart")).thenReturn(List.of(category, value));
    when(charts.validateAnalyticsTechniqueToVisualizationMapping(eq("chart"), any()))
        .thenReturn(new OpenLAPDataSetConfigValidationResult(false, secret));
    assertUnavailable();
  }

  @Test void emptyRendererOutputIsNotReportedAsAReadyExample() {
    doReturn(" ").when(utility).getIndicatorCodeMethod(any(), anyString(), anyString(), any(), any(), anyBoolean());
    var result = service.preview("pool");
    assertThat(result.status()).isEqualTo("EXAMPLE_UNAVAILABLE");
    assertThat(result.previewCode()).isNull();
  }

  @Test void dimensionsRespectDeclaredMinimumAndStepWhileFittingThePreview() {
    chart.setVisualizationDescriptor(Map.of("customizations", List.of(
        Map.of("id", "width", "label", "Width", "type", "number", "min", 250, "max", 10000, "step", 200, "defaultValue", 9250),
        Map.of("id", "height", "label", "Height", "type", "number", "min", 300, "max", 10000, "step", 100, "defaultValue", 9300))));
    assertThat(service.preview("pool").status()).isEqualTo("READY");
    var params = ArgumentCaptor.forClass(Object.class);
    verify(utility).getIndicatorCodeMethod(any(), anyString(), anyString(), any(), params.capture(), anyBoolean());
    assertThat(((Map<?, ?>) params.getValue()).get("width")).isEqualTo(650.0);
    assertThat(((Map<?, ?>) params.getValue()).get("height")).isEqualTo(400.0);
  }

  @Test void impossibleDimensionContractFailsWithoutViolatingPluginRequirements() {
    chart.setVisualizationDescriptor(Map.of("customizations", List.of(
        Map.of("id", "height", "label", "Height", "type", "number", "min", 500, "defaultValue", 1000))));
    assertUnavailable();
  }

  @Test void declaredResponsiveWidthDefaultRemainsSupported() {
    chart.setVisualizationDescriptor(Map.of("customizations", List.of(
        Map.of("id", "width", "label", "Width", "type", "select", "options", List.of(Map.of("value", "100%")), "defaultValue", "100%"))));
    assertThat(service.preview("pool").status()).isEqualTo("READY");
    var params = ArgumentCaptor.forClass(Object.class);
    verify(utility).getIndicatorCodeMethod(any(), anyString(), anyString(), any(), params.capture(), anyBoolean());
    assertThat(((Map<?, ?>) params.getValue()).get("width")).isEqualTo("100%");
    assertThat(((Map<?, ?>) params.getValue()).get("height")).isEqualTo(450.0);
  }

  @Test void declaredStyleChoicesArePreservedWithoutCopyingSourceFreeformText() {
    chart.setVisualizationDescriptor(Map.of("customizations", List.of(
        Map.of("id", "showLabels", "label", "Labels", "type", "boolean", "defaultValue", true),
        Map.of("id", "seriesStyle", "label", "Palette", "type", "select", "options", List.of(Map.of("value", "ocean"), Map.of("value", "forest")), "defaultValue", "forest"),
        Map.of("id", "seriesWidth", "label", "Width", "type", "number", "min", 1, "max", 5, "defaultValue", 1),
        Map.of("id", "seriesColor", "label", "Color", "type", "color", "defaultValue", "#000000"),
        Map.of("id", "caption", "label", "Caption", "type", "text", "defaultValue", "Example"))));
    source.getVisualizationTechniqueReference().setAdditionalParams("{\"showLabels\":false,\"seriesStyle\":\"ocean\",\"seriesWidth\":3,\"seriesColor\":\"#123456\",\"caption\":\"" + secret + "\"}");
    var result = service.preview("pool");
    assertThat(result.status()).isEqualTo("READY");
    var params = ArgumentCaptor.forClass(Object.class);
    verify(utility).getIndicatorCodeMethod(any(), anyString(), anyString(), any(), params.capture(), anyBoolean());
    var supplied = (Map<?, ?>) params.getValue();
    assertThat(supplied.get("showLabels")).isEqualTo(false);
    assertThat(supplied.get("seriesStyle")).isEqualTo("ocean");
    assertThat(((Number) supplied.get("seriesWidth")).intValue()).isEqualTo(3);
    assertThat(supplied.get("seriesColor")).isEqualTo("#123456");
    assertThat(supplied.get("caption")).isEqualTo("Example");
    assertThat(gson.toJson(supplied)).doesNotContain(secret);
  }

  @Test void exampleControllerReturnsNoStoreAndNeverCallsThePersonalPreviewOrCopyService() {
    var personal = mock(CommunityIndicatorService.class);
    var controller = new CommunityIndicatorController(personal, service);
    var response = controller.examplePreview("pool");
    assertThat(response.getStatusCode().value()).isEqualTo(200);
    assertThat(response.getHeaders().getCacheControl()).isEqualTo("no-store, private");
    assertThat(response.getHeaders().getFirst("Pragma")).isEqualTo("no-cache");
    var body = (com.openlap.response.ApiSuccess) response.getBody();
    assertThat(body.getData()).isInstanceOf(CommunityIndicatorExamplePreview.Preview.class);
    assertThat(gson.toJson(body.getData())).doesNotContain("receiptId", "bindings", "connections");
    verifyNoInteractions(personal);
  }

  void assertUnavailable() {
    var result = service.preview("pool");
    assertThat(result.status()).isEqualTo("EXAMPLE_UNAVAILABLE");
    assertThat(result.previewCode()).isNull();
    verifyNoInteractions(utility);
  }

  static OpenLAPColumnConfigData column(String id, OpenLAPColumnDataType type, boolean required) {
    return new OpenLAPColumnConfigData(id, type, required, "private-creator@example.test", "private-creator@example.test");
  }
  OpenLAPPortMapping port(String outputId, OpenLAPColumnConfigData input) {
    return new OpenLAPPortMapping(column(outputId, input.getType(), true), input);
  }
  String mapping(OpenLAPPortMapping... ports) { return gson.toJson(new OpenLAPPortConfig(new ArrayList<>(List.of(ports)))); }
}
