package com.openlap.analytics_module.services.impl;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.google.gson.JsonParser;
import com.openlap.analytics_module.entities.Indicator;
import com.openlap.analytics_module.entities.utility_entities.IndicatorType;
import com.openlap.analytics_module.exceptions.indicator.IndicatorManipulationNotAllowed;
import com.openlap.analytics_module.repositories.IndicatorRepository;
import com.openlap.analytics_module.services.IndicatorUtilityService;
import com.openlap.user.entities.User;
import com.openlap.user.services.TokenService;
import org.junit.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockHttpServletRequest;

public class ComplexIndicatorCopyTest {
  @Test public void complexCopyKeepsItsNewNameWhenReopenedAndOwnsItsReferences() {
    IndicatorRepository repository = mock(IndicatorRepository.class);
    IndicatorUtilityService utility = mock(IndicatorUtilityService.class);
    TokenService tokens = mock(TokenService.class);
    User owner = new User(); owner.setId("owner");
    Indicator original = new Indicator(); original.setId("original"); original.setName("Original");
    original.setCreatedBy(owner); original.setIndicatorType(IndicatorType.COMPOSITE);
    original.setConfigurationRequest("{\"schemaVersion\":1,\"type\":\"COMPOSITE\",\"name\":\"Original\",\"sources\":[]}");
    when(utility.fetchIndicatorMethod("original")).thenReturn(original);
    when(utility.fetchUserIndicatorForCopyMethod("owner", "Original")).thenReturn("Original (Copy)");
    when(tokens.getUserFromToken(any())).thenReturn(owner);
    IndicatorServiceImpl service = new IndicatorServiceImpl(repository, null, null, tokens,
        null, null, null, utility, null, null, null, null, null);
    service.copyMyExistingIndicator(new MockHttpServletRequest(), "original");
    ArgumentCaptor<Indicator> copy = ArgumentCaptor.forClass(Indicator.class);
    verify(repository).save(copy.capture());
    assertThat(copy.getValue().getName()).isEqualTo("Original (Copy)");
    assertThat(JsonParser.parseString(copy.getValue().getConfigurationRequest()).getAsJsonObject()
        .get("name").getAsString()).isEqualTo("Original (Copy)");
  }

  @Test public void copyRouteCannotBypassPoolOwnershipAndLrsAdaptation() {
    IndicatorRepository repository = mock(IndicatorRepository.class);
    IndicatorUtilityService utility = mock(IndicatorUtilityService.class);
    TokenService tokens = mock(TokenService.class);
    User owner = new User(); owner.setId("owner"); User other = new User(); other.setId("other");
    Indicator original = new Indicator(); original.setCreatedBy(other);
    when(utility.fetchIndicatorMethod("foreign")).thenReturn(original);
    when(tokens.getUserFromToken(any())).thenReturn(owner);
    IndicatorServiceImpl service = new IndicatorServiceImpl(repository, null, null, tokens,
        null, null, null, utility, null, null, null, null, null);
    assertThatThrownBy(() -> service.copyMyExistingIndicator(new MockHttpServletRequest(), "foreign"))
        .isInstanceOf(IndicatorManipulationNotAllowed.class);
    verifyNoInteractions(repository);
  }
}
