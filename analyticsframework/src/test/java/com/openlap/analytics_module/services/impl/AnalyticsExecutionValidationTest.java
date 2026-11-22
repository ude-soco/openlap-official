package com.openlap.analytics_module.services.impl;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.google.gson.Gson;
import com.openlap.analytics_module.dto.requests.indicator.IndicatorAnalysisRequest;
import com.openlap.analytics_module.entities.Indicator;
import com.openlap.analytics_module.entities.IndicatorCache;
import com.openlap.analytics_module.entities.utility_entities.AnalyticsTechniqueReference;
import com.openlap.analytics_module.entities.utility_entities.IndicatorAnalysisTechnique;
import com.openlap.analytics_module.entities.utility_entities.IndicatorReference;
import com.openlap.analytics_module.entities.utility_entities.IndicatorType;
import com.openlap.analytics_module.repositories.IndicatorCacheRepository;
import com.openlap.analytics_module.repositories.IndicatorRepository;
import com.openlap.analytics_module.services.BasicAnalysisFields;
import com.openlap.analytics_statements.dtos.request.StatementsRequest;
import com.openlap.analytics_statements.services.StatementService;
import com.openlap.analytics_technique.entities.AnalyticsTechnique;
import com.openlap.analytics_technique.services.AnalyticsTechniqueService;
import com.openlap.dataset.*;
import com.openlap.exceptions.AnalyticsMethodInitializationException;
import com.openlap.infrastructure.exception.ValidationException;
import com.openlap.template.AnalyticsMethod;
import com.openlap.user.services.TokenService;
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
      new IndicatorUtilityServiceImpl(mock(TokenService.class), null, null, analytics, indicators, null);
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

  @Test public void directIdentityFieldsAndWholeIdentityObjectsArePrivate() {
    for (String field : List.of("statement", "statement.actor", "statement.actor.name",
        "statement.actor.account.name", "statement.actor.mbox", "statement.actor.mbox_sha1sum",
        "statement.actor.openid", "statement.authority", "actor.account.name",
        "statement.context", "statement.context.instructor.name",
        "statement.context.team.member.0.mbox", "statement.context.contextAgents",
        "statement.context.contextGroups", "statement.object",
        "statement.object.actor.account.name", "statement.object.object.member",
        "statement.object.account.homePage", "statement.object.mbox.sha1sum",
        " Statement . Actor . Name ", "$statement.actor.name", "statement.$actor.name")) {
      assertThat(BasicAnalysisFields.isPrivate(field)).as(field).isTrue();
    }
    for (String field : List.of("statement.id", "statement.object.id", "statement.verb.id",
        "statement.object.definition.name.en-US", "statement.stored", "statement.context.platform",
        "statement.result.success", "statement.result.score.raw", "statement.result.extensions.score")) {
      assertThat(BasicAnalysisFields.isPrivate(field)).as(field).isFalse();
    }
  }

  @Test public void basicAnalysisRejectsPrivateProjectionsAndMappedSourcesBeforeReadingStatements() {
    assertPrivateFailure(() -> basic.analyzeIndicator(new IndicatorAnalysisRequest(
        queryOutput("statement.actor.name"), "method", mapping, List.of())));
    assertPrivateFailure(() -> basic.analyzeIndicator(new IndicatorAnalysisRequest(
        queryOutput("statement.result.score.raw"), "method", actorMapping(), List.of())));
    verifyNoInteractions(statements, plugin);
  }

  @Test public void savedBasicRejectsAnIdentityMappingBeforeServingItsAnalysisCache() {
    var saved = new Indicator();
    saved.setId("private");
    saved.setIndicatorType(IndicatorType.BASIC);
    saved.setCreatedOn(LocalDateTime.now().minusMinutes(10));
    saved.setIndicatorQuery(new Gson().toJson(queryOutput("statement.result.score.raw")));
    saved.setAnalyticsTechniqueReference(new AnalyticsTechniqueReference("[]",
        new Gson().toJson(actorMapping()), new AnalyticsTechnique()));
    when(indicators.findById(saved.getId())).thenReturn(Optional.of(saved));
    when(caches.findById(saved.getId())).thenReturn(Optional.of(new IndicatorCache(
        saved.getId(), "", new Gson().toJson(data), saved.getCreatedOn(), LocalDateTime.now())));

    assertPrivateFailure(() -> basic.analyzeIndicatorByIndicatorId(saved.getId()));
    verify(caches, never()).findById(saved.getId());
    verifyNoInteractions(statements, plugin);
  }

  @Test public void basicDraftCompletionRejectsAnIdentityInputBeforePersisting() {
    var reference = new IndicatorReference();
    reference.setIndicatorType(IndicatorType.BASIC);
    reference.setIndicatorQuery(queryOutput("statement.result.score.raw"));
    reference.setAnalyticsTechniqueMapping(actorMapping());
    assertPrivateFailure(() -> utility.prepareDraftCompletion(null, reference));
    verifyNoInteractions(indicators, plugin);
  }

  private static StatementsRequest queryOutput(String field) {
    var query = new StatementsRequest();
    query.setOutputs(List.of(field));
    return query;
  }

  private static OpenLAPPortConfig actorMapping() {
    var source = new OpenLAPColumnConfigData("statement.actor.account.name", OpenLAPColumnDataType.Text,
        true, "User", "");
    var input = new OpenLAPColumnConfigData("member", OpenLAPColumnDataType.Text, true, "Member", "");
    return new OpenLAPPortConfig(new ArrayList<>(List.of(new OpenLAPPortMapping(source, input))));
  }

  private static void assertPrivateFailure(org.assertj.core.api.ThrowableAssert.ThrowingCallable run) {
    assertThatThrownBy(run).isInstanceOfSatisfying(ValidationException.class, failure -> {
      assertThat(failure.getCode()).isEqualTo("PRIVATE_ANALYSIS_INPUT");
      assertThat(failure.getMessage()).contains("another analysis input").doesNotContain("statement.actor");
    });
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
