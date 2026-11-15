package com.openlap.community;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.openlap.analytics_module.entities.Indicator;
import com.openlap.analytics_module.entities.utility_entities.*;
import com.openlap.analytics_module.repositories.IndicatorRepository;
import com.openlap.user.services.TokenService;
import com.openlap.visualization_methods.entities.VisType;
import java.time.LocalDateTime;
import java.util.Map;
import org.junit.Test;
import org.springframework.mock.web.MockHttpServletRequest;

public class CommunityIndicatorDetailsTest {
  @Test public void previewContractIncludesVersionAndPluginIdWithoutOriginalIdentityOrQuery() {
    var catalog = mock(CommunityCatalogService.class); var tokens = mock(TokenService.class);
    var repository = mock(IndicatorRepository.class); var execution = mock(CommunityIndicatorExecution.class);
    var source = new Indicator(); source.setCreatedBy(CommunitySanitizerTest.creator());
    source.setId("original-private-source"); source.setName("Alice's accesses"); source.setIndicatorType(IndicatorType.BASIC);
    source.setIndicatorQuery("{\"lrsStores\":[{\"lrsId\":\"private-store-id\",\"uniqueIdentifier\":\"private-learner-id\"}],\"outputs\":[\"Activities\"]}");
    source.setConfigurationRequest("private original configuration");
    var type = new VisType(); type.setId("installed-chart-type");
    source.setVisualizationTechniqueReference(new VisualizationTechniqueReference("{}", "{}", null, type));
    var request = new MockHttpServletRequest(); when(tokens.getUserFromToken(request)).thenReturn(CommunitySanitizerTest.creator());
    when(catalog.resolveIndicator(CommunityCatalogTest.POOL)).thenReturn(source);
    when(catalog.metadata("indicators", CommunityCatalogTest.POOL, source.getCreatedBy().getId())).thenReturn(Map.of("id", CommunityCatalogTest.POOL));
    when(execution.fingerprint(source)).thenReturn("full-graph-fingerprint");
    var result = new CommunityIndicatorDetails(catalog, tokens, repository, execution).detail(request, CommunityCatalogTest.POOL);
    assertThat(result).containsEntry("version", "full-graph-fingerprint").containsEntry("visualizationTypeId", "installed-chart-type").containsEntry("dataScope", "Only my data");
    assertThat(CommunitySanitizer.json(result)).doesNotContain("Alice", "private-", "original-private", "createdBy", "lrsStores", "configurationRequest");
  }
  @Test public void missingSourceStillProvidesStableDetailVersionSoPreviewCanExplainIncompatibility() {
    var catalog = mock(CommunityCatalogService.class); var tokens = mock(TokenService.class);
    var repository = mock(IndicatorRepository.class); var execution = mock(CommunityIndicatorExecution.class);
    var source = new Indicator(); source.setCreatedBy(CommunitySanitizerTest.creator()); source.setIndicatorType(IndicatorType.COMPOSITE);
    source.setName("Learning activity"); source.setCreatedOn(LocalDateTime.of(2026, 11, 15, 12, 0));
    var request = new MockHttpServletRequest(); when(tokens.getUserFromToken(request)).thenReturn(source.getCreatedBy());
    when(catalog.resolveIndicator(CommunityCatalogTest.POOL)).thenReturn(source);
    when(catalog.metadata("indicators", CommunityCatalogTest.POOL, source.getCreatedBy().getId())).thenReturn(Map.of("id", CommunityCatalogTest.POOL));
    when(execution.fingerprint(source)).thenThrow(CommunityCatalogService.unavailable());
    var service = new CommunityIndicatorDetails(catalog, tokens, repository, execution);
    assertThat(service.detail(request, CommunityCatalogTest.POOL).get("version")).isEqualTo(service.detail(request, CommunityCatalogTest.POOL).get("version"));
    assertThat((String) service.detail(request, CommunityCatalogTest.POOL).get("version")).hasSize(64);
  }
}
