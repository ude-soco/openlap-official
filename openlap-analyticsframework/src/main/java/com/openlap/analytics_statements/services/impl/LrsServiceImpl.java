package com.openlap.analytics_statements.services.impl;

import com.openlap.analytics_statements.dtos.request.LrsProviderRequest;
import com.openlap.analytics_statements.dtos.response.LrsStoreResponse;
import com.openlap.analytics_statements.entities.LrsClient;
import com.openlap.analytics_statements.entities.LrsRole;
import com.openlap.analytics_statements.entities.LrsStore;
import com.openlap.analytics_statements.entities.utility_entities.ClientApi;
import com.openlap.analytics_statements.exception.LrsManipulationException;
import com.openlap.analytics_statements.exception.LrsNotFoundException;
import com.openlap.analytics_statements.exception.LrsTitleAlreadyExistsException;
import com.openlap.analytics_statements.repositories.LrsClientRepository;
import com.openlap.analytics_statements.repositories.LrsRoleRepository;
import com.openlap.analytics_statements.repositories.LrsStoreRepository;
import com.openlap.analytics_statements.services.LrsService;
import com.openlap.exception.DatabaseOperationException;
import com.openlap.exception.ServiceException;
import com.openlap.user.dto.response.utils.LrsProviderResponse;
import com.openlap.user.entities.User;
import com.openlap.user.entities.utility_entities.LrsProvider;
import com.openlap.user.repositories.UserRepository;
import com.openlap.user.services.TokenService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;
import javax.servlet.http.HttpServletRequest;
import javax.transaction.Transactional;
import javax.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@Transactional
@RequiredArgsConstructor
public class LrsServiceImpl implements LrsService {

  private static final String CHARACTERS =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  private static final int RANDOM_STRING_LENGTH = 40;

  private final LrsRoleRepository lrsRoleRepository;
  private final LrsStoreRepository lrsStoreRepository;
  private final LrsClientRepository lrsClientRepository;
  private final TokenService tokenService;
  private final UserRepository userRepository;

  @Override
  public LrsRole getAdminRole() {
    try {
      return lrsRoleRepository.findByTitle("Admin");
    } catch (Exception e) {
      throw new DatabaseOperationException("Unable to fetch admin role from Learning locker.");
    }
  }

  @Override
  public LrsProviderResponse createLrs(
      HttpServletRequest request, LrsProviderRequest lrsProviderRequest) {
    LrsStore newLrsStore = createStoreMethod(lrsProviderRequest);
    LrsClient newLrsClient = createLrsClientMethod(newLrsStore, newLrsStore.getTitle());

    User userFromToken = tokenService.getUserFromToken(request);
    List<LrsProvider> userLrsProviderList = userFromToken.getLrsProviderList();
    LrsProvider userLrsProvider = new LrsProvider();
    userLrsProvider.setLrsId(newLrsStore.getId());
    userLrsProvider.setClientId(newLrsClient.getId());
    userLrsProvider.setUniqueIdentifierType(lrsProviderRequest.getUniqueIdentifierType());
    userLrsProviderList.add(userLrsProvider);
    userRepository.save(userFromToken);
    return new LrsProviderResponse(
        newLrsStore.getId(),
        newLrsStore.getTitle(),
        newLrsStore.getStatementCount(),
        newLrsStore.getUpdatedAt(),
        newLrsStore.getCreatedAt(),
        newLrsClient.getApi().getBasic_auth(),
        newLrsStore.getUniqueIdentifierType());
  }

  @Override
  public LrsStore createStoreMethod(LrsProviderRequest lrsProviderRequest) {
    // TODO: If admin role not found, create a new admin role manually.
    if (lrsStoreRepository.findByTitle(lrsProviderRequest.getTitle()) != null) {
      throw new LrsTitleAlreadyExistsException(
          "LRS with this title already exist. Please choose another title.");
    }
    ;
    String organisationId = getAdminRole().getOrganisation();
    LrsStore lrsStore = new LrsStore();
    lrsStore.setTitle(lrsProviderRequest.getTitle());
    lrsStore.setOrganisation(new ObjectId(organisationId));
    lrsStore.setCreatedAt(LocalDate.now());
    lrsStore.setUpdatedAt(LocalDate.now());
    lrsStore.setStatementCount(0);
    lrsStore.setUniqueIdentifierType(lrsProviderRequest.getUniqueIdentifierType());
    return lrsStoreRepository.save(lrsStore);
  }

