package com.openlap.analytics_module.workspace;

import com.openlap.analytics_module.drafts.IndicatorDraftService;
import com.openlap.user.services.TokenService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class IndicatorWorkspaceService {
  private final TokenService tokens;
  private final IndicatorDraftService drafts;
  private final MongoIndicatorWorkspace workspace;

  public Page<IndicatorWorkspaceRow> list(
      HttpServletRequest request,
      int page,
      int size,
      String search,
      String indicatorType,
      boolean draftsOnly,
      String sortBy,
      String direction) {
    return list(request, page, size, search, indicatorType, draftsOnly, sortBy, direction, "");
  }

  public Page<IndicatorWorkspaceRow> list(HttpServletRequest request, int page, int size,
      String search, String indicatorType, boolean draftsOnly, String sortBy, String direction,
      String origin) {
    IndicatorWorkspaceQuery query =
        IndicatorWorkspaceQuery.checked(
            page, size, search, indicatorType, draftsOnly, sortBy, direction, origin);
    String owner = tokens.getUserFromToken(request).getId();
    drafts.migrateLegacyForOwner(request);
    return workspace.page(owner, query);
  }
}
