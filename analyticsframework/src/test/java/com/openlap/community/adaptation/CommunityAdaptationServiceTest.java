package com.openlap.community.adaptation;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.openlap.analytics_module.drafts.*;
import com.openlap.analytics_module.entities.Indicator;
import com.openlap.analytics_module.entities.utility_entities.IndicatorType;
import com.openlap.community.CommunityCatalogService;
import com.openlap.user.entities.User;
import com.openlap.user.services.TokenService;
import java.util.UUID;
import org.junit.Test;
import org.springframework.mock.web.MockHttpServletRequest;

public class CommunityAdaptationServiceTest {
  private final CommunityCatalogService catalog = mock(CommunityCatalogService.class);
  private final CommunityAdaptationRecipes recipes = mock(CommunityAdaptationRecipes.class);
  private final IndicatorDraftService drafts = mock(IndicatorDraftService.class);
  private final TokenService tokens = mock(TokenService.class);
  private final CommunityAdaptationService service = new CommunityAdaptationService(catalog, recipes, drafts, tokens);
  private final MockHttpServletRequest request = new MockHttpServletRequest();
  private final String pool = "b5925a28-89a8-4813-98a1-d515c7500397";

  @Test public void retriedStartReturnsPrivateSnapshotWithoutResolvingADeletedOriginal() {
    String key = UUID.randomUUID().toString();
    var stored = new IndicatorDraftResponse("draft-private", IndicatorType.BASIC, "Own version", null, 1, 3,
        null, null, null, null, "DRAFT", null, true, false);
    when(drafts.findAdaptation(request, key, pool)).thenReturn(stored);
    assertThat(service.start(request, pool, key)).isSameAs(stored);
    verifyNoInteractions(catalog, recipes, tokens);
    verify(drafts, never()).createAdaptation(any(), any(), any(), any(), any(), any());
  }

  @Test public void startRequiresNoCompatibilityReceiptAndCreatesOnlyAnUnboundPrivateDraft() {
    String key = UUID.randomUUID().toString(); var source = new Indicator(); var viewer = new User();
    var configuration = new com.fasterxml.jackson.databind.ObjectMapper().createObjectNode();
    var metadata = configuration.deepCopy();
    when(catalog.resolveIndicator(pool)).thenReturn(source);
    when(tokens.getUserFromToken(request)).thenReturn(viewer);
    when(recipes.prepare(source, viewer, pool)).thenReturn(new CommunityAdaptationRecipes.Prepared(IndicatorType.BASIC, "Own version", configuration, metadata));
    service.start(request, pool, key);
    verify(drafts).createAdaptation(request, key, IndicatorType.BASIC, "Own version", configuration, metadata);
    verify(catalog).resolveIndicator(pool);
    verifyNoMoreInteractions(catalog);
  }
}
