package com.openlap.user.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.openlap.analytics_statements.services.LrsService;
import com.openlap.analytics_statements.services.StatementService;
import com.openlap.infrastructure.exception.ServiceException;
import com.openlap.user.exception.user.UserNotFoundException;
import com.openlap.user.repositories.UserRepository;
import com.openlap.user.services.TokenService;
import com.openlap.user.services.UserRoleService;
import org.junit.Test;
import org.springframework.http.HttpStatus;
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
}
