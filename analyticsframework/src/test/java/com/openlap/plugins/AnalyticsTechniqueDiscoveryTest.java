package com.openlap.plugins;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.openlap.analytics_technique.entities.AnalyticsTechnique;
import com.openlap.analytics_module.entities.utility_entities.IndicatorType;
import com.openlap.analytics_technique.repositories.AnalyticsTechniqueRepository;
import com.openlap.analytics_technique.services.impl.AnalyticsTechniqueServiceImpl;
import com.openlap.plugins.artifacts.PluginArtifactResolver;
import com.openlap.plugins.management.PluginCatalogVisibility;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;
import org.bson.Document;
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
    assertThat(service.getAllAnalyticsTechniques().get(0).getRecommendedFor()).isEmpty();
    System.clearProperty("openlap.fixture.inspected");
  }

  @Test public void metadataRefreshUsesOnlyTheOriginalUnmigratedLocalPath() throws Exception {
    Path folder = temporary.newFolder("local").toPath();
    Path staging = temporary.newFolder("staging").toPath();
    String suffix = "Metadata";
    Path legacy = ManagedPluginFixture.create(folder, suffix, false);
    Path newVersion = ManagedPluginFixture.withAnalyticsManifest(
        ManagedPluginFixture.create(staging, suffix, false, "new"), suffix, "MULTI_LEVEL");
    Path duplicate = Files.copy(newVersion, folder.resolve("duplicate.jar"));
    var existing = new AnalyticsTechnique();
    existing.setId("registered");
    existing.setFileName(legacy.toString());
    existing.setName("Admin edit");
    existing.setImplementingClass("managedfixture.ManagedAnalyticsMetadata");
    var repository = mock(AnalyticsTechniqueRepository.class);
    when(repository.findAll()).thenReturn(List.of(existing));
    var service = new AnalyticsTechniqueServiceImpl(repository, PluginArtifactResolver.local(), PluginCatalogVisibility.legacyOnly());
    ReflectionTestUtils.setField(service, "analyticsMethodsJarsFolder", folder.toString());

    service.populateAnalyticsTechniques();
    assertThat(service.getAllAnalyticsTechniques().get(0).getMetadata()).isNull();
    Files.copy(duplicate, legacy, StandardCopyOption.REPLACE_EXISTING);
    service.populateAnalyticsTechniques();
    Document metadata = new Document("recommendedFor", List.of("MULTI_LEVEL"));
    verify(repository).refreshLocalMetadata("registered", legacy.toString(), existing.getImplementingClass(), metadata);
    assertThat(service.getAllAnalyticsTechniques()).singleElement().satisfies(method -> {
      assertThat(method.getId()).isEqualTo("registered");
      assertThat(method.getName()).isEqualTo("Admin edit");
      assertThat(method.getRecommendedFor()).containsExactly(IndicatorType.MULTI_LEVEL);
    });
    System.clearProperty("openlap.fixture.inspected");
  }
}
