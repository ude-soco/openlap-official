package com.openlap.analytics_module.services.impl;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.google.gson.Gson;
import com.openlap.analytics_module.dto.requests.indicator.IndicatorAnalysisRequest;
import com.openlap.analytics_module.entities.Indicator;
import com.openlap.analytics_module.entities.utility_entities.AnalyticsTechniqueReference;
import com.openlap.analytics_module.entities.utility_entities.IndicatorAnalysisTechnique;
import com.openlap.analytics_module.repositories.IndicatorCacheRepository;
import com.openlap.analytics_module.repositories.IndicatorRepository;
import com.openlap.analytics_statements.services.StatementService;
import com.openlap.analytics_technique.entities.AnalyticsTechnique;
import com.openlap.analytics_technique.services.AnalyticsTechniqueService;
import com.openlap.dataset.*;
import com.openlap.exceptions.AnalyticsMethodInitializationException;
import com.openlap.infrastructure.exception.ValidationException;
import com.openlap.template.AnalyticsMethod;
import java.time.LocalDateTime;
import java.util.*;
import org.junit.Test;
import org.springframework.http.HttpStatus;

public class AnalyticsExecutionValidationTest {
  private final AnalyticsTechniqueService analytics = mock(AnalyticsTechniqueService.class);
  private final StatementService statements = mock(StatementService.class);
  private final IndicatorRepository indicators = mock(IndicatorRepository.class);
  private final IndicatorCacheRepository caches = mock(IndicatorCacheRepository.class);
  private final AnalyticsMethod plugin = mock(AnalyticsMethod.class);
  private final IndicatorUtilityServiceImpl utility =
      new IndicatorUtilityServiceImpl(null, null, null, analytics, indicators, null);
  private final IndicatorBasicServiceImpl basic =
      new IndicatorBasicServiceImpl(analytics, statements, utility, null, caches);
  private final OpenLAPDataSet data = new OpenLAPDataSet();
  private final OpenLAPDataSet contract = new OpenLAPDataSet();
  private final OpenLAPPortConfig mapping;

  public AnalyticsExecutionValidationTest() {
    var source = new OpenLAPDataColumn<Object>("score", OpenLAPColumnDataType.Text, true, "Score", "");
    source.setData(new ArrayList<>(List.of("2.5", "3.25")));
    data.getColumns().put("score", source);
    var destination = new OpenLAPDataColumn<Object>("values", OpenLAPColumnDataType.Numeric, true, "Values", "");
    contract.getColumns().put("values", destination);
    mapping = new OpenLAPPortConfig(new ArrayList<>(List.of(
        new OpenLAPPortMapping(source.getConfigurationData(), destination.getConfigurationData()))));
    AnalyticsTechnique technique = new AnalyticsTechnique();
    technique.setId("method");
    when(analytics.fetchAnalyticsTechniqueMethod("method")).thenReturn(technique);
    when(analytics.loadAnalyticsMethodInstance("method")).thenReturn(plugin);
    when(analytics.validateAnalyticsTechniqueMapping(eq("method"), any()))
        .thenReturn(new OpenLAPDataSetConfigValidationResult(true, "Valid"));
    when(plugin.getInput()).thenReturn(contract);
    when(statements.findStatements(any())).thenReturn(data);
    var saved = new Indicator();
    saved.setId("saved");
    saved.setCreatedOn(LocalDateTime.now());
    saved.setIndicatorQuery("{}");
    saved.setAnalyticsTechniqueReference(new AnalyticsTechniqueReference("[]", new Gson().toJson(mapping), technique));
    when(indicators.findById("saved")).thenReturn(Optional.of(saved));
    when(caches.findById("saved")).thenReturn(Optional.empty());
  }

  @Test public void privatePluginExecutionFailuresReturnSafe400ForPreviewAndSavedIndicators() {
    for (RuntimeException failure : List.of(new IllegalArgumentException("private-learner-value"),
        new NumberFormatException("private-learner-value"))) {
      doThrow(failure).when(plugin).execute();
      assertSafeFailure(() -> utility.getAnalyzedDataSetMethod(analysis(), data));
      assertSafeFailure(() -> basic.analyzeIndicator(request()));
      assertSafeFailure(() -> basic.analyzeIndicatorByIndicatorId("saved"));
    }
  }

  @Test public void privateInitializationFailuresReturnSafe400ForPreviewAndSavedIndicators() throws Throwable {
    doThrow(new AnalyticsMethodInitializationException("private-learner-value"))
        .when(plugin).initialize(any(), any(), anyMap());
    assertSafeFailure(() -> utility.getAnalyzedDataSetMethod(analysis(), data));
    assertSafeFailure(() -> basic.analyzeIndicator(request()));
    assertSafeFailure(() -> basic.analyzeIndicatorByIndicatorId("saved"));
  }

  @Test public void aPluginParameterParseFailureDuringInitializationDoesNotBecome500() throws Throwable {
    doThrow(new NumberFormatException("private-learner-value"))
        .when(plugin).initialize(any(), any(), anyMap());
    assertSafeFailure(() -> basic.analyzeIndicator(request()));
    assertSafeFailure(() -> basic.analyzeIndicatorByIndicatorId("saved"));
  }

  @Test public void knownSafeValidationFailuresKeepTheirActionableMessageAndCode() {
    ValidationException failure = new ValidationException("KNOWN_INPUT", "Choose a different input field.");
    when(plugin.execute()).thenThrow(failure);
    assertThat(catchThrowable(() -> basic.analyzeIndicator(request()))).isSameAs(failure);
    assertThat(catchThrowable(() -> basic.analyzeIndicatorByIndicatorId("saved"))).isSameAs(failure);
  }

  private IndicatorAnalysisTechnique analysis() {
    return new IndicatorAnalysisTechnique("method", mapping, List.of());
  }

  private IndicatorAnalysisRequest request() {
    return new IndicatorAnalysisRequest(null, "method", mapping, List.of());
  }

  private static void assertSafeFailure(org.assertj.core.api.ThrowableAssert.ThrowingCallable run) {
    Throwable failure = catchThrowable(run);
    assertThat(failure).isInstanceOf(ValidationException.class)
        .hasMessageContaining("Check parameter ranges")
        .hasMessageNotContaining("private-learner-value");
    assertThat(((ValidationException) failure).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
    assertThat(((ValidationException) failure).getCode()).isEqualTo("ANALYTICS_DATA_INVALID");
  }
}
