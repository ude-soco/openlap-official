package com.openlap.analytics_module.embedding;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.openlap.analytics_module.entities.*;
import com.openlap.analytics_module.entities.utility_entities.VisualizationTechniqueReference;
import com.openlap.analytics_module.repositories.*;
import com.openlap.analytics_module.services.*;
import com.openlap.analytics_module.services.impl.IndicatorServiceImpl;
import com.openlap.analytics_statements.services.StatementService;
import com.openlap.analytics_technique.services.AnalyticsTechniqueService;
import com.openlap.user.services.TokenService;
import com.openlap.visualization_methods.entities.VisType;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.ui.ExtendedModelMap;

class IndicatorEmbedContractTest {
  final IndicatorUtilityService utility=mock(IndicatorUtilityService.class);
  final QuestionService questions=mock(QuestionService.class);
  IndicatorServiceImpl service() {
    return spy(new IndicatorServiceImpl(mock(IndicatorRepository.class),mock(IndicatorDraftsRepository.class),
        mock(IndicatorCacheRepository.class),mock(TokenService.class),mock(IndicatorMultiLevelService.class),
        mock(IndicatorCompositeService.class),mock(IndicatorBasicService.class),utility,questions,
        mock(StatementService.class),mock(AnalyticsTechniqueService.class),mock(IndicatorAnalysisCacheRepository.class),mock(ComplexIndicatorReferences.class)));
  }
  Indicator indicator(String id,String name,String typeId) {
    VisType type=new VisType();type.setId(typeId);VisualizationTechniqueReference reference=new VisualizationTechniqueReference();reference.setVisType(type);
    Indicator indicator=new Indicator();indicator.setId(id);indicator.setName(name);indicator.setVisualizationTechniqueReference(reference);return indicator;
  }
  @Test void copiedIframeRetainsTheLocalPortAndBackendContextPath() {
    Indicator indicator=indicator("indicator-one","Title","type-one");when(utility.fetchIndicatorMethod("indicator-one")).thenReturn(indicator);
    MockHttpServletRequest request=new MockHttpServletRequest();request.setScheme("http");request.setServerName("127.0.0.1");request.setServerPort(8093);request.setContextPath("/api");
    String iframe=service().requestInteractiveIndicatorCode("indicator-one",request);
    assertThat(iframe).contains("src=\"http://127.0.0.1:8093/api/v1/code/indicators?indicatorId=indicator-one\"", "title=\"OpenLAP indicator\"", "loading=\"lazy\"")
        .doesNotContain("<script", "cdn.jsdelivr", "cdnjs", "d3js.org");
  }
  @Test void aPublicHttpsEmbedOmitsTheDefaultPortAndEscapesQueryValues() {
    Indicator indicator=indicator("id with space","Title","type-one");when(utility.fetchIndicatorMethod("id with space")).thenReturn(indicator);
    MockHttpServletRequest request=new MockHttpServletRequest();request.setScheme("https");request.setServerName("openlap.example");request.setServerPort(443);request.setContextPath("/api");
    assertThat(service().requestInteractiveIndicatorCode("id with space",request))
        .contains("https://openlap.example/api/v1/code/indicators?indicatorId=id%20with%20space").doesNotContain(":443");
  }
  @Test void indicatorTemplateReceivesCodeAndItsExplicitVisualizationType() {
    Indicator indicator=indicator("one","<Title>","type-one");when(utility.fetchIndicatorMethod("one")).thenReturn(indicator);
    IndicatorServiceImpl service=service();String code="<div id='chart'>50% and %20</div><script>window.ChartFixture=true;</script>";
    doReturn(code).when(service).generateIndicatorCode("one",false);
    ExtendedModelMap model=new ExtendedModelMap();assertThat(service.getInteractiveIndicatorTemplate("one",model)).isEqualTo("indicator");
    assertThat(model).containsEntry("indicatorCode",code).containsEntry("visualizationTypeId","type-one").containsEntry("indicatorName","<Title>");
  }
  @Test void questionChartsRetainSeparateRuntimeTypesAndCode() {
    Indicator first=indicator("one","First","type-c3"),second=indicator("two","Second","type-apex");
    AnalyticsQuestion question=new AnalyticsQuestion();question.setName("Question");question.setIndicators(List.of(first,second));when(questions.fetchQuestionMethod("question")).thenReturn(question);
    IndicatorServiceImpl service=service();doReturn("<div>First chart 50%</div>").when(service).generateIndicatorCode("one",false);
    doReturn("<div>Second chart %20</div>").when(service).generateIndicatorCode("two",false);
    ExtendedModelMap model=new ExtendedModelMap();assertThat(service.getInteractiveQuestionCode("question",model)).isEqualTo("question");
    assertThat(model).containsEntry("questionName","Question");
    List<Map<String,String>> charts=(List<Map<String,String>>)model.get("questionCharts");
    assertThat(charts).containsExactly(Map.of("name","First","typeId","type-c3","code","<div>First chart 50%</div>"),
        Map.of("name","Second","typeId","type-apex","code","<div>Second chart %20</div>"));
    assertThat(model).doesNotContainKey("questionCode");
  }
  @Test void copiedQuestionIframeAlsoRetainsThePortAndContextPath() {
    AnalyticsQuestion question=new AnalyticsQuestion();question.setId("question-one");
    var service=spy(new com.openlap.analytics_module.services.impl.QuestionServiceImpl(
        mock(QuestionRepository.class),mock(AnalyticsGoalsService.class),utility,mock(IndicatorService.class),mock(TokenService.class)));
    doReturn(question).when(service).fetchQuestionMethod("question-one");
    MockHttpServletRequest request=new MockHttpServletRequest();request.setScheme("http");request.setServerName("127.0.0.1");request.setServerPort(8093);request.setContextPath("/api");
    assertThat(service.requestInteractiveQuestionCode("question-one",request))
        .contains("http://127.0.0.1:8093/api/v1/code/questions?questionId=question-one","title=\"OpenLAP question\"")
        .doesNotContain("<script","cdn.jsdelivr","cdnjs");
  }
}
