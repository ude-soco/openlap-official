package com.openlap.analytics_module.services;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.openlap.analytics_module.controllers.ComplexIndicatorReadController;
import com.openlap.analytics_module.entities.Indicator;
import com.openlap.analytics_module.entities.utility_entities.*;
import com.openlap.analytics_module.exceptions.indicator.ComplexIndicatorException;
import com.openlap.analytics_module.repositories.IndicatorRepository;
import com.openlap.analytics_technique.entities.AnalyticsTechnique;
import com.openlap.analytics_technique.services.AnalyticsTechniqueService;
import com.openlap.response.ApiSuccess;
import com.openlap.user.entities.User;
import com.openlap.user.services.TokenService;
import java.util.*;
import org.junit.Test;
import org.springframework.data.domain.*;
import org.springframework.mock.web.MockHttpServletRequest;

public class ComplexIndicatorReadControllerTest {
  private final IndicatorRepository repository = mock(IndicatorRepository.class);
  private final TokenService tokens = mock(TokenService.class);
  private final AnalyticsTechniqueService analytics = mock(AnalyticsTechniqueService.class);
  private final ComplexIndicatorSourceGuard guard = mock(ComplexIndicatorSourceGuard.class);
  private final IndicatorCompositeService composite = mock(IndicatorCompositeService.class);
  private final IndicatorMultiLevelService multi = mock(IndicatorMultiLevelService.class);
  private final ComplexIndicatorReadController controller = new ComplexIndicatorReadController(
      repository, tokens, analytics, guard, composite, multi);

  private Indicator source(String id, String query) {
    User user = new User(); user.setId("0123456789abcdef01234567");
    when(tokens.getUserFromToken(any())).thenReturn(user);
    AnalyticsTechnique method = new AnalyticsTechnique(); method.setId("method"); method.setName("Count");
    Indicator source = new Indicator(); source.setId(id); source.setName(id); source.setCreatedBy(user);
    source.setIndicatorType(IndicatorType.BASIC); source.setIndicatorQuery(query);
    source.setAnalyticsTechniqueReference(new AnalyticsTechniqueReference("[]", "{}", method));
    return source;
  }

  @Test @SuppressWarnings("unchecked")
  public void metadataBrowsingDoesNotExecuteChartsAndAnInvalidSourceCannotBreakThePage() {
    Indicator valid = source("valid", "{\"lrsStores\":[]}");
    Indicator invalid = source("invalid", "{broken");
    when(repository.findBasicIndicatorByCreatedBy_IdAndNameLike(any(), anyString(), any()))
        .thenReturn(new PageImpl<>(List.of(valid, invalid)));
    when(analytics.getAnalyticsTechniqueOutputs("method")).thenReturn(List.of());
    ApiSuccess response = (ApiSuccess) controller.sources(new MockHttpServletRequest(), 0, 10, ".*").getBody();
    Page<Map<String, Object>> rows = (Page<Map<String, Object>>) response.getData();
    assertThat(rows.getContent().get(0)).containsEntry("available", true).doesNotContainKey("indicatorCode");
    assertThat(rows.getContent().get(1)).containsEntry("available", false).containsKey("unavailableReason");
    verifyNoInteractions(composite, multi);
    verify(repository).findBasicIndicatorByCreatedBy_IdAndNameLike(any(), eq("\\Q.*\\E"), any());
  }

  @Test public void freshResultDataRequiresOwnershipBeforeExecutingAnySource() {
    Indicator other = source("foreign", "{}");
    User foreign = new User(); foreign.setId("somebody-else"); other.setCreatedBy(foreign);
    other.setIndicatorType(IndicatorType.COMPOSITE);
    when(repository.findById("foreign")).thenReturn(Optional.of(other));
    assertThatThrownBy(() -> controller.result(new MockHttpServletRequest(), "foreign"))
        .isInstanceOfSatisfying(ComplexIndicatorException.class,
            error -> assertThat(error.getStatus().value()).isEqualTo(403));
    verifyNoInteractions(composite, multi, guard);
  }
}
