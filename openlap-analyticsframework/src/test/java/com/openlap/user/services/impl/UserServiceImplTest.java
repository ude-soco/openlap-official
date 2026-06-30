package com.openlap.user.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.openlap.analytics_statements.services.LrsService;
import com.openlap.analytics_statements.services.StatementService;
import com.openlap.infrastructure.exception.ServiceException;
import com.openlap.user.dto.response.AdminUserResponse;
import com.openlap.user.entities.Role;
import com.openlap.user.entities.RoleType;
import com.openlap.user.entities.User;
import com.openlap.user.exception.user.UserNotFoundException;
import com.openlap.user.repositories.UserRepository;
import com.openlap.user.services.TokenService;
import com.openlap.user.services.UserRoleService;
import java.util.Collections;
import org.junit.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

/** Regression tests for the getUserByEmail 404->500 wrapping bug and login-behaviour preservation. */
public class UserServiceImplTest {

  private final UserRepository userRepository = mock(UserRepository.class);
  private final UserServiceImpl service =
      new UserServiceImpl(
          userRepository,
          mock(TokenService.class),
          mock(LrsService.class),
          mock(StatementService.class),
          mock(UserRoleService.class),
          mock(org.springframework.security.crypto.password.PasswordEncoder.class));

  @Test
  public void getUserByEmailPropagatesUserNotFoundAs404NotServiceException() {
    when(userRepository.findByEmail("missing@mail.com")).thenReturn(null);

    UserNotFoundException ex =
        catchThrowableOfType(
            () -> service.getUserByEmail("missing@mail.com"), UserNotFoundException.class);

    assertThat(ex).isNotNull();
    assertThat(ex).isNotInstanceOf(ServiceException.class);
    assertThat(ex.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
    assertThat(ex.getCode()).isEqualTo("USER_NOT_FOUND");
  }

  @Test
  public void getUserByEmailStillWrapsGenuineFailuresAsServiceError() {
    // unexpected infrastructure failures must NOT be hidden — still surface as a 500-class error
    when(userRepository.findByEmail("x@mail.com")).thenThrow(new RuntimeException("mongo down"));

    assertThatThrownBy(() -> service.getUserByEmail("x@mail.com"))
        .isInstanceOf(ServiceException.class);
  }

  @Test
  public void loadUserByUsernameThrowsUsernameNotFoundToPreserveLogin() {
    when(userRepository.findByEmail("missing@mail.com")).thenReturn(null);

    // The UserDetailsService contract: signal a missing user with UsernameNotFoundException so the
    // login path stays a generic 401 (the getUserByEmail fix must not leak as a 404 on login).
    assertThatThrownBy(() -> service.loadUserByUsername("missing@mail.com"))
        .isInstanceOf(UsernameNotFoundException.class)
        .isNotInstanceOf(UserNotFoundException.class);
  }

  @Test
  public void listUsersMapsSafeFieldsOnlyAndRoleNames() {
    User user = new User();
    user.setId("u1");
    user.setName("Alice");
    user.setEmail("alice@mail.com");
    user.setPassword("secret-hash");
    user.setRoles(Collections.singletonList(new Role("r1", RoleType.ROLE_SUPER_ADMIN)));

    when(userRepository.findAll(any(Pageable.class)))
        .thenReturn(new PageImpl<>(Collections.singletonList(user)));

    Page<AdminUserResponse> result = service.listUsers(PageRequest.of(0, 10));

    assertThat(result.getContent()).hasSize(1);
    AdminUserResponse dto = result.getContent().get(0);
    assertThat(dto.getId()).isEqualTo("u1");
    assertThat(dto.getName()).isEqualTo("Alice");
    assertThat(dto.getEmail()).isEqualTo("alice@mail.com");
    assertThat(dto.getRoles()).containsExactly("ROLE_SUPER_ADMIN");
    assertThat(dto.isEnabled()).isTrue();
    // AdminUserResponse exposes no password field — safe by construction.
  }

  @Test
  public void legacyNullEnabledUserIsTreatedAsEnabledForLoginAndAdminList() {
    User user = new User();
    user.setId("u2");
    user.setName("Legacy");
    user.setEmail("legacy@mail.com");
    user.setPassword("hash");
    user.setEnabled(null);
    user.setRoles(Collections.singletonList(new Role("r1", RoleType.ROLE_USER)));

    when(userRepository.findByEmail("legacy@mail.com")).thenReturn(user);
    when(userRepository.findAll(any(Pageable.class)))
        .thenReturn(new PageImpl<>(Collections.singletonList(user)));

    UserDetails details = service.loadUserByUsername("legacy@mail.com");
    Page<AdminUserResponse> result = service.listUsers(PageRequest.of(0, 10));

    assertThat(user.isEnabled()).isTrue();
    assertThat(details.isEnabled()).isTrue();
    assertThat(result.getContent().get(0).isEnabled()).isTrue();
  }

  @Test
  public void disabledUserDetailsAreReturnedAsDisabledForLogin() {
    User user = new User();
    user.setEmail("disabled@mail.com");
    user.setPassword("hash");
    user.setEnabled(false);
    user.setRoles(Collections.singletonList(new Role("r1", RoleType.ROLE_USER)));
    when(userRepository.findByEmail("disabled@mail.com")).thenReturn(user);

    UserDetails details = service.loadUserByUsername("disabled@mail.com");

    assertThat(details.isEnabled()).isFalse();
  }

  @Test
  public void enabledUserDetailsAreReturnedAsEnabledForLogin() {
    User user = new User();
    user.setEmail("enabled@mail.com");
    user.setPassword("hash");
    user.setEnabled(true);
    user.setRoles(Collections.singletonList(new Role("r1", RoleType.ROLE_USER)));
    when(userRepository.findByEmail("enabled@mail.com")).thenReturn(user);

    UserDetails details = service.loadUserByUsername("enabled@mail.com");

    assertThat(details.isEnabled()).isTrue();
  }
}
