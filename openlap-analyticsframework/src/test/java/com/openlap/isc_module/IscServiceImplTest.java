package com.openlap.isc_module;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.openlap.analytics_module.exceptions.indicator.IndicatorManipulationNotAllowed;
import com.openlap.analytics_module.exceptions.indicator.IndicatorNotFoundException;
import com.openlap.isc_module.dto.request.IscDraftRequest;
import com.openlap.isc_module.dto.request.IscRequest;
import com.openlap.isc_module.dto.response.ISCResponse;
import com.openlap.isc_module.dto.response.IscMutationResponse;
import com.openlap.isc_module.entities.IndicatorSpecificationCard;
import com.openlap.isc_module.entities.IscStatus;
import com.openlap.isc_module.repositories.IscRepository;
import com.openlap.isc_module.services.impl.IscServiceImpl;
import com.openlap.user.entities.User;
import com.openlap.user.services.TokenService;
import java.time.LocalDateTime;
import java.util.Optional;
import javax.servlet.http.HttpServletRequest;
import org.junit.Before;
import org.junit.Test;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;

/**
 * Unit tests for {@link IscServiceImpl} — pure Mockito, no Spring context and no MongoDB. The
 * repository / token service / Mongo template are mocked. A valid 24-hex ObjectId is used for the
 * owner so the Mongo {@code Criteria} on {@code createdBy.$id} can be constructed.
 */
public class IscServiceImplTest {

  private static final String OWNER_ID = "5f1d7a2e9b3c4a1d2e3f4a5b";
  private static final String OTHER_ID = "5f1d7a2e9b3c4a1d2e3f4a5c";

  private IscRepository iscRepository;
  private TokenService tokenService;
  private MongoTemplate mongoTemplate;
  private IscServiceImpl service;
  private HttpServletRequest request;

  @Before
  public void setUp() {
    iscRepository = mock(IscRepository.class);
    tokenService = mock(TokenService.class);
    mongoTemplate = mock(MongoTemplate.class);
    service = new IscServiceImpl(iscRepository, tokenService, mongoTemplate);
    request = mock(HttpServletRequest.class);

    User owner = new User();
    owner.setId(OWNER_ID);
    owner.setName("Owner");
    when(tokenService.getUserFromToken(request)).thenReturn(owner);
    when(iscRepository.save(any(IndicatorSpecificationCard.class)))
        .thenAnswer(inv -> inv.getArgument(0));
  }

  private User otherUser() {
    User u = new User();
    u.setId(OTHER_ID);
    u.setName("Intruder");
    return u;
  }

  private IscRequest req(String name) {
    return new IscRequest(
        "{\"indicatorName\":\"" + name + "\"}",
        "{\"rows\":[{}],\"columns\":[{}]}",
        "{\"chart\":{\"type\":\"Bar chart\"}}",
        "{}");
  }

  private IndicatorSpecificationCard ownedCard(String id, IscStatus status, String sourceId) {
    User owner = new User();
    owner.setId(OWNER_ID);
    return IndicatorSpecificationCard.builder()
        .id(id)
        .requirements("{\"indicatorName\":\"Existing\"}")
        .dataset("{\"rows\":[{}],\"columns\":[{}]}")
        .visRef("{\"chart\":{\"type\":\"Bar chart\"}}")
        .lockedStep("{}")
        .createdBy(owner)
        .createdOn(LocalDateTime.of(2020, 1, 1, 0, 0))
        .updatedOn(LocalDateTime.of(2020, 1, 1, 0, 0))
        .status(status)
        .sourceId(sourceId)
        .indicatorName("Existing")
        .build();
  }

  // ---- create ----

  @Test
  public void createReturnsIdAndStatusSaved() {
    when(iscRepository.save(any()))
        .thenAnswer(
            inv -> {
              IndicatorSpecificationCard c = inv.getArgument(0);
              c.setId("new-id");
              return c;
            });

    IscMutationResponse res = service.createIsc(request, req("My ISC"));

    assertThat(res.getId()).isEqualTo("new-id");
    assertThat(res.getStatus()).isEqualTo(IscStatus.SAVED);
  }

