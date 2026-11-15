package com.openlap.analytics_module.services;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.openlap.analytics_module.controllers.IndicatorController;
import com.openlap.analytics_module.entities.Indicator;
import com.openlap.analytics_module.exceptions.indicator.ComplexIndicatorException;
import com.openlap.analytics_module.repositories.IndicatorRepository;
import com.openlap.user.entities.User;
import com.openlap.user.services.TokenService;
import java.util.Optional;
import org.junit.Test;
import org.springframework.mock.web.MockHttpServletRequest;

/** Exercise legacy HTTP entry points with the real ownership policy, before any code/data access. */
public class CommunityPrivacyBoundaryTest {
  @Test public void foreignAndPendingDefinitionsCannotBypassAnonymousCommunityViews() {
    IndicatorRepository repository = mock(IndicatorRepository.class);
    TokenService tokens = mock(TokenService.class);
    IndicatorService service = mock(IndicatorService.class);
    MockHttpServletRequest request = new MockHttpServletRequest();
    User viewer = new User(); viewer.setId("viewer");
    User author = new User(); author.setId("author");
    when(tokens.getUserFromToken(request)).thenReturn(viewer);
    Indicator source = new Indicator(); source.setCreatedBy(author);
    when(repository.findById("private")).thenReturn(Optional.of(source));
    var controller = new IndicatorController(service, new ComplexIndicatorSourceGuard(repository, tokens));
    assertThatThrownBy(() -> controller.getIndicatorById(request, "private", true))
        .isInstanceOfSatisfying(ComplexIndicatorException.class,
            error -> assertThat(error.getStatus().value()).isEqualTo(404));
    assertThatThrownBy(() -> controller.requestInteractiveIndicatorCode("private", request))
        .isInstanceOf(ComplexIndicatorException.class);
    assertThatThrownBy(() -> controller.findCompatibleIndicators(request, "private", 0))
        .isInstanceOf(ComplexIndicatorException.class);
    source.setCreatedBy(viewer); source.setCommunityCopyPending("unacknowledged-copy");
    assertThatThrownBy(() -> controller.getIndicatorById(request, "private", false))
        .isInstanceOf(ComplexIndicatorException.class);
    verifyNoInteractions(service);
    source.setCommunityCopyPending(null);
    controller.getIndicatorById(request, "private", false);
    verify(service).getIndicatorById("private", false);
  }

  @Test public void legacyPoolRoutesCannotReadCreatorsOrCopyWithoutAPersonalPreview() {
    IndicatorService service = mock(IndicatorService.class);
    var controller = new IndicatorController(service, mock(ComplexIndicatorSourceGuard.class));
    var request = new MockHttpServletRequest();
    assertThatThrownBy(() -> controller.getAllIndicators(0, 10, "createdBy", "asc"))
        .isInstanceOfSatisfying(ComplexIndicatorException.class,
            error -> assertThat(error.getStatus().value()).isEqualTo(410));
    assertThatThrownBy(() -> controller.validatePreviewBeforeDuplicationIndicator(request, "source"))
        .isInstanceOf(ComplexIndicatorException.class);
    assertThatThrownBy(() -> controller.duplicateBasicIndicator(request, "source"))
        .isInstanceOf(ComplexIndicatorException.class);
    verifyNoInteractions(service);
  }
}
