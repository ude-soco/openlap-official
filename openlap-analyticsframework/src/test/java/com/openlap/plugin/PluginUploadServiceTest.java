package com.openlap.plugin;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.openlap.AnalyticsMethods.Prototypes.UploadFixtureAnalyticsMethod;
import com.openlap.analytics_technique.entities.AnalyticsTechnique;
import com.openlap.analytics_technique.repositories.AnalyticsTechniqueRepository;
import com.openlap.analytics_technique.services.impl.AnalyticsTechniqueServiceImpl;
import com.openlap.exception.InvalidPluginException;
import com.openlap.visualization_methods.entities.VisLibrary;
import com.openlap.visualization_methods.entities.VisType;
import com.openlap.visualization_methods.repositories.VisualizationLibraryRepository;
import com.openlap.visualization_methods.repositories.VisualizationTypeRepository;
import com.openlap.visualization_methods.services.impl.VisualizationMethodUtilityServiceImpl;
import java.io.File;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.jar.JarEntry;
import java.util.jar.JarOutputStream;
import openlap.visualizer.UploadFixtureDataTransformer;
import openlap.visualizer.UploadFixtureVisualization;
import openlap.visualizer.UploadFixtureVisualizationLibrary;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

public class PluginUploadServiceTest {

  @Rule public TemporaryFolder temporaryFolder = new TemporaryFolder();

  @Test
  public void validAnalyticsPluginUploadRegistersMethod() throws Exception {
    File analyticsFolder = temporaryFolder.newFolder("analytics-jars");
    Path jarPath =
        jarWithClasses("valid-analytics-plugin.jar", UploadFixtureAnalyticsMethod.class);
    AnalyticsTechniqueRepository repository = mock(AnalyticsTechniqueRepository.class);
    when(repository.findAll()).thenReturn(Collections.emptyList());
    AnalyticsTechniqueServiceImpl service = analyticsService(repository, analyticsFolder);

    service.uploadAnalyticsTechniqueFile(multipartFile(jarPath));

    List<AnalyticsTechnique> savedTechniques = capturedIterable(repository);
    assertEquals(1, savedTechniques.size());
    assertEquals("Upload Fixture Analytics Method", savedTechniques.get(0).getName());
    assertEquals("upload-fixture", savedTechniques.get(0).getType());
    assertTrue(new File(analyticsFolder, jarPath.getFileName().toString()).exists());
  }

  @Test
  public void invalidAnalyticsPluginUploadThrowsInvalidPluginException() throws Exception {
    File analyticsFolder = temporaryFolder.newFolder("invalid-analytics-jars");
    Path invalidJar = invalidJar("invalid-analytics-plugin.jar");
    AnalyticsTechniqueRepository repository = mock(AnalyticsTechniqueRepository.class);
    when(repository.findAll()).thenReturn(Collections.emptyList());
    AnalyticsTechniqueServiceImpl service = analyticsService(repository, analyticsFolder);

    try {
      service.uploadAnalyticsTechniqueFile(multipartFile(invalidJar));
      fail("Expected invalid analytics plugin upload to fail.");
    } catch (InvalidPluginException exception) {
      assertTrue(exception.getMessage().contains("no valid analytics methods were found"));
    }

    verify(repository, never()).saveAll(any());
    assertTrue(new File(analyticsFolder, invalidJar.getFileName().toString()).exists());
  }

  @Test
  public void validVisualizationPluginUploadRegistersLibraryAndType() throws Exception {
    File visualizationFolder = temporaryFolder.newFolder("visualization-jars");
    Path jarPath =
        jarWithClasses(
            "valid-visualization-plugin.jar",
            UploadFixtureVisualizationLibrary.class,
            UploadFixtureVisualization.class,
            UploadFixtureDataTransformer.class);
    VisualizationLibraryRepository libraryRepository = mock(VisualizationLibraryRepository.class);
    VisualizationTypeRepository typeRepository = mock(VisualizationTypeRepository.class);
    when(libraryRepository.findAll()).thenReturn(Collections.emptyList());
    when(typeRepository.findAll()).thenReturn(Collections.emptyList());
    when(libraryRepository.save(any(VisLibrary.class))).thenAnswer(invocation -> invocation.getArgument(0));
    VisualizationMethodUtilityServiceImpl service =
        visualizationService(libraryRepository, typeRepository, visualizationFolder);

    service.uploadVisualizationMethodFile(multipartFile(jarPath));

    ArgumentCaptor<VisLibrary> libraryCaptor = ArgumentCaptor.forClass(VisLibrary.class);
    verify(libraryRepository, atLeastOnce()).save(libraryCaptor.capture());
    assertEquals("Upload Fixture Visualization Library", libraryCaptor.getAllValues().get(0).getName());

    List<VisType> savedTypes = capturedIterable(typeRepository);
    assertEquals(1, savedTypes.size());
    assertEquals("Upload Fixture Visualization", savedTypes.get(0).getName());
    assertTrue(new File(visualizationFolder, jarPath.getFileName().toString()).exists());
  }

