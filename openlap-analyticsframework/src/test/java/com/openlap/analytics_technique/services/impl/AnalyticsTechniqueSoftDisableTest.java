package com.openlap.analytics_technique.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.openlap.analytics_technique.dto.response.AnalyticsTechniqueResponse;
import com.openlap.analytics_technique.entities.AnalyticsTechnique;
import com.openlap.analytics_technique.repositories.AnalyticsTechniqueRepository;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import org.junit.Test;

/** Editor method list hides disabled methods; by-id resolution still returns disabled methods. */
public class AnalyticsTechniqueSoftDisableTest {

  private final AnalyticsTechniqueRepository repository = mock(AnalyticsTechniqueRepository.class);
  private final AnalyticsTechniqueServiceImpl service =
      new AnalyticsTechniqueServiceImpl(repository);

  private static AnalyticsTechnique method(String id, Boolean enabled) {
    AnalyticsTechnique technique = new AnalyticsTechnique();
    technique.setId(id);
    technique.setName("name-" + id);
    technique.setDescription("desc");
    technique.setEnabled(enabled);
    return technique;
  }

  @Test
  public void editorListHidesDisabledMethodsAndTreatsNullAsEnabled() {
    when(repository.findAll())
        .thenReturn(Arrays.asList(method("M1", true), method("M2", false), method("M3", null)));

    List<String> ids =
        service.getAllAnalyticsTechniques().stream()
            .map(AnalyticsTechniqueResponse::getId)
            .collect(Collectors.toList());

    assertThat(ids).containsExactlyInAnyOrder("M1", "M3"); // M3 = legacy doc (null flag)
    assertThat(ids).doesNotContain("M2");
  }

  @Test
  public void byIdResolvesDisabledMethod() {
    when(repository.findById("M2")).thenReturn(Optional.of(method("M2", false)));

    AnalyticsTechniqueResponse response = service.getAnalyticsTechniquesById("M2");

    assertThat(response.getId()).isEqualTo("M2");
  }
}
