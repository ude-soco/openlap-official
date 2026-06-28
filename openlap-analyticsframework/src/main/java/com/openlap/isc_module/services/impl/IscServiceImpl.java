package com.openlap.isc_module.services.impl;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.openlap.analytics_module.exceptions.indicator.IndicatorManipulationNotAllowed;
import com.openlap.analytics_module.exceptions.indicator.IndicatorNotFoundException;
import com.openlap.exception.DatabaseOperationException;
import com.openlap.isc_module.dto.request.IscDraftRequest;
import com.openlap.isc_module.dto.request.IscRequest;
import com.openlap.isc_module.dto.response.ISCResponse;
import com.openlap.isc_module.dto.response.IndicatorSpecificationCardResponse;
import com.openlap.isc_module.dto.response.IscMutationResponse;
import com.openlap.isc_module.entities.IndicatorSpecificationCard;
import com.openlap.isc_module.entities.IscStatus;
import com.openlap.isc_module.repositories.IscRepository;
import com.openlap.isc_module.services.IscService;
import com.openlap.user.entities.User;
import com.openlap.user.services.TokenService;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;
import javax.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.bson.types.ObjectId;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.domain.*;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class IscServiceImpl implements IscService {

  private static final Gson GSON = new Gson();
  private static final List<String> SORTABLE_FIELDS =
      Arrays.asList("createdOn", "updatedOn", "indicatorName");

  private final IscRepository iscRepository;
  private final TokenService tokenService;
  private final MongoTemplate mongoTemplate;

  public IscServiceImpl(
      IscRepository iscRepository,
      TokenService tokenService,
      @Qualifier("primaryMongoTemplate") MongoTemplate mongoTemplate) {
    this.iscRepository = iscRepository;
    this.tokenService = tokenService;
    this.mongoTemplate = mongoTemplate;
  }

  // ---------------------------------------------------------------------------
  // Legacy endpoints
  // ---------------------------------------------------------------------------

  @Override
  public IscMutationResponse createIsc(HttpServletRequest request, IscRequest isc) {
    User user = tokenService.getUserFromToken(request);
    LocalDateTime now = LocalDateTime.now();
    IndicatorSpecificationCard card =
        IndicatorSpecificationCard.builder()
            .requirements(isc.getRequirements())
            .dataset(isc.getDataset())
            .visRef(isc.getVisRef())
            .lockedStep(isc.getLockedStep())
            .createdBy(user)
            .createdOn(now)
            .updatedOn(now)
            .status(IscStatus.SAVED)
            .indicatorName(extractIndicatorName(isc.getRequirements()))
            .build();
    IndicatorSpecificationCard saved = iscRepository.save(card);
    return new IscMutationResponse(saved.getId(), IscStatus.SAVED);
  }

  @Override
  public void updateIsc(HttpServletRequest request, String iscId, IscRequest isc) {
    User user = tokenService.getUserFromToken(request);
    IndicatorSpecificationCard found = findOwnedOrThrow(iscId, user);
    found.setRequirements(isc.getRequirements());
    found.setDataset(isc.getDataset());
    found.setVisRef(isc.getVisRef());
    found.setLockedStep(isc.getLockedStep());
    found.setIndicatorName(extractIndicatorName(isc.getRequirements()));
    // Preserve createdOn (previously this was incorrectly reset); bump updatedOn.
    found.setUpdatedOn(LocalDateTime.now());
    found.setStatus(IscStatus.SAVED);
    iscRepository.save(found);
  }

  @Override
  public ISCResponse getISCById(HttpServletRequest request, String iscId) {
    User user = tokenService.getUserFromToken(request);
    IndicatorSpecificationCard isc = findOwnedOrThrow(iscId, user);
    return ISCResponse.builder()
        .id(isc.getId())
        .requirements(isc.getRequirements())
        .dataset(isc.getDataset())
        .visRef(isc.getVisRef())
        .lockedStep(isc.getLockedStep())
        .createdBy(isc.getCreatedBy() != null ? isc.getCreatedBy().getName() : null)
        .createdOn(isc.getCreatedOn())
        .updatedOn(isc.getUpdatedOn())
        .status(effectiveStatus(isc))
        .sourceId(isc.getSourceId())
        .build();
  }

  @Override
  public void deleteISCbyId(HttpServletRequest request, String iscId) {
    User user = tokenService.getUserFromToken(request);
    try {
      Optional<IndicatorSpecificationCard> found = iscRepository.findById(iscId);
      if (found.isPresent()) {
        assertOwner(found.get(), user);
        iscRepository.delete(found.get());
        log.info("Successfully deleted an indicator");
      }
    } catch (IndicatorManipulationNotAllowed e) {
      throw e;
    } catch (Exception e) {
      throw new DatabaseOperationException("Could not access database to delete the indicator", e);
    }
  }

  @Override
  public Page<IndicatorSpecificationCardResponse> getAllMyISCs(
      HttpServletRequest request,
      int page,
      int size,
      String sortBy,
      String sortDirection,
      String status,
      String search) {
    User user = tokenService.getUserFromToken(request);
    log.info("Looking up indicators for user '{}'", user.getName());

    String sortField = SORTABLE_FIELDS.contains(sortBy) ? sortBy : "createdOn";
    Sort sort =
        sortDirection != null && sortDirection.equalsIgnoreCase(Sort.Direction.ASC.name())
            ? Sort.by(sortField).ascending()
            : Sort.by(sortField).descending();
    Pageable pageable = PageRequest.of(page, size, sort);

    try {
      Criteria criteria = Criteria.where("createdBy.$id").is(new ObjectId(user.getId()));
      applyStatusFilter(criteria, status);
      if (search != null && !search.trim().isEmpty()) {
        criteria = criteria.and("indicatorName").regex(Pattern.quote(search.trim()), "i");
      }
      Query query = new Query(criteria);
      long total = mongoTemplate.count(query, IndicatorSpecificationCard.class);
      List<IndicatorSpecificationCard> rows =
          mongoTemplate.find(query.with(pageable), IndicatorSpecificationCard.class);
      return new PageImpl<>(toListResponses(rows), pageable, total);
    } catch (Exception e) {
      throw new DatabaseOperationException("Could not access database to access indicators", e);
    }
  }

  // ---------------------------------------------------------------------------
  // Draft lifecycle
  // ---------------------------------------------------------------------------

  @Override
  public IscMutationResponse createDraft(HttpServletRequest request, IscDraftRequest draft) {
    User user = tokenService.getUserFromToken(request);
    LocalDateTime now = LocalDateTime.now();
    IndicatorSpecificationCard card =
        IndicatorSpecificationCard.builder()
            .requirements(draft.getRequirements())
            .dataset(draft.getDataset())
            .visRef(draft.getVisRef())
            .lockedStep(draft.getLockedStep())
            .createdBy(user)
            .createdOn(now)
            .updatedOn(now)
            .status(IscStatus.DRAFT)
            .sourceId(null)
            .indicatorName(extractIndicatorName(draft.getRequirements()))
            .build();
    IndicatorSpecificationCard saved = iscRepository.save(card);
    return new IscMutationResponse(saved.getId(), IscStatus.DRAFT);
  }

  @Override
  public void updateDraft(HttpServletRequest request, String draftId, IscDraftRequest draft) {
    User user = tokenService.getUserFromToken(request);
    IndicatorSpecificationCard found = findOwnedOrThrow(draftId, user);
    if (effectiveStatus(found) != IscStatus.DRAFT) {
      throw new IndicatorManipulationNotAllowed(
          "ISC '" + draftId + "' is not a draft and cannot be autosaved");
    }
    found.setRequirements(draft.getRequirements());
    found.setDataset(draft.getDataset());
    found.setVisRef(draft.getVisRef());
    found.setLockedStep(draft.getLockedStep());
    found.setIndicatorName(extractIndicatorName(draft.getRequirements()));
    found.setUpdatedOn(LocalDateTime.now());
    iscRepository.save(found);
  }

  @Override
  public IscMutationResponse createOrFindEditDraft(HttpServletRequest request, String sourceId) {
    User user = tokenService.getUserFromToken(request);
    IndicatorSpecificationCard source = findOwnedOrThrow(sourceId, user);

    // Find-or-create: one active edit draft per (user, source).
    Query existingQuery =
        new Query(
            Criteria.where("createdBy.$id")
                .is(new ObjectId(user.getId()))
                .and("sourceId")
                .is(sourceId)
                .and("status")
                .is(IscStatus.DRAFT));
    IndicatorSpecificationCard existing =
        mongoTemplate.findOne(existingQuery, IndicatorSpecificationCard.class);
    if (existing != null) {
      return new IscMutationResponse(existing.getId(), IscStatus.DRAFT);
    }

    LocalDateTime now = LocalDateTime.now();
    IndicatorSpecificationCard editDraft =
        IndicatorSpecificationCard.builder()
            .requirements(source.getRequirements())
            .dataset(source.getDataset())
            .visRef(source.getVisRef())
            .lockedStep(source.getLockedStep())
            .createdBy(user)
            .createdOn(now)
            .updatedOn(now)
            .status(IscStatus.DRAFT)
            .sourceId(sourceId)
            .indicatorName(
                source.getIndicatorName() != null
                    ? source.getIndicatorName()
                    : extractIndicatorName(source.getRequirements()))
            .build();
    IndicatorSpecificationCard saved = iscRepository.save(editDraft);
    return new IscMutationResponse(saved.getId(), IscStatus.DRAFT);
  }

  @Override
  public IscMutationResponse publishDraft(HttpServletRequest request, String draftId) {
    User user = tokenService.getUserFromToken(request);
    IndicatorSpecificationCard draft = findOwnedOrThrow(draftId, user);
    if (effectiveStatus(draft) != IscStatus.DRAFT) {
      throw new IndicatorManipulationNotAllowed("ISC '" + draftId + "' is not a draft");
    }
    LocalDateTime now = LocalDateTime.now();

    if (draft.getSourceId() == null) {
      // New draft → becomes SAVED in place.
      draft.setStatus(IscStatus.SAVED);
      draft.setUpdatedOn(now);
      draft.setIndicatorName(extractIndicatorName(draft.getRequirements()));
      IndicatorSpecificationCard saved = iscRepository.save(draft);
      return new IscMutationResponse(saved.getId(), IscStatus.SAVED);
    }

    // Edit draft → merge content into the source SAVED ISC, then remove the draft.
    IndicatorSpecificationCard source = findOwnedOrThrow(draft.getSourceId(), user);
    source.setRequirements(draft.getRequirements());
    source.setDataset(draft.getDataset());
    source.setVisRef(draft.getVisRef());
    source.setLockedStep(draft.getLockedStep());
    source.setIndicatorName(extractIndicatorName(draft.getRequirements()));
    source.setStatus(IscStatus.SAVED);
    source.setUpdatedOn(now);
    iscRepository.save(source);
    iscRepository.delete(draft);
    return new IscMutationResponse(source.getId(), IscStatus.SAVED);
  }

  @Override
  public void deleteDraft(HttpServletRequest request, String draftId) {
    User user = tokenService.getUserFromToken(request);
    IndicatorSpecificationCard draft = findOwnedOrThrow(draftId, user);
    if (effectiveStatus(draft) != IscStatus.DRAFT) {
      throw new IndicatorManipulationNotAllowed(
          "ISC '" + draftId + "' is not a draft and cannot be discarded here");
    }
    iscRepository.delete(draft);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** Missing status (legacy documents) is treated as SAVED. */
  private IscStatus effectiveStatus(IndicatorSpecificationCard isc) {
    return isc.getStatus() == null ? IscStatus.SAVED : isc.getStatus();
  }

  private IndicatorSpecificationCard findOwnedOrThrow(String iscId, User user) {
    Optional<IndicatorSpecificationCard> found = iscRepository.findById(iscId);
    if (!found.isPresent()) {
      throw new IndicatorNotFoundException("Indicator with id '" + iscId + "' not found");
    }
    assertOwner(found.get(), user);
    return found.get();
  }

  private void assertOwner(IndicatorSpecificationCard isc, User user) {
    if (isc.getCreatedBy() == null
        || user == null
        || !isc.getCreatedBy().getId().equals(user.getId())) {
      throw new IndicatorManipulationNotAllowed(
          "You do not have the permission to access this ISC");
    }
  }

  private void applyStatusFilter(Criteria criteria, String status) {
    if (status == null || status.trim().isEmpty() || status.equalsIgnoreCase("all")) {
      return;
    }
    if (status.equalsIgnoreCase(IscStatus.SAVED.name())) {
      // Include legacy rows with no status field (treated as SAVED).
      criteria.and("status").in(IscStatus.SAVED, null);
    } else if (status.equalsIgnoreCase(IscStatus.DRAFT.name())) {
      criteria.and("status").is(IscStatus.DRAFT);
    }
  }

  private List<IndicatorSpecificationCardResponse> toListResponses(
      List<IndicatorSpecificationCard> rows) {
    List<IndicatorSpecificationCardResponse> responses = new ArrayList<>();
    for (IndicatorSpecificationCard isc : rows) {
      IscStatus status = effectiveStatus(isc);
      String name =
          isc.getIndicatorName() != null
              ? isc.getIndicatorName()
              : extractIndicatorName(isc.getRequirements());
      int[] size = deriveDatasetSize(isc.getDataset());
      responses.add(
          IndicatorSpecificationCardResponse.builder()
              .id(isc.getId())
              .indicatorName(name)
              .createdBy(isc.getCreatedBy() != null ? isc.getCreatedBy().getName() : null)
              .createdOn(isc.getCreatedOn())
              .updatedOn(isc.getUpdatedOn())
              .status(status)
              .draftKind(draftKind(status, isc.getSourceId()))
              .sourceId(isc.getSourceId())
              .visualizationType(deriveVisualizationType(isc.getVisRef()))
              .datasetRows(size == null ? null : size[0])
              .datasetColumns(size == null ? null : size[1])
              .build());
    }
    return responses;
  }

  private String draftKind(IscStatus status, String sourceId) {
    if (status != IscStatus.DRAFT) {
      return null;
    }
    return sourceId != null ? "EDIT_DRAFT" : "NEW_DRAFT";
  }

  /** Safe extraction of indicatorName from the requirements JSON; "" if absent/invalid. */
  private String extractIndicatorName(String requirementsJson) {
    if (requirementsJson == null || requirementsJson.trim().isEmpty()) {
      return "";
    }
    try {
      JsonObject obj = GSON.fromJson(requirementsJson, JsonObject.class);
      if (obj != null && obj.has("indicatorName") && !obj.get("indicatorName").isJsonNull()) {
        return obj.get("indicatorName").getAsString();
      }
    } catch (Exception e) {
      log.debug("Could not parse indicatorName from requirements", e);
    }
    return "";
  }

  /** Safe extraction of visRef.chart.type; null if not derivable. */
  private String deriveVisualizationType(String visRefJson) {
    if (visRefJson == null || visRefJson.trim().isEmpty()) {
      return null;
    }
    try {
      JsonObject obj = GSON.fromJson(visRefJson, JsonObject.class);
      if (obj != null && obj.has("chart") && obj.get("chart").isJsonObject()) {
        JsonObject chart = obj.getAsJsonObject("chart");
        if (chart.has("type") && !chart.get("type").isJsonNull()) {
          String type = chart.get("type").getAsString();
          return type.isEmpty() ? null : type;
        }
      }
    } catch (Exception e) {
      log.debug("Could not parse visualization type from visRef", e);
    }
    return null;
  }

  /** Safe extraction of [rows, columns] from the dataset JSON; null if not derivable. */
  private int[] deriveDatasetSize(String datasetJson) {
    if (datasetJson == null || datasetJson.trim().isEmpty()) {
      return null;
    }
    try {
      JsonObject obj = GSON.fromJson(datasetJson, JsonObject.class);
      if (obj == null) {
        return null;
      }
      Integer rows = arraySize(obj, "rows");
      Integer cols = arraySize(obj, "columns");
      if (rows == null && cols == null) {
        return null;
      }
      return new int[] {rows == null ? 0 : rows, cols == null ? 0 : cols};
    } catch (Exception e) {
      log.debug("Could not parse dataset size from dataset", e);
    }
    return null;
  }

  private Integer arraySize(JsonObject obj, String key) {
    if (obj.has(key) && obj.get(key).isJsonArray()) {
      JsonArray arr = obj.getAsJsonArray(key);
      return arr.size();
    }
    return null;
  }
}
