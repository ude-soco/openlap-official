package com.openlap.plugins;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.openlap.analytics_technique.entities.AnalyticsTechnique;
import com.openlap.analytics_technique.repositories.AnalyticsTechniqueRepository;
import com.openlap.analytics_technique.services.impl.AnalyticsTechniqueServiceImpl;
import com.openlap.plugins.artifacts.PluginArtifactResolver;
import com.openlap.plugins.management.PluginCatalogVisibility;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;
import org.springframework.test.util.ReflectionTestUtils;

/** Local manual installation must discover supported plugins outside the old prototype namespace. */
public class AnalyticsTechniqueDiscoveryTest {
  @Rule public TemporaryFolder temporary = new TemporaryFolder();

  @Test public void manualJarCopyIsDiscoveredOnceAndNonJarFilesAreIgnored() throws Exception {
    Path folder = temporary.newFolder("analytics").toPath();
    Path jar = ManagedPluginFixture.create(folder, "General", false);
    Files.copy(jar, folder.resolve("second-copy.jar"));
    Files.writeString(folder.resolve(".gitkeep"), "");
    Files.writeString(folder.resolve("notes.txt"), "This is not a plugin.");
    List<AnalyticsTechnique> installed = new ArrayList<>();
    AnalyticsTechniqueRepository repository = mock(AnalyticsTechniqueRepository.class);
    when(repository.findAll()).thenAnswer(call -> new ArrayList<>(installed));
    when(repository.saveAll(any())).thenAnswer(call -> {
      Iterable<AnalyticsTechnique> entries = call.getArgument(0);
      entries.forEach(installed::add);
      return new ArrayList<>(installed);
    });
    AnalyticsTechniqueServiceImpl service = new AnalyticsTechniqueServiceImpl(repository,
        PluginArtifactResolver.local(), PluginCatalogVisibility.legacyOnly());
    ReflectionTestUtils.setField(service, "analyticsMethodsJarsFolder", folder.toString());

    assertThat(service.populateAnalyticsTechniques()).isTrue();
    assertThat(service.populateAnalyticsTechniques()).isTrue();

    assertThat(installed).hasSize(1);
    assertThat(installed.get(0).getImplementingClass()).isEqualTo("managedfixture.ManagedAnalyticsGeneral");
    assertThat(installed.get(0).getName()).isEqualTo("Method General");
    assertThat(installed.get(0).getFileName()).isEqualTo(jar.toString());
    assertThat(installed.get(0).isEnabled()).isTrue();
    System.clearProperty("openlap.fixture.inspected");
  }
}
