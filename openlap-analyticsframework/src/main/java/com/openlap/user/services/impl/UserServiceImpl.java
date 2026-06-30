package com.openlap.user.services.impl;

import com.openlap.analytics_statements.dtos.request.LrsConsumerRequest;
import com.openlap.analytics_statements.entities.LrsClient;
import com.openlap.analytics_statements.entities.LrsStore;
import com.openlap.analytics_statements.services.LrsService;
import com.openlap.analytics_statements.services.StatementService;
import com.openlap.infrastructure.exception.ServiceException;
import com.openlap.infrastructure.exception.OpenLapException;
import com.openlap.user.dto.request.AdminUpdateUserRequest;
import com.openlap.user.dto.request.ChangePasswordRequest;
import com.openlap.user.dto.request.TokenRequest;
import com.openlap.user.dto.request.UpdateEmailRequest;
import com.openlap.user.dto.request.UpdateProfileRequest;
import com.openlap.user.dto.response.AdminUserDetailResponse;
import com.openlap.user.dto.response.AdminUserResponse;
import com.openlap.user.dto.response.UserResponse;
import com.openlap.user.dto.response.utils.AdminLrsProviderConnection;
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
import java.util.Set;
import javax.servlet.http.HttpServletRequest;
import javax.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bson.types.ObjectId;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
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
  private final PasswordEncoder passwordEncoder;

  @Override
  public UserDetails loadUserByUsername(String userEmail) {
    User user;
    try {
      user = getUserByEmail(userEmail);
    } catch (UserNotFoundException e) {
      // Preserve existing login behaviour: a UserDetailsService signals a missing user with
      // UsernameNotFoundException, which Spring converts to a generic 401 (no user enumeration).
      // Without this, the getUserByEmail fix below would surface as a 404 on the login path.
      throw new UsernameNotFoundException(e.getMessage(), e);
    }
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
        throw new UserNotFoundException("User not found.");
      }
      log.info("User with email '{}' found.", user.getEmail());
      return user;
    } catch (OpenLapException e) {
      // Domain exceptions (e.g. UserNotFoundException -> 404 USER_NOT_FOUND) must propagate as-is,
      // not be wrapped into a 500. This fixes the prior 404->500 bug.
      throw e;
    } catch (Exception e) {
      // Only genuine, unexpected failures are wrapped as an infrastructure error.
      throw new ServiceException("Error looking up user by email.", e);
    }
  }

  @Override
  public UserResponse getUserDetails(HttpServletRequest request) {
    try {
      TokenRequest tokenRequest = tokenService.verifyToken(request);
      User foundUser = getUserByEmail(tokenRequest.getUserEmail());
      return toUserResponse(foundUser);
    } catch (Exception e) {
      throw new ServiceException("Error getting user details", e);
    }
  }

  /** Builds the public user response from a user entity (name, email, LRS lists). */
  private UserResponse toUserResponse(User foundUser) {
    UserResponse userResponse = new UserResponse();
    userResponse.setName(foundUser.getName());
    userResponse.setEmail(foundUser.getEmail());
    userResponse.setLrsProviderList(generateLrsProviderResponseMethod(foundUser));
    userResponse.setLrsConsumerList(generateLrsConsumerResponseMethod(foundUser));
    return userResponse;
  }

  @Override
  public Page<AdminUserResponse> listUsers(Pageable pageable) {
    try {
      return userRepository.findAll(pageable).map(this::toAdminUserResponse);
    } catch (OpenLapException e) {
      // Domain exceptions propagate unchanged (consistent error envelope), as elsewhere.
      throw e;
    } catch (Exception e) {
      throw new ServiceException("Error listing users.", e);
    }
  }

  /**
   * Builds the admin-facing user response. Exposes safe fields only (id, name, email, role names);
   * never the password hash or LRS credentials.
   */
  private AdminUserResponse toAdminUserResponse(User user) {
    return new AdminUserResponse(
        user.getId(), user.getName(), user.getEmail(), roleNames(user));
  }

  /** Maps a user's roles to their string names (e.g. "ROLE_SUPER_ADMIN"); null-safe. */
  private static List<String> roleNames(User user) {
    List<String> roles = new ArrayList<>();
    if (user.getRoles() != null) {
      user.getRoles()
          .forEach(
              role -> {
                if (role != null && role.getName() != null) {
                  roles.add(role.getName().toString());
                }
              });
    }
    return roles;
  }

  @Override
  public AdminUserDetailResponse getUserDetailById(String id) {
    return buildAdminUserDetail(loadUserById(id));
  }

  @Override
  public AdminUserDetailResponse updateUserByAdmin(String id, AdminUpdateUserRequest request) {
    User user = loadUserById(id);
    user.setName(request.getName());
    String newEmail = request.getEmail();
    if (!newEmail.equals(user.getEmail())) {
      if (userRepository.existsByEmail(newEmail)) {
        throw new EmailAlreadyTakenException("Email already taken.");
      }
      user.setEmail(newEmail);
    }
    User savedUser = userRepository.save(user);
    log.info("Admin updated user '{}'.", savedUser.getId());
    return buildAdminUserDetail(savedUser);
  }

  @Override
  public AdminUserDetailResponse replaceUserRoles(String id, Set<RoleType> roles) {
    User user = loadUserById(id);
    userRoleService.replaceUserRoles(user, roles);
    return buildAdminUserDetail(user);
  }

  private User loadUserById(String id) {
    return userRepository
        .findById(id)
        .orElseThrow(() -> new UserNotFoundException("User not found."));
  }

  private AdminUserDetailResponse buildAdminUserDetail(User user) {
    AdminUserDetailResponse response = new AdminUserDetailResponse();
    response.setId(user.getId());
    response.setName(user.getName());
    response.setEmail(user.getEmail());
    response.setRoles(roleNames(user));
    response.setLrsConsumerConnections(mapAdminConsumerConnections(user));
    response.setLrsProviderConnections(mapAdminProviderConnections(user));
    return response;
  }

  /**
   * Maps the user's LRS consumer connections for an admin view, reusing the secret-free {@link
   * LrsConsumerResponse} (id, lrsId, title, uniqueIdentifier). A missing/deleted LRS store falls
   * back to an "Unknown LRS" title rather than failing the whole request.
   */
  private List<LrsConsumerResponse> mapAdminConsumerConnections(User user) {
    List<LrsConsumerResponse> connections = new ArrayList<>();
    if (user.getLrsConsumerList() == null) {
      return connections;
    }
    for (LrsConsumer consumer : user.getLrsConsumerList()) {
      LrsConsumerResponse connection = new LrsConsumerResponse();
      connection.setId(consumer.getId() == null ? null : consumer.getId().toString());
      connection.setLrsId(consumer.getLrsId());
      connection.setUniqueIdentifier(consumer.getUniqueIdentifier());
      connection.setLrsTitle(resolveLrsTitle(consumer.getLrsId()));
      connections.add(connection);
    }
    return connections;
  }

  /**
   * Maps the user's LRS provider connections for an admin view using the LRS store ONLY. It never
   * resolves the LRS client, so the basic-auth credential (ClientApi.basic_auth/basic_secret/
   * basic_key) is never read or exposed. A missing store falls back to an "Unknown LRS" title.
   */
  private List<AdminLrsProviderConnection> mapAdminProviderConnections(User user) {
    List<AdminLrsProviderConnection> connections = new ArrayList<>();
    if (user.getLrsProviderList() == null) {
      return connections;
    }
    for (LrsProvider provider : user.getLrsProviderList()) {
      AdminLrsProviderConnection connection = new AdminLrsProviderConnection();
      connection.setLrsId(provider.getLrsId());
      connection.setUniqueIdentifierType(
          provider.getUniqueIdentifierType() == null
              ? null
              : provider.getUniqueIdentifierType().toString());
      try {
        LrsStore store = lrsService.getLrsStore(provider.getLrsId());
        connection.setLrsTitle(store.getTitle());
        connection.setStatementCount(store.getStatementCount());
        connection.setCreatedAt(store.getCreatedAt());
        connection.setUpdatedAt(store.getUpdatedAt());
      } catch (Exception e) {
        log.warn(
            "Could not resolve LRS store '{}' for admin user detail: {}",
            provider.getLrsId(),
            e.getMessage());
        connection.setLrsTitle("Unknown LRS");
      }
      connections.add(connection);
    }
    return connections;
  }

  /** Resolves an LRS store title, or "Unknown LRS" if the store is missing/unavailable. */
  private String resolveLrsTitle(String lrsId) {
    try {
      return lrsService.getLrsStore(lrsId).getTitle();
    } catch (Exception e) {
      log.warn("Could not resolve LRS store '{}' for admin user detail: {}", lrsId, e.getMessage());
      return "Unknown LRS";
    }
  }

  /** Resolves the authenticated user from the request's bearer token (existing pattern). */
  private User resolveCurrentUser(HttpServletRequest request) {
    TokenRequest tokenRequest = tokenService.verifyToken(request);
    return getUserByEmail(tokenRequest.getUserEmail());
  }

  @Override
  public UserResponse updateProfile(
      HttpServletRequest request, UpdateProfileRequest updateProfileRequest) {
    User foundUser = resolveCurrentUser(request);
    foundUser.setName(updateProfileRequest.getName());
    User savedUser = userRepository.save(foundUser);
    log.info("Profile updated for user '{}'.", savedUser.getEmail());
    return toUserResponse(savedUser);
  }

  @Override
  public UserResponse updateEmail(
      HttpServletRequest request, UpdateEmailRequest updateEmailRequest) {
    User foundUser = resolveCurrentUser(request);
    if (!passwordEncoder.matches(updateEmailRequest.getCurrentPassword(), foundUser.getPassword())) {
      throw new IncorrectPasswordException("Current password is incorrect.");
    }
    String newEmail = updateEmailRequest.getNewEmail();
    if (!newEmail.equals(foundUser.getEmail())) {
      if (userRepository.existsByEmail(newEmail)) {
        throw new EmailAlreadyTakenException("Email already taken.");
      }
      foundUser.setEmail(newEmail);
      foundUser = userRepository.save(foundUser);
      log.info("Email updated for user. New email '{}'.", foundUser.getEmail());
    }
    return toUserResponse(foundUser);
  }

  @Override
  public void changePassword(
      HttpServletRequest request, ChangePasswordRequest changePasswordRequest) {
    User foundUser = resolveCurrentUser(request);
    if (!passwordEncoder.matches(
        changePasswordRequest.getCurrentPassword(), foundUser.getPassword())) {
      throw new IncorrectPasswordException("Current password is incorrect.");
    }
    if (!changePasswordRequest
        .getNewPassword()
        .equals(changePasswordRequest.getConfirmNewPassword())) {
      throw new PasswordsDoNotMatchException("Passwords do not match");
    }
    foundUser.setPassword(passwordEncoder.encode(changePasswordRequest.getNewPassword()));
    userRepository.save(foundUser);
    log.info("Password changed for user '{}'.", foundUser.getEmail());
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
