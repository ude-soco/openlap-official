package com.openlap.admin.services;

import com.openlap.admin.dto.AdminAnalyticsMethodResponse;
import com.openlap.admin.dto.AdminVisLibraryResponse;
import com.openlap.admin.dto.AdminVisTypeResponse;
import java.util.List;

/**
 * Admin catalog management: lists that include disabled items (unlike the editor-facing endpoints,
 * which hide them) and soft-disable status toggles. Does not hard-delete or alter plugin loading.
 */
public interface AdminCatalogService {

  List<AdminVisLibraryResponse> getVisualizationLibraries();

  List<AdminVisTypeResponse> getVisualizationTypes();

  List<AdminAnalyticsMethodResponse> getAnalyticsMethods();

  AdminVisLibraryResponse getVisualizationLibraryById(String id);

  AdminVisTypeResponse getVisualizationTypeById(String id);

  AdminAnalyticsMethodResponse getAnalyticsMethodById(String id);

  AdminVisLibraryResponse setVisualizationLibraryEnabled(String id, boolean enabled);

  AdminVisTypeResponse setVisualizationTypeEnabled(String id, boolean enabled);

  AdminAnalyticsMethodResponse setAnalyticsMethodEnabled(String id, boolean enabled);
}
