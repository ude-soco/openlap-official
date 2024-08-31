package com.openlap.user.services.impl;

import com.openlap.analytics_statements.entities.LrsClient;
import com.openlap.analytics_statements.entities.LrsStore;
import com.openlap.analytics_statements.services.LrsService;
import com.openlap.analytics_statements.services.StatementService;
import com.openlap.exception.DatabaseOperationException;
import com.openlap.exception.ServiceException;
import com.openlap.user.dto.request.UserRequest;
import com.openlap.user.entities.RoleType;
import com.openlap.user.entities.User;
import com.openlap.user.entities.utility_entities.LrsConsumer;
import com.openlap.user.entities.utility_entities.LrsProvider;
import com.openlap.user.exception.role.RoleNotAllowedException;
import com.openlap.user.exception.user.*;
import com.openlap.user.repositories.UserRepository;
import com.openlap.user.services.UserRegisterService;
import com.openlap.user.services.UserRoleService;
import java.util.ArrayList;
import java.util.List;
import javax.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bson.types.ObjectId;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class UserRegisterServiceImpl implements UserRegisterService {
  private final UserRepository userRepository;
  private final UserRoleService userRoleService;
  private final PasswordEncoder passwordEncoder;
  private final LrsService lrsService;
  private final StatementService statementService;

  @Override
  public void createAdmin(UserRequest user) {
    try {
      User foundAdmin = userRepository.findByEmail(user.getEmail());
      if (foundAdmin != null) {
        log.warn("Admin with email '{}' already exists", user.getEmail());
        return;
      }
      User newUser = new User();
      newUser.setName(user.getName());
      newUser.setEmail(user.getEmail());
      newUser.setPassword(passwordEncoder.encode(user.getPassword()));
      userRepository.save(newUser);
      log.info("Admin created with email '{}'", newUser.getEmail());
      userRoleService.addRoleToUser(newUser, user.getRole());
    } catch (Exception e) {
      throw new ServiceException("Error saving admin", e);
    }
  }

  @Override
  public void registerUser(UserRequest userRequest) {
    try {
      if (userRepository.findByEmail(userRequest.getEmail()) != null) {
        log.warn("User with email '{}' already exists", userRequest.getEmail());
        throw new EmailAlreadyTakenException("Email already taken.");
      }
      if (userRequest.getRole() == RoleType.ROLE_SUPER_ADMIN) {
        log.warn("Role '{}' not allowed", userRequest.getRole());
        throw new RoleNotAllowedException("Role not allowed");
      }
      if (!userRequest.getPassword().equals(userRequest.getConfirmPassword())) {
        throw new PasswordsDoNotMatchException("Passwords do not match");
      }
      User newUser = new User();
      newUser.setName(userRequest.getName());
      newUser.setEmail(userRequest.getEmail());
      newUser.setPassword(passwordEncoder.encode(userRequest.getPassword()));
      if (userRequest.getLrsProviderRequest() != null
          && userRequest.getLrsConsumerRequest() != null) {
        throw new InvalidUserDetailsException(
            "Only one of 'LrsProviderDetail', 'LrsConsumerDetail' should be provided");
      }
      if (userRequest.getRole() == RoleType.ROLE_USER) {
        validateLrsConsumerMethod(userRequest, newUser);
      }
      if (userRequest.getRole() == RoleType.ROLE_DATA_PROVIDER) {
        validateLrsProviderMethod(userRequest, newUser);
      }
      userRepository.save(newUser);
      log.info("User created with email '{}'.", newUser.getEmail());
      userRoleService.addRoleToUser(newUser, userRequest.getRole());
    } catch (InvalidUserDetailsException
        | PasswordsDoNotMatchException
        | EmailAlreadyTakenException
        | RoleNotAllowedException
        | InvalidLrsUserException e) {
      throw e;
    } catch (Exception e) {
      throw new DatabaseOperationException("Error registering user", e);
    }
  }

  private void validateLrsConsumerMethod(UserRequest userRequest, User newUser) {
    log.info("Validating LRS Consumer method for user '{}", newUser.getEmail());
    try {
      if (userRequest.getLrsConsumerRequest() != null) {
        if (userRequest.getRole() != RoleType.ROLE_USER) {
          throw new RoleNotAllowedException(
              "Role '"
                  + userRequest.getRole()
                  + "' not allowed for lrs consumer. Perhaps you are expecting user role?");
        }
        if (!statementService.validateLrsUser(userRequest.getLrsConsumerRequest())) {
          throw new InvalidLrsUserException(
              "Not a valid LRS user. Check the LRS and/or Unique identifier again.");
        }
        LrsStore lrsStore = lrsService.getLrsStore(userRequest.getLrsConsumerRequest().getLrsId());
        List<LrsConsumer> lrsConsumersList = new ArrayList<>();
        lrsConsumersList.add(
            new LrsConsumer(
                new ObjectId(),
                lrsStore.getId(),
                userRequest.getLrsConsumerRequest().getUniqueIdentifier()));
        newUser.setLrsConsumerList(lrsConsumersList);
      }
    } catch (RoleNotAllowedException | InvalidLrsUserException e) {
      throw e;
    } catch (Exception e) {
      throw new DatabaseOperationException("Error validating LRS consumer method", e);
    }
  }

  private void validateLrsProviderMethod(UserRequest userRequest, User newUser) {
    log.info("Validating LRS provider method for user '{}'.", newUser.getEmail());
    try {
      if (userRequest.getLrsProviderRequest() != null) {
        if (userRequest.getRole() != RoleType.ROLE_DATA_PROVIDER) {
          throw new RoleNotAllowedException(
              "Role '"
                  + userRequest.getRole()
                  + "' not allowed for lrs consumer. Perhaps you are expecting data provider role?");
        }
        LrsStore newLrsStore = lrsService.createStoreMethod(userRequest.getLrsProviderRequest());
        LrsClient newLrsClient =
            lrsService.createLrsClientMethod(newLrsStore, newLrsStore.getTitle());
        List<LrsProvider> lrsProviderList = new ArrayList<>();
        LrsProvider userLrsProvider = new LrsProvider();
        userLrsProvider.setLrsId(newLrsStore.getId());
        userLrsProvider.setClientId(newLrsClient.getId());
        userLrsProvider.setUniqueIdentifierType(newLrsStore.getUniqueIdentifierType());
        lrsProviderList.add(userLrsProvider);
        newUser.setLrsProviderList(lrsProviderList);
      }
    } catch (RoleNotAllowedException e) {
      throw e;
    } catch (Exception e) {
      throw new DatabaseOperationException("Error validating LRS provider method", e);
    }
  }
}