  @Test
  public void invalidVisualizationPluginUploadThrowsInvalidPluginException() throws Exception {
    File visualizationFolder = temporaryFolder.newFolder("invalid-visualization-jars");
    Path invalidJar = invalidJar("invalid-visualization-plugin.jar");
    VisualizationLibraryRepository libraryRepository = mock(VisualizationLibraryRepository.class);
    VisualizationTypeRepository typeRepository = mock(VisualizationTypeRepository.class);
    when(libraryRepository.findAll()).thenReturn(Collections.emptyList());
    when(typeRepository.findAll()).thenReturn(Collections.emptyList());
    VisualizationMethodUtilityServiceImpl service =
        visualizationService(libraryRepository, typeRepository, visualizationFolder);

    try {
      service.uploadVisualizationMethodFile(multipartFile(invalidJar));
      fail("Expected invalid visualization plugin upload to fail.");
    } catch (InvalidPluginException exception) {
      assertTrue(exception.getMessage().contains("no valid visualization plugin was found"));
    }

    verify(libraryRepository, never()).save(any(VisLibrary.class));
    verify(typeRepository, never()).saveAll(any());
    assertTrue(new File(visualizationFolder, invalidJar.getFileName().toString()).exists());
  }

  private AnalyticsTechniqueServiceImpl analyticsService(
      AnalyticsTechniqueRepository repository, File analyticsFolder) {
    AnalyticsTechniqueServiceImpl service = new AnalyticsTechniqueServiceImpl(repository);
    ReflectionTestUtils.setField(
        service, "analyticsMethodsJarsFolder", analyticsFolder.getAbsolutePath() + File.separator);
    ReflectionTestUtils.setField(
        service, "analyticsMethodsClassDirectory", "com.openlap.AnalyticsMethods.Prototypes");
    return service;
  }

  private VisualizationMethodUtilityServiceImpl visualizationService(
      VisualizationLibraryRepository libraryRepository,
      VisualizationTypeRepository typeRepository,
      File visualizationFolder) {
    VisualizationMethodUtilityServiceImpl service =
        new VisualizationMethodUtilityServiceImpl(typeRepository, libraryRepository);
    ReflectionTestUtils.setField(
        service, "visualizerJarsFolder", visualizationFolder.getAbsolutePath() + File.separator);
    ReflectionTestUtils.setField(service, "visualizerClassDirectory", "openlap.visualizer");
    return service;
  }

  private MockMultipartFile multipartFile(Path path) throws Exception {
    return new MockMultipartFile(
        "file",
        path.getFileName().toString(),
        "application/java-archive",
        Files.readAllBytes(path));
  }

  private Path invalidJar(String fileName) throws Exception {
    Path path = temporaryFolder.newFile(fileName).toPath();
    Files.write(path, "not a valid jar".getBytes("UTF-8"));
    return path;
  }

  private Path jarWithClasses(String jarName, Class<?>... classes) throws Exception {
    Path jarPath = temporaryFolder.newFile(jarName).toPath();
    try (JarOutputStream jarOutputStream = new JarOutputStream(Files.newOutputStream(jarPath))) {
      for (Class<?> type : classes) {
        String entryName = type.getName().replace('.', '/') + ".class";
        URL classResource = type.getClassLoader().getResource(entryName);
        if (classResource == null) {
          throw new IllegalStateException("Could not find class resource " + entryName);
        }
        jarOutputStream.putNextEntry(new JarEntry(entryName));
        Files.copy(Paths.get(classResource.toURI()), jarOutputStream);
        jarOutputStream.closeEntry();
      }
    }
    return jarPath;
  }

  @SuppressWarnings({"rawtypes", "unchecked"})
  private <T> List<T> capturedIterable(Object repository) {
    ArgumentCaptor<Iterable> captor = ArgumentCaptor.forClass(Iterable.class);
    if (repository instanceof AnalyticsTechniqueRepository) {
      verify((AnalyticsTechniqueRepository) repository).saveAll(captor.capture());
    } else {
      verify((VisualizationTypeRepository) repository).saveAll(captor.capture());
    }
    List<T> result = new ArrayList<>();
    for (Object item : captor.getValue()) {
      @SuppressWarnings("unchecked")
      T typedItem = (T) item;
      result.add(typedItem);
    }
    return result;
  }
}
