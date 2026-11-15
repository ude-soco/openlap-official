package com.openlap.analytics_module.services.impl;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.openlap.analytics_module.dto.requests.indicator.IndicatorCompositeRequest;
import com.openlap.analytics_module.dto.requests.indicator.IndicatorsToMergeRequest;
import com.openlap.analytics_module.entities.Indicator;
import com.openlap.analytics_module.entities.utility_entities.AnalyticsTechniqueReference;
import com.openlap.analytics_module.entities.utility_entities.IndicatorReference;
import com.openlap.analytics_module.entities.utility_entities.IndicatorType;
import com.openlap.analytics_module.services.IndicatorBasicService;
import com.openlap.analytics_module.services.IndicatorUtilityService;
import com.openlap.analytics_technique.entities.AnalyticsTechnique;
import com.openlap.dataset.*;
import com.openlap.infrastructure.exception.ValidationException;
import jakarta.servlet.http.HttpServletRequest;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class ComplexIndicatorDataServiceTest {
  private final IndicatorBasicService basic = mock(IndicatorBasicService.class);
  private final IndicatorUtilityService utility = mock(IndicatorUtilityService.class);
  private final ComplexIndicatorDataService service = new ComplexIndicatorDataService(basic, utility, new ComplexIndicatorMerger());

  @Test
  void compositeRequiresTheExactSameMethodBeforeExecutingSources() {
    definitions("method-a", "method-b");
    assertThatThrownBy(() -> service.combine(requests(), key(), false))
        .isInstanceOf(ValidationException.class).hasMessageContaining("same analytics method");
    verifyNoInteractions(basic);
  }

  @Test
  void sameDisplayNamesDoNotMakeDifferentMethodVersionsCompatible() {
    definitions("version-a", "version-b");
    assertThatThrownBy(() -> service.combine(requests(), key(), false)).isInstanceOf(ValidationException.class);
    verifyNoInteractions(basic);
  }

  @Test
  void sameMethodSourcesAreAnalyzedOnceAndKeepTheirSeparateMeasures() throws Exception {
    definitions("method", "method");
    when(basic.analyzeIndicatorByIndicatorId("a")).thenReturn(data(1.25));
    when(basic.analyzeIndicatorByIndicatorId("b")).thenReturn(data(2.75));
    var result = service.combine(requests(), key(), false);
    assertThat(result.getColumns().keySet()).containsExactlyInAnyOrder("key", "source_a__count", "source_b__count");
    verify(basic).analyzeIndicatorByIndicatorId("a");
    verify(basic).analyzeIndicatorByIndicatorId("b");
    verifyNoMoreInteractions(basic);
  }

  @Test
  void multilevelAllowsDifferentMethodsWithCompatibleOutputKeys() throws Exception {
    definitions("method-a", "method-b");
    when(basic.analyzeIndicatorByIndicatorId("a")).thenReturn(data(1.25));
    when(basic.analyzeIndicatorByIndicatorId("b")).thenReturn(data(2.75));
    var result = service.combine(requests(), null, true);
    assertThat(result.getRowCount()).isEqualTo(1);
    assertThat(result.getColumns().get("source_a__count").getData()).containsExactly(1.25);
    assertThat(result.getColumns().get("source_b__count").getData()).containsExactly(2.75);
  }

  @Test
  void nestedComplexSourcesAreRejectedBeforeAnySourceRuns() {
    definitions("method", "method");
    utility.fetchIndicatorMethod("b").setIndicatorType(IndicatorType.MULTI_LEVEL);
    assertThatThrownBy(() -> service.combine(requests(), key(), false))
        .isInstanceOf(ValidationException.class).hasMessageContaining("Nested");
    verifyNoInteractions(basic);
  }

  @Test
  void compositeSavePreservesCanonicalConfigurationAndSourceMappings() throws Exception {
    definitions("method", "method");
    when(basic.analyzeIndicatorByIndicatorId("a")).thenReturn(data(1.25));
    when(basic.analyzeIndicatorByIndicatorId("b")).thenReturn(data(2.75));
    var body = savedRequest();
    var http = mock(HttpServletRequest.class);
    var composite = new IndicatorCompositeServiceImpl(service, utility);

    composite.createCompositeIndicator(http, body);

    var reference = ArgumentCaptor.forClass(IndicatorReference.class);
    verify(utility).createIndicator(same(http), reference.capture());
    assertThat(reference.getValue().getConfigurationRequest()).isEqualTo(body.getConfiguration());
    assertThat(reference.getValue().getIndicators()).isEqualTo(body.getIndicators());
    assertThat(reference.getValue().getIndicators().get(0).getColumnToMerge().getId()).isEqualTo("items");
  }

  @Test
  void saveRejectsWrongRecoveryTypeAndStaleColumnMappingBeforeWriting() throws Exception {
    var composite = new IndicatorCompositeServiceImpl(service, utility);
    var body = savedRequest();
    body.setConfiguration("{\"type\":\"MULTI_LEVEL\"}");
    assertThatThrownBy(() -> composite.createCompositeIndicator(mock(HttpServletRequest.class), body))
        .isInstanceOf(ValidationException.class).hasMessageContaining("configuration");
    verifyNoInteractions(basic, utility);

    definitions("method", "method");
    when(basic.analyzeIndicatorByIndicatorId("a")).thenReturn(data(1.25));
    when(basic.analyzeIndicatorByIndicatorId("b")).thenReturn(data(2.75));
    body.setConfiguration("{\"type\":\"COMPOSITE\"}");
    body.getVisualizationMapping().getMapping().get(0).getOutputPort().setId("missing");
    assertThatThrownBy(() -> composite.createCompositeIndicator(mock(HttpServletRequest.class), body))
        .isInstanceOf(ValidationException.class).hasMessageContaining("missing");
    verify(utility, never()).createIndicator(any(), any());
  }

  private void definitions(String a, String b) {
    when(utility.fetchIndicatorMethod("a")).thenReturn(definition("a", a));
    when(utility.fetchIndicatorMethod("b")).thenReturn(definition("b", b));
  }

  private static Indicator definition(String id, String method) {
    var technique = new AnalyticsTechnique();
    technique.setId(method);
    technique.setName("Count items");
    var indicator = new Indicator();
    indicator.setId(id);
    indicator.setName(id);
    indicator.setIndicatorType(IndicatorType.BASIC);
    indicator.setAnalyticsTechniqueReference(new AnalyticsTechniqueReference("[]", "{}", technique));
    return indicator;
  }

  private static List<IndicatorsToMergeRequest> requests() {
    return List.of(new IndicatorsToMergeRequest("a", key()), new IndicatorsToMergeRequest("b", key()));
  }

  private static OpenLAPColumnConfigData key() {
    return new OpenLAPColumnConfigData("items", OpenLAPColumnDataType.Text, true, "Materials", "");
  }

  private static OpenLAPDataSet data(double value) throws Exception {
    var data = new OpenLAPDataSet();
    var keys = new OpenLAPDataColumn<String>("items", OpenLAPColumnDataType.Text, true, "Materials", "");
    keys.setData(new ArrayList<>(List.of("Material 1")));
    data.addOpenLAPDataColumn(keys);
    var values = new OpenLAPDataColumn<Double>("count", OpenLAPColumnDataType.Numeric, true, "Count", "");
    values.setData(new ArrayList<>(List.of(value)));
    data.addOpenLAPDataColumn(values);
    return data;
  }

  private static IndicatorCompositeRequest savedRequest() {
    var body = new IndicatorCompositeRequest();
    body.setName("Comparison");
    body.setIndicatorType(IndicatorType.COMPOSITE);
    body.setIndicators(requests());
    body.setColumnToMerge(key());
    body.setConfiguration("{\"schemaVersion\":1,\"type\":\"COMPOSITE\"}");
    body.setVisualizationLibraryId("c3");
    body.setVisualizationTypeId("line");
    body.setVisualizationMapping(new OpenLAPPortConfig(new ArrayList<>(List.of(new OpenLAPPortMapping(
        new OpenLAPColumnConfigData("key", OpenLAPColumnDataType.Text, true, "Materials", ""),
        new OpenLAPColumnConfigData("x", OpenLAPColumnDataType.Text, true, "X", ""))))));
    return body;
  }
}
