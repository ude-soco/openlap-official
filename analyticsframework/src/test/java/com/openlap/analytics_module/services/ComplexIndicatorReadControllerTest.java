package com.openlap.analytics_module.services;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.openlap.analytics_module.controllers.ComplexIndicatorReadController;
import com.openlap.analytics_module.dto.response.indicator.IndicatorFullDetailResponse;
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
import org.bson.types.ObjectId;
import org.junit.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.*;
import org.springframework.mock.web.MockHttpServletRequest;

public class ComplexIndicatorReadControllerTest {
  private final IndicatorRepository repository = mock(IndicatorRepository.class);
  private final TokenService tokens = mock(TokenService.class);
  private final AnalyticsTechniqueService analytics = mock(AnalyticsTechniqueService.class);
  private final ComplexIndicatorSourceGuard guard = mock(ComplexIndicatorSourceGuard.class);
  private final IndicatorCompositeService composite = mock(IndicatorCompositeService.class);
  private final IndicatorMultiLevelService multi = mock(IndicatorMultiLevelService.class);
  private final IndicatorService details = mock(IndicatorService.class);
  private final ComplexIndicatorReadController controller = new ComplexIndicatorReadController(
      repository, tokens, analytics, guard, composite, multi, details);

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
    ApiSuccess response = (ApiSuccess) controller.sources(new MockHttpServletRequest(), 0, 10, ".*",
        "name", "asc", "").getBody();
    Page<Map<String, Object>> rows = (Page<Map<String, Object>>) response.getData();
    assertThat(rows.getContent().get(0)).containsEntry("available", true).doesNotContainKey("indicatorCode");
    assertThat(rows.getContent().get(1)).containsEntry("available", false).containsKey("unavailableReason");
    verifyNoInteractions(composite, multi, details);
    verify(analytics).getAnalyticsTechniqueOutputs("method");
    verify(repository).findBasicIndicatorByCreatedBy_IdAndNameLike(any(), eq("\\Q.*\\E"), any());
  }

  @Test @SuppressWarnings("unchecked")
  public void methodFilterIsAppliedWithOwnerAndSearchBeforePaginationAndPreservesTotal() {
    Indicator valid = source("owned-basic", "{}");
    ObjectId owner = new ObjectId("0123456789abcdef01234567");
    ObjectId method = new ObjectId("abcdef0123456789abcdef01");
    when(repository.findBasicIndicatorByOwnerAndMethodAndNameLike(eq(owner), eq(method), anyString(), any()))
        .thenReturn(new PageImpl<>(List.of(valid), PageRequest.of(1, 10), 22));
    ApiSuccess response = (ApiSuccess) controller.sources(new MockHttpServletRequest(), 1, 10,
        "  .*  ", "createdOn", "desc", " " + method + " ").getBody();
    Page<Map<String, Object>> rows = (Page<Map<String, Object>>) response.getData();
    assertThat(rows.getTotalElements()).isEqualTo(22);
    assertThat(rows.getNumber()).isEqualTo(1);
    assertThat(rows.getContent()).hasSize(1);
    ArgumentCaptor<Pageable> page = ArgumentCaptor.forClass(Pageable.class);
    verify(repository).findBasicIndicatorByOwnerAndMethodAndNameLike(eq(owner), eq(method),
        eq("\\Q.*\\E"), page.capture());
    assertThat(page.getValue().getSort().toList()).containsExactly(
        Sort.Order.desc("createdOn"), Sort.Order.asc("id"));
    verify(repository, never()).findBasicIndicatorByCreatedBy_IdAndNameLike(any(), anyString(), any());
    verifyNoInteractions(composite, multi, details);
  }

  @Test public void sourcePageSizeIsBoundedAndNameSortHasStableIdentityTieBreak() {
    source("unused", "{}");
    when(repository.findBasicIndicatorByCreatedBy_IdAndNameLike(any(), anyString(), any()))
        .thenReturn(Page.empty());
    controller.sources(new MockHttpServletRequest(), -1, 1000, "", "name", "ASC", "");
    ArgumentCaptor<Pageable> page = ArgumentCaptor.forClass(Pageable.class);
    verify(repository).findBasicIndicatorByCreatedBy_IdAndNameLike(any(), anyString(), page.capture());
    assertThat(page.getValue().getPageNumber()).isZero();
    assertThat(page.getValue().getPageSize()).isEqualTo(50);
    assertThat(page.getValue().getSort().toList()).containsExactly(
        Sort.Order.asc("name"), Sort.Order.asc("id"));
  }

  @Test public void unsupportedSortingAndMalformedFiltersFailBeforeDatabaseOrPluginAccess() {
    for (String[] options : List.of(
        new String[] {"indicatorQuery", "asc", "", ""},
        new String[] {"name", "up", "", ""},
        new String[] {"name", "asc", "not-an-object-id", ""},
        new String[] {"name", "asc", "", "a".repeat(301)})) {
      assertThatThrownBy(() -> controller.sources(new MockHttpServletRequest(), 0, 10,
          options[3], options[0], options[1], options[2]))
          .isInstanceOfSatisfying(ComplexIndicatorException.class,
              error -> assertThat(error.getStatus().value()).isEqualTo(400));
    }
    verifyNoInteractions(repository, tokens, analytics, composite, multi, details);
  }

  @Test public void previewRequiresSourceEligibilityBeforeRenderingAndReturnsExistingDetailShape() {
    MockHttpServletRequest request = new MockHttpServletRequest();
    IndicatorFullDetailResponse detail = new IndicatorFullDetailResponse();
    detail.setId("owned-basic"); detail.setIndicatorCode("reviewed-chart-code");
    when(details.getIndicatorById("owned-basic")).thenReturn(detail);
    ApiSuccess response = (ApiSuccess) controller.sourcePreview(request, "owned-basic").getBody();
    assertThat(response.getData()).isSameAs(detail);
    var order = inOrder(guard, details);
    order.verify(guard).validateIds(request, List.of("owned-basic"), false, false);
    order.verify(details).getIndicatorById("owned-basic");
    verifyNoInteractions(composite, multi, analytics);
  }

  @Test public void previewCannotExecuteForeignComplexOrMissingSources() {
    ComplexIndicatorReadController realPolicy = new ComplexIndicatorReadController(repository, tokens,
        analytics, new ComplexIndicatorSourceGuard(repository, tokens), composite, multi, details);
    Indicator foreign = source("foreign", "{}");
    User somebodyElse = new User(); somebodyElse.setId("different-owner");
    foreign.setCreatedBy(somebodyElse);
    when(repository.findById("foreign")).thenReturn(Optional.of(foreign));
    assertThatThrownBy(() -> realPolicy.sourcePreview(new MockHttpServletRequest(), "foreign"))
        .isInstanceOfSatisfying(ComplexIndicatorException.class,
            error -> assertThat(error.getStatus().value()).isEqualTo(403));

    Indicator complex = source("complex", "{}"); complex.setIndicatorType(IndicatorType.COMPOSITE);
    when(repository.findById("complex")).thenReturn(Optional.of(complex));
    assertThatThrownBy(() -> realPolicy.sourcePreview(new MockHttpServletRequest(), "complex"))
        .isInstanceOfSatisfying(ComplexIndicatorException.class,
            error -> assertThat(error.getStatus().value()).isEqualTo(400));
    when(repository.findById("missing")).thenReturn(Optional.empty());
    assertThatThrownBy(() -> realPolicy.sourcePreview(new MockHttpServletRequest(), "missing"))
        .isInstanceOfSatisfying(ComplexIndicatorException.class,
            error -> assertThat(error.getStatus().value()).isEqualTo(404));
    verifyNoInteractions(details, analytics, composite, multi);
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