  @Override
  public LrsClient createLrsClientMethod(LrsStore newLrsStore, String lrsTitle) {
    ClientApi clientApi = new ClientApi();
    clientApi.setBasic_key(generateRandomSHA1());
    clientApi.setBasic_secret(generateRandomSHA1());
    clientApi.setBasic_auth(
        generateBasicAuth(clientApi.getBasic_key(), clientApi.getBasic_secret()));

    LrsClient lrsClient = new LrsClient();
    lrsClient.setApi(clientApi);
    lrsClient.setOrganisation(newLrsStore.getOrganisation());
    lrsClient.setLrs_id(new ObjectId((newLrsStore.getId())));
    lrsClient.setTitle(lrsTitle + " Client");
    lrsClient.setCreatedAt(LocalDate.now());
    lrsClient.setUpdatedAt(LocalDate.now());
    return lrsClientRepository.save(lrsClient);
  }

  @Override
  public LrsStore getLrsStore(String storeId) {
    Optional<LrsStore> foundLrsStore = lrsStoreRepository.findById(storeId);
    if (foundLrsStore.isPresent()) {
      return foundLrsStore.get();
    } else {
      throw new ServiceException("No LRS found with id: " + storeId);
    }
  }

  @Override
  public LrsClient getLrsClient(String lrsClientId) {
    Optional<LrsClient> foundLrsClient = lrsClientRepository.findById(lrsClientId);
    if (foundLrsClient.isPresent()) {
      return foundLrsClient.get();
    } else {
      throw new ServiceException("No LRS Client found with id: " + lrsClientId);
    }
  }

  @Override
  public LrsProviderResponse updateLrs(
      HttpServletRequest request,
      @Valid LrsProviderRequest lrsUpdateRequest,
      String lrdStoreId,
      boolean confirm) {
    try {
      Optional<LrsStore> foundLrs = lrsStoreRepository.findById(lrdStoreId);
      if (foundLrs.isEmpty()) {
        throw new LrsNotFoundException("LRS id not found");
      }
      if (lrsStoreRepository.findByTitle(lrsUpdateRequest.getTitle()) != null) {
        throw new LrsTitleAlreadyExistsException(
            "LRS with this title already exist. Please choose another title.");
      }
      User userFromToken = tokenService.getUserFromToken(request);
      if (userFromToken.getLrsProviderList().stream()
          .noneMatch(lrs -> Objects.equals(lrs.getLrsId(), foundLrs.get().getId()))) {
        throw new LrsManipulationException("You do not have permission to update the LRS");
      }
      if (!confirm) {
        if (foundLrs.get().getUniqueIdentifierType()
            != lrsUpdateRequest.getUniqueIdentifierType()) {
          throw new LrsManipulationException(
              "The LRS store has "
                  + foundLrs.get().getUniqueIdentifierType()
                  + " as the unique identifier type. Are you sure you want to change it?");
        }
      }
      foundLrs.get().setTitle(lrsUpdateRequest.getTitle());
      foundLrs.get().setUniqueIdentifierType(lrsUpdateRequest.getUniqueIdentifierType());
      foundLrs.get().setUpdatedAt(LocalDate.now());
      lrsStoreRepository.save(foundLrs.get());
      LrsClient foundLrsClient =
          lrsClientRepository.findByLrsId(new ObjectId(foundLrs.get().getId()));
      log.info("LRS update successful for id: {}", foundLrs.get().getId());
      return new LrsProviderResponse(
          foundLrs.get().getId(),
          foundLrs.get().getTitle(),
          foundLrs.get().getStatementCount(),
          foundLrs.get().getUpdatedAt(),
          foundLrs.get().getCreatedAt(),
          foundLrsClient.getApi().getBasic_auth(),
          foundLrs.get().getUniqueIdentifierType());
    } catch (LrsNotFoundException | LrsManipulationException | LrsTitleAlreadyExistsException e) {
      throw e;
    } catch (Exception e) {
      throw new DatabaseOperationException("Unable to update LRS store.");
    }
  }