  // ---- update preserves createdOn, bumps updatedOn, owner-checked ----

  @Test
  public void updatePreservesCreatedOnAndBumpsUpdatedOn() {
    IndicatorSpecificationCard existing = ownedCard("isc-1", IscStatus.SAVED, null);
    LocalDateTime originalCreatedOn = existing.getCreatedOn();
    when(iscRepository.findById("isc-1")).thenReturn(Optional.of(existing));

    service.updateIsc(request, "isc-1", req("Renamed"));

    assertThat(existing.getCreatedOn()).isEqualTo(originalCreatedOn);
    assertThat(existing.getUpdatedOn()).isAfter(originalCreatedOn);
    assertThat(existing.getIndicatorName()).isEqualTo("Renamed");
    verify(iscRepository).save(existing);
  }

  @Test
  public void updateByNonOwnerIsRejected() {
    when(tokenService.getUserFromToken(request)).thenReturn(otherUser());
    when(iscRepository.findById("isc-1"))
        .thenReturn(Optional.of(ownedCard("isc-1", IscStatus.SAVED, null)));

    assertThatThrownBy(() -> service.updateIsc(request, "isc-1", req("x")))
        .isInstanceOf(IndicatorManipulationNotAllowed.class);
    verify(iscRepository, never()).save(any());
  }

  @Test
  public void updateMissingThrowsNotFound() {
    when(iscRepository.findById("nope")).thenReturn(Optional.empty());
    assertThatThrownBy(() -> service.updateIsc(request, "nope", req("x")))
        .isInstanceOf(IndicatorNotFoundException.class);
  }

  // ---- getById owner check + legacy status ----

  @Test
  public void getByIdRejectsNonOwner() {
    when(tokenService.getUserFromToken(request)).thenReturn(otherUser());
    when(iscRepository.findById("isc-1"))
        .thenReturn(Optional.of(ownedCard("isc-1", IscStatus.SAVED, null)));

    assertThatThrownBy(() -> service.getISCById(request, "isc-1"))
        .isInstanceOf(IndicatorManipulationNotAllowed.class);
  }

  @Test
  public void getByIdTreatsMissingStatusAsSaved() {
    when(iscRepository.findById("legacy"))
        .thenReturn(Optional.of(ownedCard("legacy", null, null)));

    ISCResponse res = service.getISCById(request, "legacy");

    assertThat(res.getStatus()).isEqualTo(IscStatus.SAVED);
  }

  // ---- draft create / autosave ----

  @Test
  public void createDraftProducesDraftWithNullSource() {
    when(iscRepository.save(any()))
        .thenAnswer(
            inv -> {
              IndicatorSpecificationCard c = inv.getArgument(0);
              c.setId("draft-1");
              return c;
            });

    IscMutationResponse res =
        service.createDraft(request, new IscDraftRequest(null, null, null, null));

    assertThat(res.getId()).isEqualTo("draft-1");
    assertThat(res.getStatus()).isEqualTo(IscStatus.DRAFT);
  }

  @Test
  public void updateDraftRejectsNonDraftRow() {
    when(iscRepository.findById("isc-1"))
        .thenReturn(Optional.of(ownedCard("isc-1", IscStatus.SAVED, null)));

    assertThatThrownBy(
            () ->
                service.updateDraft(
                    request, "isc-1", new IscDraftRequest("{}", "{}", "{}", "{}")))
        .isInstanceOf(IndicatorManipulationNotAllowed.class);
  }

  // ---- publish ----

  @Test
  public void publishNewDraftBecomesSavedInPlace() {
    IndicatorSpecificationCard draft = ownedCard("draft-1", IscStatus.DRAFT, null);
    when(iscRepository.findById("draft-1")).thenReturn(Optional.of(draft));

    IscMutationResponse res = service.publishDraft(request, "draft-1");

    assertThat(res.getId()).isEqualTo("draft-1");
    assertThat(res.getStatus()).isEqualTo(IscStatus.SAVED);
    assertThat(draft.getStatus()).isEqualTo(IscStatus.SAVED);
    verify(iscRepository, never()).delete(any());
  }

