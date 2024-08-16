package com.openlap.analytics_statements.services;

import com.openlap.analytics_statements.dtos.request.LrsProviderRequest;
import com.openlap.analytics_statements.dtos.response.LrsStoreResponse;
import com.openlap.analytics_statements.entities.LrsClient;
import com.openlap.analytics_statements.entities.LrsRole;
import com.openlap.analytics_statements.entities.LrsStore;
import com.openlap.user.dto.response.utils.LrsProviderResponse;
import java.util.List;
import javax.servlet.http.HttpServletRequest;
import javax.validation.Valid;

public interface LrsService {
  LrsRole getAdminRole();

  LrsProviderResponse createLrs(HttpServletRequest request, LrsProviderRequest lrsProviderRequest);

  LrsClient createLrsClientMethod(LrsStore newLrsStore, String lrsTitle);

  LrsStore createStoreMethod(LrsProviderRequest lrsProviderRequest);

  LrsStore getLrsStore(String storeId);

  LrsClient getLrsClient(String lrsClientId);

  LrsProviderResponse updateLrs(
      HttpServletRequest request,
      @Valid LrsProviderRequest title,
      String lrdStoreId,
      boolean confirm);

  List<LrsStoreResponse> getAvailableLrs();

  void deleteLrs(HttpServletRequest request, String lrdStoreId, boolean confirm);
}