  @Override
  public List<LrsStoreResponse> getAvailableLrs() {
    List<LrsStore> foundAllLrsStores = lrsStoreRepository.findAll();
    List<LrsStoreResponse> lrsResponses = new ArrayList<>();
    if (!foundAllLrsStores.isEmpty()) {
      for (LrsStore lrsStore : foundAllLrsStores) {
        LrsStoreResponse lrsResponse = new LrsStoreResponse();
        lrsResponse.setTitle(lrsStore.getTitle());
        lrsResponse.setUniqueIdentifierType(lrsStore.getUniqueIdentifierType());
        lrsResponse.setLrsId(lrsStore.getId());
        lrsResponses.add(lrsResponse);
      }
    }
    return lrsResponses;
  }

  @Override
  public void deleteLrs(HttpServletRequest request, String lrdStoreId, boolean confirm) {
    try {
      Optional<LrsStore> foundLrs = lrsStoreRepository.findById(lrdStoreId);
      if (foundLrs.isEmpty()) {
        throw new LrsNotFoundException("LRS id not found");
      }
      if (!confirm) {
        if (foundLrs.get().getStatementCount() > 0) {
          throw new LrsManipulationException(
              "The LRS store has "
                  + foundLrs.get().getStatementCount()
                  + " statements. Are you sure you want to delete?");
        }
      }
      lrsStoreRepository.deleteById(foundLrs.get().getId());
      log.info("LRS store id deleted: {}", foundLrs.get().getId());
      lrsClientRepository.deleteByLrsId(new ObjectId(foundLrs.get().getId()));
      log.info("LRS client with id deleted: {}", foundLrs.get().getId());

      User userFromToken = tokenService.getUserFromToken(request);

      List<LrsProvider> updatedLrsProviderList =
          userFromToken.getLrsProviderList().stream()
              .filter(lrs -> !Objects.equals(lrs.getLrsId(), foundLrs.get().getId()))
              .collect(Collectors.toList());
      userFromToken.setLrsProviderList(updatedLrsProviderList);
      userRepository.save(userFromToken);
      log.info("User updated: {}", userFromToken.getEmail());
    } catch (LrsNotFoundException e) {
      throw e;
    } catch (Exception e) {
      throw new DatabaseOperationException("Unable to delete LRS store.");
    }
  }

  private String generateRandomSHA1() {
    try {
      String randomString = generateRandomString();
      return generateSHA1(randomString);
    } catch (NoSuchAlgorithmException e) {
      throw new RuntimeException(e);
    }
  }

  private String generateRandomString() {
    SecureRandom random = new SecureRandom();
    StringBuilder stringBuilder = new StringBuilder(RANDOM_STRING_LENGTH);
    for (int i = 0; i < RANDOM_STRING_LENGTH; i++) {
      int index = random.nextInt(CHARACTERS.length());
      stringBuilder.append(CHARACTERS.charAt(index));
    }
    return stringBuilder.toString();
  }

  private String generateSHA1(String input) throws NoSuchAlgorithmException {
    MessageDigest messageDigest = MessageDigest.getInstance("SHA-1");
    byte[] hashBytes = messageDigest.digest(input.getBytes());
    StringBuilder stringBuilder = new StringBuilder();
    for (byte b : hashBytes) {
      stringBuilder.append(String.format("%02x", b));
    }
    return stringBuilder.toString();
  }

  public String generateBasicAuth(String key, String secret) {
    String authString = key + ":" + secret;
    String encodedAuthString =
        Base64.getEncoder().encodeToString(authString.getBytes(StandardCharsets.UTF_8));
    return "Basic " + encodedAuthString;
  }
}
