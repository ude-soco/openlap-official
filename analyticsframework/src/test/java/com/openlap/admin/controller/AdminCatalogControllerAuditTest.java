package com.openlap.admin.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.openlap.admin.audit.AdminAuditActions;
import com.openlap.admin.audit.AdminAuditService;
import com.openlap.admin.audit.AdminResourceTypes;
import com.openlap.admin.dto.AdminCatalogStatusRequest;
import com.openlap.admin.dto.AdminVisLibraryResponse;
import com.openlap.admin.services.AdminCatalogService;
import java.util.Map;
import org.junit.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockHttpServletRequest;

public class AdminCatalogControllerAuditTest {

  private final AdminCatalogService adminCatalogService = mock(AdminCatalogService.class);
  private final AdminAuditService adminAuditService = mock(AdminAuditService.class);
  private final AdminCatalogController controller =
      new AdminCatalogController(adminCatalogService, adminAuditService);
  private final MockHttpServletRequest request = new MockHttpServletRequest();

  @Test
  public void catalogStatusUpdateLogsOldAndNewEnabledValues() {
    when(adminCatalogService.getVisualizationLibraryById("L1"))
        .thenReturn(new AdminVisLibraryResponse("L1", "creator", "Library", "desc", true));
    when(adminCatalogService.setVisualizationLibraryEnabled("L1", false))
        .thenReturn(new AdminVisLibraryResponse("L1", "creator", "Library", "desc", false));

    controller.setVisualizationLibraryStatus(request, "L1", new AdminCatalogStatusRequest(false));

    ArgumentCaptor<Map<String, Object>> metadataCaptor = ArgumentCaptor.forClass(Map.class);
    verify(adminAuditService)
        .logSuccess(
            eq(request),
            eq(AdminAuditActions.VISUALIZATION_LIBRARY_STATUS_UPDATE),
            eq(AdminResourceTypes.VISUALIZATION_LIBRARY),
            eq("L1"),
            eq("Library"),
            metadataCaptor.capture());
    assertThat(metadataCaptor.getValue())
        .containsEntry("oldEnabled", true)
        .containsEntry("newEnabled", false);
  }
}
