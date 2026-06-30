package com.openlap.admin.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.openlap.admin.dto.AdminAnalyticsMethodResponse;
import com.openlap.admin.dto.AdminVisLibraryResponse;
import com.openlap.analytics_technique.entities.AnalyticsTechnique;
import com.openlap.analytics_technique.repositories.AnalyticsTechniqueRepository;
import com.openlap.analytics_technique.services.AnalyticsTechniqueService;
import com.openlap.visualization_methods.entities.VisLibrary;
import com.openlap.visualization_methods.repositories.VisualizationLibraryRepository;
import com.openlap.visualization_methods.repositories.VisualizationTypeRepository;
import com.openlap.visualization_methods.services.VisualizationMethodUtilityService;
import java.util.Arrays;
import java.util.List;
import org.junit.Test;

/** Admin catalog lists include disabled items; status toggles flip and persist the flag. */
public class AdminCatalogServiceImplTest {

  private final VisualizationLibraryRepository libraryRepository =
      mock(VisualizationLibraryRepository.class);
  private final VisualizationTypeRepository typeRepository =
      mock(VisualizationTypeRepository.class);
  private final AnalyticsTechniqueRepository methodRepository =
      mock(AnalyticsTechniqueRepository.class);
  private final VisualizationMethodUtilityService utilityService =
      mock(VisualizationMethodUtilityService.class);
  private final AnalyticsTechniqueService analyticsTechniqueService =
      mock(AnalyticsTechniqueService.class);
  private final AdminCatalogServiceImpl service =
      new AdminCatalogServiceImpl(
          libraryRepository,
          typeRepository,
          methodRepository,
          utilityService,
          analyticsTechniqueService);

  private static VisLibrary library(String id, Boolean enabled) {
    VisLibrary library = new VisLibrary();
    library.setId(id);
    library.setName("name-" + id);
    library.setEnabled(enabled);
    return library;
  }

  private static AnalyticsTechnique method(String id, Boolean enabled) {
    AnalyticsTechnique technique = new AnalyticsTechnique();
    technique.setId(id);
    technique.setName("name-" + id);
    technique.setDescription("desc");
    technique.setEnabled(enabled);
    return technique;
  }

  @Test
  public void adminLibraryListIncludesDisabled() {
    when(libraryRepository.findAll())
        .thenReturn(Arrays.asList(library("L1", true), library("L2", false)));

    List<AdminVisLibraryResponse> result = service.getVisualizationLibraries();

    assertThat(result).hasSize(2);
    AdminVisLibraryResponse disabled =
        result.stream()
            .filter(r -> "L2".equals(r.getId()))
            .findFirst()
            .orElseThrow(AssertionError::new);
    assertThat(disabled.isEnabled()).isFalse();
  }

  @Test
  public void setLibraryEnabledTogglesAndPersists() {
    VisLibrary library = library("L1", true);
    when(utilityService.fetchVisualizationLibraryMethod("L1")).thenReturn(library);
    when(libraryRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

    AdminVisLibraryResponse result = service.setVisualizationLibraryEnabled("L1", false);

    assertThat(result.isEnabled()).isFalse();
    assertThat(library.isEnabled()).isFalse();
  }

  @Test
  public void setMethodEnabledTogglesAndPersists() {
    AnalyticsTechnique technique = method("M1", false);
    when(analyticsTechniqueService.fetchAnalyticsTechniqueMethod("M1")).thenReturn(technique);
    when(methodRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

    AdminAnalyticsMethodResponse result = service.setAnalyticsMethodEnabled("M1", true);

    assertThat(result.isEnabled()).isTrue();
    assertThat(technique.isEnabled()).isTrue();
  }
}
