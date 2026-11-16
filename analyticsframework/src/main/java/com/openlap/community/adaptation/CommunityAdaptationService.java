package com.openlap.community.adaptation;

import com.openlap.analytics_module.drafts.IndicatorDraftResponse;
import com.openlap.analytics_module.drafts.IndicatorDraftService;
import com.openlap.community.CommunityCatalogService;
import com.openlap.infrastructure.exception.ValidationException;
import com.openlap.user.services.TokenService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Locale;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Starting an adaptation only creates a private authoring draft, including for incompatible data. */
@Service
@RequiredArgsConstructor
public class CommunityAdaptationService {
  private final CommunityCatalogService catalog;
  private final CommunityAdaptationRecipes recipes;
  private final IndicatorDraftService drafts;
  private final TokenService tokens;

  public IndicatorDraftResponse start(HttpServletRequest request, String poolId, String clientRequestId) {
    String canonical;
    try {
      canonical = UUID.fromString(poolId).toString();
      if (!canonical.equalsIgnoreCase(poolId)) throw new IllegalArgumentException();
    } catch (RuntimeException invalid) {
      throw new ValidationException("INVALID_COMMUNITY_ID", "Choose an available community indicator.");
    }
    canonical = canonical.toLowerCase(Locale.ROOT);
    // Check the owner/request receipt first: a lost response remains recoverable after source deletion.
    IndicatorDraftResponse existing = drafts.findAdaptation(request, clientRequestId, canonical);
    if (existing != null) return existing;
    var source = catalog.resolveIndicator(canonical);
    var prepared = recipes.prepare(source, tokens.getUserFromToken(request), canonical);
    return drafts.createAdaptation(request, clientRequestId, prepared.type(), prepared.name(),
        prepared.configuration(), prepared.adaptation());
  }
}
