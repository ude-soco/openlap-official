package com.openlap.analytics_module.services;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.openlap.analytics_module.entities.Indicator;
import com.openlap.analytics_module.entities.utility_entities.*;
import com.openlap.analytics_module.exceptions.indicator.ComplexIndicatorException;
import com.openlap.analytics_module.repositories.IndicatorRepository;
import com.openlap.analytics_technique.entities.AnalyticsTechnique;
import com.openlap.user.entities.User;
import java.util.*;
import org.junit.Test;

public class ComplexIndicatorSourceGuardTest {
  private final IndicatorRepository repository = mock(IndicatorRepository.class);
  private final ComplexIndicatorSourceGuard guard = new ComplexIndicatorSourceGuard(repository, null);

  private Indicator source(String id, String owner, String methodId) {
    User user = new User(); user.setId(owner);
    AnalyticsTechnique method = new AnalyticsTechnique(); method.setId(methodId); method.setName("Same display name");
    AnalyticsTechniqueReference reference = new AnalyticsTechniqueReference(); reference.setAnalyticsTechnique(method);
    Indicator result = new Indicator(); result.setId(id); result.setCreatedBy(user);
    result.setIndicatorType(IndicatorType.BASIC); result.setAnalyticsTechniqueReference(reference);
    when(repository.findById(id)).thenReturn(Optional.of(result));
    return result;
  }

  @Test public void compositeUsesMethodIdentityRatherThanSimilarNames() {
    source("one", "owner", "method-v1"); source("two", "owner", "method-v2");
    assertThatThrownBy(() -> guard.validateForOwner("owner", List.of("one", "two"), true, true))
        .isInstanceOf(ComplexIndicatorException.class).hasMessageContaining("same analytics method");
    assertThatCode(() -> guard.validateForOwner("owner", List.of("one", "two"), false, true))
        .doesNotThrowAnyException();
  }

  @Test public void acceptsSameMethodAndAOneSourceReadPreview() {
    source("one", "owner", "method"); source("two", "owner", "method");
    guard.validateForOwner("owner", List.of("one", "two"), true, true);
    guard.validateForOwner("owner", List.of("one"), false, false);
  }

  @Test public void rejectsForeignAndNestedSourcesAtTheServerBoundary() {
    source("one", "owner", "method"); Indicator other = source("two", "someone-else", "method");
    assertThatThrownBy(() -> guard.validateForOwner("owner", List.of("one", "two"), false, true))
        .isInstanceOf(ComplexIndicatorException.class).hasMessageContaining("your own");
    other.getCreatedBy().setId("owner"); other.setIndicatorType(IndicatorType.COMPOSITE);
    assertThatThrownBy(() -> guard.validateForOwner("owner", List.of("one", "two"), false, true))
        .isInstanceOf(ComplexIndicatorException.class).hasMessageContaining("Basic sources only");
  }

  @Test public void invalidCountsAndDuplicateIdsAreRejectedBeforeDatabaseWork() {
    for (List<String> ids : List.of(List.of("one"), List.of("one", "one"),
        java.util.stream.IntStream.range(0, 11).mapToObj(String::valueOf).toList())) {
      assertThatThrownBy(() -> guard.validateForOwner("owner", ids, false, true))
          .isInstanceOf(ComplexIndicatorException.class);
    }
    verifyNoInteractions(repository);
  }

  @Test public void missingSourcesReturnAnActionableNotFound() {
    when(repository.findById("gone")).thenReturn(Optional.empty());
    assertThatThrownBy(() -> guard.validateForOwner("owner", List.of("gone"), false, false))
        .isInstanceOfSatisfying(ComplexIndicatorException.class,
            error -> assertThat(error.getStatus().value()).isEqualTo(404));
  }
}
