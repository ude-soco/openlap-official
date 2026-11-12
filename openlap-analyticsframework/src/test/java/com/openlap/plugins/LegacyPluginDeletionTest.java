package com.openlap.plugins;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.openlap.analytics_technique.controller.AnalyticsTechniqueController;
import com.openlap.analytics_technique.repositories.AnalyticsTechniqueRepository;
import com.openlap.analytics_technique.services.impl.AnalyticsTechniqueServiceImpl;
import com.openlap.infrastructure.error.ApiErrorResponseFactory;
import com.openlap.infrastructure.web.GlobalApiExceptionHandler;
import com.openlap.visualization_methods.controllers.VisualizationMethodController;
import com.openlap.visualization_methods.repositories.VisualizationLibraryRepository;
import com.openlap.visualization_methods.repositories.VisualizationTypeRepository;
import com.openlap.visualization_methods.services.impl.VisualizationLibraryServiceImpl;
import com.openlap.visualization_methods.services.impl.VisualizationMethodUtilityServiceImpl;
import com.openlap.visualization_methods.services.impl.VisualizationTypeServiceImpl;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

public class LegacyPluginDeletionTest {
  @Rule public TemporaryFolder temporary = new TemporaryFolder();

  @Test
  public void allLegacyDeleteRoutesLeaveFilesAndCatalogUntouched() throws Exception {
    AnalyticsTechniqueRepository methods = mock(AnalyticsTechniqueRepository.class);
    VisualizationLibraryRepository libraries = mock(VisualizationLibraryRepository.class);
    VisualizationTypeRepository types = mock(VisualizationTypeRepository.class);
    AnalyticsTechniqueServiceImpl analytics = new AnalyticsTechniqueServiceImpl(methods, com.openlap.plugins.artifacts.PluginArtifactResolver.local(), com.openlap.plugins.management.PluginCatalogVisibility.legacyOnly());
    VisualizationMethodUtilityServiceImpl utility =
        new VisualizationMethodUtilityServiceImpl(types, libraries, com.openlap.plugins.artifacts.PluginArtifactResolver.local(), com.openlap.plugins.management.PluginCatalogVisibility.legacyOnly());
    VisualizationLibraryServiceImpl libraryService =
        new VisualizationLibraryServiceImpl(libraries, utility, types, com.openlap.plugins.management.PluginCatalogVisibility.legacyOnly());
    VisualizationTypeServiceImpl typeService =
        new VisualizationTypeServiceImpl(types, utility, libraries, com.openlap.plugins.management.PluginCatalogVisibility.legacyOnly());
    ReflectionTestUtils.setField(analytics, "analyticsMethodsJarsFolder", temporary.getRoot().toString());
    ReflectionTestUtils.setField(utility, "visualizerJarsFolder", temporary.getRoot().toString());
    Path jar = temporary.newFile("plugin.jar").toPath();
    byte[] original = {1, 2, 3};
    Files.write(jar, original);

    MockMvc mvc = MockMvcBuilders.standaloneSetup(
        new AnalyticsTechniqueController(analytics),
        new VisualizationMethodController(typeService, libraryService, utility))
        .setControllerAdvice(new GlobalApiExceptionHandler(new ApiErrorResponseFactory(true)))
        .build();
    for (String path : new String[] {
        "/v1/analytics/methods/delete?fileName=plugin.jar",
        "/v1/analytics/methods/method-id",
        "/v1/visualizations/delete?fileName=plugin.jar",
        "/v1/visualizations/libraries/library-id",
        "/v1/visualizations/types/type-id"}) {
      mvc.perform(delete(path))
          .andExpect(status().isConflict())
          .andExpect(jsonPath("$.code").value("PLUGIN_DELETE_UNAVAILABLE"))
          .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Disable")))
          .andExpect(jsonPath("$.cause").doesNotExist());
      assertThat(Files.readAllBytes(jar)).isEqualTo(original);
    }
    verifyNoInteractions(methods, libraries, types);
  }
}
