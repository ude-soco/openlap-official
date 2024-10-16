package com.openlap.isc_module.services.impl;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.openlap.analytics_module.exceptions.indicator.IndicatorManipulationNotAllowed;
import com.openlap.analytics_module.exceptions.indicator.IndicatorNotFoundException;
import com.openlap.exception.DatabaseOperationException;
import com.openlap.isc_module.dto.request.IscRequest;
import com.openlap.isc_module.dto.response.ISCResponse;
import com.openlap.isc_module.dto.response.IndicatorSpecificationCardResponse;
import com.openlap.isc_module.entities.IndicatorSpecificationCard;
import com.openlap.isc_module.repositories.IscRepository;
import com.openlap.isc_module.services.IscService;
import com.openlap.user.entities.User;
import com.openlap.user.services.TokenService;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import javax.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bson.types.ObjectId;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class IscServiceImpl implements IscService {
  private final IscRepository iscRepository;
  private final TokenService tokenService;

  @Override
  public void createIsc(HttpServletRequest request, IscRequest isc) {
    User foundUser = tokenService.getUserFromToken(request);
    iscRepository.save(
        new IndicatorSpecificationCard(
            null,
            isc.getRequirements(),
            isc.getDataset(),
            isc.getVisRef(),
            isc.getLockedStep(),
            foundUser,
            LocalDateTime.now()));
  }

  @Override
  public Page<IndicatorSpecificationCardResponse> getAllMyISCs(
      HttpServletRequest request, int page, int size, String sortBy, String sortDirection) {
    User createdBy = tokenService.getUserFromToken(request);
    log.info("Looking up indicators for user '{}'", createdBy.getName());
    Sort sort =
        sortDirection.equalsIgnoreCase(Sort.Direction.ASC.name())
            ? Sort.by(sortBy).ascending()
            : Sort.by(sortBy).descending();
    Pageable pageable = PageRequest.of(page, size, sort);
    try {
      Page<IndicatorSpecificationCard> foundISCPage =
          iscRepository.findByCreatedBy_Id(new ObjectId(createdBy.getId()), pageable);
      return new PageImpl<>(
          getISCResponses(foundISCPage), pageable, foundISCPage.getTotalElements());
    } catch (Exception e) {
      throw new DatabaseOperationException("Could not access database to access indicators", e);
    }
  }

  @Override
  public ISCResponse getISCById(String iscId) {
    try {
      Optional<IndicatorSpecificationCard> foundIscId = iscRepository.findById(iscId);
      if (foundIscId.isPresent()) {
        IndicatorSpecificationCard foundIsc = foundIscId.get();
        return new ISCResponse(
            foundIsc.getId(),
            foundIsc.getRequirements(),
            foundIsc.getDataset(),
            foundIsc.getVisRef(),
            foundIsc.getLockedStep(),
            foundIsc.getCreatedBy().getName(),
            foundIsc.getCreatedOn());
      }
      throw new IndicatorNotFoundException("Indicator with id '" + iscId + "' not found");
    } catch (IndicatorNotFoundException e) {
      throw e;
    } catch (Exception e) {
      throw new DatabaseOperationException(
          "Could not access database to find the indicator with id '" + iscId + "'", e);
    }
  }

  @Override
  public void deleteISCbyId(HttpServletRequest request, String iscId) {
    User userFromToken = tokenService.getUserFromToken(request);
    Optional<IndicatorSpecificationCard> foundIscId = iscRepository.findById(iscId);
    try {
      if (foundIscId.isPresent()) {
        if (!foundIscId.get().getCreatedBy().getId().equals(userFromToken.getId())) {
          throw new IndicatorManipulationNotAllowed(
              "You do not have the permission to delete the ISC");
        }
        iscRepository.delete(foundIscId.get());
        log.info("Successfully deleted an indicator");
      }
    } catch (IndicatorManipulationNotAllowed e) {
      throw e;
    } catch (Exception e) {
      throw new DatabaseOperationException("Could not access database to delete the indicator", e);
    }
  }

  @Override
  public void updateIsc(String iscId, IscRequest isc) {
    Optional<IndicatorSpecificationCard> foundIscId = iscRepository.findById(iscId);
    if (foundIscId.isPresent()) {
      IndicatorSpecificationCard foundIsc = foundIscId.get();
      foundIsc.setRequirements(isc.getRequirements());
      foundIsc.setDataset(isc.getDataset());
      foundIsc.setVisRef(isc.getVisRef());
      foundIsc.setLockedStep(isc.getLockedStep());
      foundIsc.setCreatedBy(foundIscId.get().getCreatedBy());
      foundIsc.setCreatedOn(LocalDateTime.now());
      iscRepository.save(foundIsc);
    } else {
      throw new IndicatorNotFoundException("Indicator with id '" + iscId + "' not found");
    }
  }

  private List<IndicatorSpecificationCardResponse> getISCResponses(
      Page<IndicatorSpecificationCard> foundISCPage) {
    Gson gson = new Gson();
    List<IndicatorSpecificationCardResponse> iscResponses = new ArrayList<>();
    for (IndicatorSpecificationCard isc : foundISCPage.getContent()) {
      JsonObject requirementsJson = gson.fromJson(isc.getRequirements(), JsonObject.class);
      iscResponses.add(
          new IndicatorSpecificationCardResponse(
              isc.getId(),
              requirementsJson.get("indicatorName").getAsString(),
              isc.getCreatedBy().getName(),
              isc.getCreatedOn()));
    }
    return iscResponses;
  }
}