  @Test
  public void publishEditDraftMergesIntoSourceAndDeletesDraft() {
    IndicatorSpecificationCard draft = ownedCard("draft-1", IscStatus.DRAFT, "src-1");
    draft.setRequirements("{\"indicatorName\":\"Updated\"}");
    IndicatorSpecificationCard source = ownedCard("src-1", IscStatus.SAVED, null);
    when(iscRepository.findById("draft-1")).thenReturn(Optional.of(draft));
    when(iscRepository.findById("src-1")).thenReturn(Optional.of(source));

    IscMutationResponse res = service.publishDraft(request, "draft-1");

    assertThat(res.getId()).isEqualTo("src-1");
    assertThat(res.getStatus()).isEqualTo(IscStatus.SAVED);
    assertThat(source.getRequirements()).isEqualTo("{\"indicatorName\":\"Updated\"}");
    assertThat(source.getIndicatorName()).isEqualTo("Updated");
    verify(iscRepository).save(source);
    verify(iscRepository).delete(draft);
  }

  // ---- edit-draft find-or-create ----

  @Test
  public void editDraftReturnsExistingWhenPresent() {
    when(iscRepository.findById("src-1"))
        .thenReturn(Optional.of(ownedCard("src-1", IscStatus.SAVED, null)));
    when(mongoTemplate.findOne(any(Query.class), eq(IndicatorSpecificationCard.class)))
        .thenReturn(ownedCard("existing-draft", IscStatus.DRAFT, "src-1"));

    IscMutationResponse res = service.createOrFindEditDraft(request, "src-1");

    assertThat(res.getId()).isEqualTo("existing-draft");
    assertThat(res.getStatus()).isEqualTo(IscStatus.DRAFT);
    // no new row created
    verify(iscRepository, never()).save(any());
  }

  @Test
  public void editDraftCreatesWhenNoneExists() {
    when(iscRepository.findById("src-1"))
        .thenReturn(Optional.of(ownedCard("src-1", IscStatus.SAVED, null)));
    when(mongoTemplate.findOne(any(Query.class), eq(IndicatorSpecificationCard.class)))
        .thenReturn(null);
    when(iscRepository.save(any()))
        .thenAnswer(
            inv -> {
              IndicatorSpecificationCard c = inv.getArgument(0);
              c.setId("edit-draft-1");
              return c;
            });

    IscMutationResponse res = service.createOrFindEditDraft(request, "src-1");

    assertThat(res.getId()).isEqualTo("edit-draft-1");
    assertThat(res.getStatus()).isEqualTo(IscStatus.DRAFT);
  }

  @Test
  public void editDraftRejectsNonOwnerSource() {
    when(tokenService.getUserFromToken(request)).thenReturn(otherUser());
    when(iscRepository.findById("src-1"))
        .thenReturn(Optional.of(ownedCard("src-1", IscStatus.SAVED, null)));

    assertThatThrownBy(() -> service.createOrFindEditDraft(request, "src-1"))
        .isInstanceOf(IndicatorManipulationNotAllowed.class);
  }

  // ---- delete draft ----

  @Test
  public void deleteDraftRejectsSavedRow() {
    when(iscRepository.findById("isc-1"))
        .thenReturn(Optional.of(ownedCard("isc-1", IscStatus.SAVED, null)));

    assertThatThrownBy(() -> service.deleteDraft(request, "isc-1"))
        .isInstanceOf(IndicatorManipulationNotAllowed.class);
    verify(iscRepository, never()).delete(any());
  }

  @Test
  public void deleteDraftRemovesDraftRow() {
    IndicatorSpecificationCard draft = ownedCard("draft-1", IscStatus.DRAFT, null);
    when(iscRepository.findById("draft-1")).thenReturn(Optional.of(draft));

    service.deleteDraft(request, "draft-1");

    verify(iscRepository).delete(draft);
  }
}
