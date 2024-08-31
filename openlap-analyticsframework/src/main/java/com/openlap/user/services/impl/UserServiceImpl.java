package com.openlap.user.services.impl;

import com.openlap.analytics_statements.dtos.request.LrsConsumerRequest;
import com.openlap.analytics_statements.entities.LrsClient;
import com.openlap.analytics_statements.entities.LrsStore;
import com.openlap.analytics_statements.services.LrsService;
import com.openlap.analytics_statements.services.StatementService;
import com.openlap.exception.ServiceException;
import com.openlap.user.dto.request.TokenRequest;
import com.openlap.user.dto.response.UserResponse;
import com.openlap.user.dto.response.utils.LrsConsumerResponse;
import com.openlap.user.dto.response.utils.LrsProviderResponse;
import com.openlap.user.entities.RoleType;
import com.openlap.user.entities.User;
import com.openlap.user.entities.utility_entities.LrsConsumer;
import com.openlap.user.entities.utility_entities.LrsProvider;
import com.openlap.user.exception.user.*;
import com.openlap.user.repositories.UserRepository;
import com.openlap.user.services.TokenService;
import com.openlap.user.services.UserRoleService;
import com.openlap.user.services.UserService;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import javax.servlet.http.HttpServletRequest;
import javax.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bson.types.ObjectId;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class UserServiceImpl implements UserService, UserDetailsService {

  private final UserRepository userRepository;
  private final TokenService tokenService;
  private final LrsService lrsService;
  private final StatementService statementService;
  private final UserRoleService userRoleService;

  @Override
  public UserDetails loadUserByUsername(String userEmail) {
    User user = getUserByEmail(userEmail);
    Collection<SimpleGrantedAuthority> authorities = new ArrayList<>();
    user.getRoles()
        .forEach(
            role -> {
              authorities.add(new SimpleGrantedAuthority(role.getName().toString()));
            });
    return new org.springframework.security.core.userdetails.User(
        user.getEmail(), user.getPassword(), authorities);
  }

  @Override
  public User getUserByEmail(String userEmail) {
    try {
      User user = userRepository.findByEmail(userEmail);
      if (user == null) {
        log.error("User with email '{}' not found.", userEmail);
        throw new UserNotFoundException("User not found.");
      }
      log.info("User with email '{}' found.", user.getEmail());
      return user;
    } catch (Exception e) {
      throw new ServiceException("Error getting email.", e);
    }
  }

  @Override
  public UserResponse getUserDetails(HttpServletRequest request) {
    try {
      TokenRequest tokenRequest = tokenService.verifyToken(request);
      User foundUser = getUserByEmail(tokenRequest.getUserEmail());
      UserResponse userResponse = new UserResponse();
      userResponse.setName(foundUser.getName());
      userResponse.setEmail(foundUser.getEmail());
      userResponse.setLrsProviderList(generateLrsProviderResponseMethod(foundUser));
      userResponse.setLrsConsumerList(generateLrsConsumerResponseMethod(foundUser));
      return userResponse;
    } catch (Exception e) {
      throw new ServiceException("Error getting user details", e);
    }
  }

  private List<LrsProviderResponse> generateLrsProviderResponseMethod(User foundUser) {
    List<LrsProviderResponse> lrsProviderResponseList = new ArrayList<>();
    if (foundUser.getRoles().stream()
        .anyMatch(role -> role.getName() == RoleType.ROLE_DATA_PROVIDER)) {
      if (!foundUser.getLrsProviderList().isEmpty()) {
        for (LrsProvider lrsProvider : foundUser.getLrsProviderList()) {
          LrsStore foundLrsStore = lrsService.getLrsStore(lrsProvider.getLrsId());
          LrsClient foundLrsClient = lrsService.getLrsClient(lrsProvider.getClientId());
          LrsProviderResponse lrsProviderResponse =
              new LrsProviderResponse(
                  foundLrsStore.getId(),
                  foundLrsStore.getTitle(),
                  foundLrsStore.getStatementCount(),
                  foundLrsStore.getUpdatedAt(),
                  foundLrsStore.getCreatedAt(),
                  foundLrsClient.getApi().getBasic_auth(),
                  foundLrsStore.getUniqueIdentifierType());
          lrsProviderResponseList.add(lrsProviderResponse);
        }
        return lrsProviderResponseList;
      }
    }
    return new ArrayList<>();
  }

  private List<LrsConsumerResponse> generateLrsConsumerResponseMethod(User foundUser) {
    List<LrsConsumerResponse> lrsConsumerResponseList = new ArrayList<>();
    if (foundUser.getRoles().stream().anyMatch(role -> role.getName() == RoleType.ROLE_USER)) {
      if (!foundUser.getLrsConsumerList().isEmpty()) {
        for (LrsConsumer lrsConsumer : foundUser.getLrsConsumerList()) {
          LrsConsumerResponse lrsConsumerResponse = new LrsConsumerResponse();
          LrsStore foundLrsStore = lrsService.getLrsStore(lrsConsumer.getLrsId());
          lrsConsumerResponse.setId(lrsConsumer.getId().toString());
          lrsConsumerResponse.setLrsId(foundLrsStore.getId());
          lrsConsumerResponse.setLrsTitle(foundLrsStore.getTitle());
          lrsConsumerResponse.setUniqueIdentifier(lrsConsumer.getUniqueIdentifier());
          lrsConsumerResponseList.add(lrsConsumerResponse);
        }
        return lrsConsumerResponseList;
      }
    }
    return new ArrayList<>();
  }

  @Override
  public List<LrsConsumerResponse> getLrsConsumerList(HttpServletRequest request) {
    TokenRequest tokenRequest = tokenService.verifyToken(request);
    User foundUser = getUserByEmail(tokenRequest.getUserEmail());
    return generateLrsConsumerResponseMethod(foundUser);
  }

  @Override
  public void getNewLrsToLrsConsumerList(
      HttpServletRequest request, LrsConsumerRequest lrsConsumerRequest) {
    Boolean validationResult = statementService.validateLrsUser(lrsConsumerRequest);
    if (!validationResult) {
      throw new InvalidLrsUserException(
          "You do not belong to the LRS. Please check your unique identifier.");
    }
    TokenRequest tokenRequest = tokenService.verifyToken(request);
    User foundUser = getUserByEmail(tokenRequest.getUserEmail());
    if (foundUser.getLrsConsumerList().isEmpty()) {
      userRoleService.removeRoleFromUser(foundUser, RoleType.ROLE_USER_WITHOUT_LRS);
      userRoleService.addRoleToUser(foundUser, RoleType.ROLE_USER);
    }
    foundUser
        .getLrsConsumerList()
        .add(
            new LrsConsumer(
                new ObjectId(),
                lrsConsumerRequest.getLrsId(),
                lrsConsumerRequest.getUniqueIdentifier()));
    userRepository.save(foundUser);
  }

  @Override
  public void deleteMyLrsConsumer(HttpServletRequest request, String lrsConsumerId) {
    TokenRequest tokenRequest = tokenService.verifyToken(request);
    User foundUser = getUserByEmail(tokenRequest.getUserEmail());
    boolean removed =
        foundUser
            .getLrsConsumerList()
            .removeIf(lrsConsumer -> lrsConsumer.getId().toHexString().equals(lrsConsumerId));
    if (!removed) {
      throw new InvalidLrsUserException("LRS not found.");
    }
    User savedUser = userRepository.save(foundUser);
    if (savedUser.getLrsConsumerList().isEmpty()) {
      userRoleService.removeRoleFromUser(savedUser, RoleType.ROLE_USER);
      userRoleService.addRoleToUser(savedUser, RoleType.ROLE_USER_WITHOUT_LRS);
    }
  }
}
