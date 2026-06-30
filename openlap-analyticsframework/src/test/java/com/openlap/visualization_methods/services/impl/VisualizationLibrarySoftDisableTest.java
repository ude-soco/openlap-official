package com.openlap.visualization_methods.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.openlap.visualization_methods.dto.VisualizationLibraryResponse;
import com.openlap.visualization_methods.entities.VisLibrary;
import com.openlap.visualization_methods.repositories.VisualizationLibraryRepository;
import com.openlap.visualization_methods.repositories.VisualizationTypeRepository;
import com.openlap.visualization_methods.services.VisualizationMethodUtilityService;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import org.junit.Test;

/** Editor library list hides disabled libraries; legacy (null) flag reads as enabled. */
public class VisualizationLibrarySoftDisableTest {

  private final VisualizationLibraryRepository libraryRepository =
      mock(VisualizationLibraryRepository.class);
  private final VisualizationMethodUtilityService utilityService =
      mock(VisualizationMethodUtilityService.class);
  private final VisualizationTypeRepository typeRepository =
      mock(VisualizationTypeRepository.class);
  private final VisualizationLibraryServiceImpl service =
      new VisualizationLibraryServiceImpl(libraryRepository, utilityService, typeRepository);

  private static VisLibrary library(String id, Boolean enabled) {
    VisLibrary library = new VisLibrary();
    library.setId(id);
    library.setCreator("creator");
    library.setName("name-" + id);
    library.setDescription("desc");
    library.setEnabled(enabled);
    return library;
  }

  @Test
  public void editorListHidesDisabledLibrariesAndTreatsNullAsEnabled() {
    when(libraryRepository.findAll())
        .thenReturn(
            Arrays.asList(library("L1", true), library("L2", false), library("L3", null)));

    List<String> ids =
        service.getAllVisualizationLibraries().stream()
            .map(VisualizationLibraryResponse::getId)
            .collect(Collectors.toList());

    assertThat(ids).containsExactlyInAnyOrder("L1", "L3"); // L3 = legacy doc (null flag)
    assertThat(ids).doesNotContain("L2");
  }
}
