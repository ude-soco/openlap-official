package com.openlap.analytics_module.services.impl;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.mongodb.MongoException;
import com.openlap.analytics_module.drafts.IndicatorDraftTargets;
import com.openlap.analytics_module.entities.Indicator;
import com.openlap.analytics_module.entities.utility_entities.*;
import com.openlap.analytics_module.repositories.*;
import com.openlap.analytics_module.services.*;
import com.openlap.analytics_technique.entities.AnalyticsTechnique;
import com.openlap.analytics_technique.services.AnalyticsTechniqueService;
import com.openlap.dataset.OpenLAPDataSetConfigValidationResult;
import com.openlap.infrastructure.exception.*;
import com.openlap.user.entities.User;
import com.openlap.user.services.TokenService;
import com.openlap.visualization_methods.entities.*;
import com.openlap.visualization_methods.services.VisualizationMethodUtilityService;
import java.util.Optional;
import org.bson.Document;
import org.junit.Test;
import org.mockito.InOrder;
import org.springframework.data.domain.Page;
import org.springframework.mock.web.MockHttpServletRequest;

public class LegacyIndicatorWriteRaceTest {
  @Test
  public void legacyUpdateCapturesItsOwnedSnapshotBeforeValidationAndUsesConditionalPersistence() {
    TokenService tokens = mock(TokenService.class);
    User owner = new User();
    owner.setId("owner");
    when(tokens.getUserFromToken(any())).thenReturn(owner);
    IndicatorRepository repository = mock(IndicatorRepository.class);
    IndicatorDraftTargets writes = mock(IndicatorDraftTargets.class);
    Document snapshot = new Document("_id", "saved");
    when(writes.snapshot("owner", "saved")).thenReturn(snapshot);
    AnalyticsTechniqueService analytics = mock(AnalyticsTechniqueService.class);
    VisualizationMethodUtilityService visualizations =
        mock(VisualizationMethodUtilityService.class);
    AnalyticsTechnique method = new AnalyticsTechnique();
    method.setId("method");
    when(analytics.fetchAnalyticsTechniqueMethod("method")).thenReturn(method);
    when(analytics.validateAnalyticsTechniqueMapping(eq("method"), any()))
        .thenReturn(new OpenLAPDataSetConfigValidationResult(true, "Valid"));
    when(visualizations.fetchVisualizationLibraryMethod("library")).thenReturn(new VisLibrary());
    when(visualizations.fetchVisualizationTypeMethod("chart")).thenReturn(new VisType());
    when(visualizations.validateAnalyticsTechniqueToVisualizationMapping(eq("chart"), any()))
        .thenReturn(new OpenLAPDataSetConfigValidationResult(true, "Valid"));
    IndicatorUtilityServiceImpl utility =
        new IndicatorUtilityServiceImpl(
            tokens, null, visualizations, analytics, repository, writes);
    IndicatorReference reference = new IndicatorReference();
    reference.setName("Updated");
    reference.setIndicatorType(IndicatorType.BASIC);
    reference.setAnalyticsTechniqueId("method");
    reference.setVisualizationLibraryId("library");
    reference.setVisualizationTypeId("chart");
    utility.updateIndicator(new MockHttpServletRequest(), reference, "saved");
    InOrder order = inOrder(writes, analytics);
    order.verify(writes).snapshot("owner", "saved");
    order.verify(analytics).fetchAnalyticsTechniqueMethod("method");
    order.verify(writes).updateSaved(eq("owner"), same(snapshot), any(Indicator.class));
    verify(repository, never()).save(any());
  }

  private static final String ID = "abcdef0123456789abcdef01";
  private final TokenService tokens = mock(TokenService.class);
  private final IndicatorUtilityService utility = mock(IndicatorUtilityService.class);
  private final IndicatorRepository repository = mock(IndicatorRepository.class);
  private final IndicatorCacheRepository cache = mock(IndicatorCacheRepository.class);
  private final IndicatorAnalysisCacheRepository analysisCache =
      mock(IndicatorAnalysisCacheRepository.class);
  private final ComplexIndicatorReferences references = mock(ComplexIndicatorReferences.class);
  private final MockHttpServletRequest request = new MockHttpServletRequest();
  private final Document expected = new Document("_id", ID);

  private IndicatorServiceImpl deletion() {
    User owner = new User();
    owner.setId("owner");
    when(tokens.getUserFromToken(any())).thenReturn(owner);
    Indicator source = new Indicator();
    source.setId(ID);
    source.setCreatedBy(owner);
    when(utility.snapshotIndicatorDefinition(any(), anyString())).thenReturn(expected);
    when(utility.fetchIndicatorMethod(anyString())).thenReturn(source);
    when(references.beginDelete(ID)).thenReturn("delete-token");
    when(repository.findReferencingSources(anyCollection(), any())).thenReturn(Page.empty());
    when(cache.findById(ID)).thenReturn(Optional.empty());
    when(analysisCache.findById(ID)).thenReturn(Optional.empty());
    return new IndicatorServiceImpl(
        repository,
        null,
        cache,
        tokens,
        null,
        null,
        null,
        utility,
        null,
        null,
        null,
        analysisCache,
        references);
  }

  @Test
  public void aKnownDeleteConflictReleasesOnlyItsGateAndNeverDeletesTheNewerDefinition() {
    IndicatorServiceImpl service = deletion();
    doThrow(new ConflictException("Newer source"))
        .when(utility)
        .deleteIndicatorDefinition(any(), same(expected));
    assertThatThrownBy(() -> service.deleteExistingIndicator(request, ID.toUpperCase()))
        .isInstanceOf(ConflictException.class);
    verify(references).beginDelete(ID);
    verify(references).cancelDelete(ID, "delete-token");
    verify(repository, never()).delete(any());
    verifyNoInteractions(cache, analysisCache);
  }

  @Test
  public void successfulDeleteKeepsItsTombstoneAndNeverUsesUnconditionalRepositoryDeletion() {
    IndicatorServiceImpl service = deletion();
    service.deleteExistingIndicator(request, ID.toUpperCase());
    InOrder order = inOrder(utility, references);
    order.verify(utility).snapshotIndicatorDefinition(request, ID.toUpperCase());
    order.verify(utility).fetchIndicatorMethod(ID.toUpperCase());
    order.verify(references).beginDelete(ID);
    order.verify(utility).deleteIndicatorDefinition(request, expected);
    verify(references, never()).cancelDelete(anyString(), anyString());
    verify(repository, never()).delete(any());
  }

  @Test
  public void anUncertainDeleteRetainsItsGateUntilItsOutcomeCanBeVerified() {
    IndicatorServiceImpl service = deletion();
    doThrow(new MongoException("unknown write outcome"))
        .when(utility)
        .deleteIndicatorDefinition(any(), same(expected));
    assertThatThrownBy(() -> service.deleteExistingIndicator(request, ID))
        .isInstanceOf(DatabaseOperationException.class);
    verify(references, never()).cancelDelete(anyString(), anyString());
    verify(repository, never()).delete(any());
  }
}
