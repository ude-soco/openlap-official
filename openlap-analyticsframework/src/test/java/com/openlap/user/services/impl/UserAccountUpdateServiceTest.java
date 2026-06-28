package com.openlap.user.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.openlap.analytics_statements.services.LrsService;
import com.openlap.analytics_statements.services.StatementService;
import com.openlap.user.dto.request.ChangePasswordRequest;
import com.openlap.user.dto.request.TokenRequest;
import com.openlap.user.dto.request.UpdateEmailRequest;
import com.openlap.user.dto.request.UpdateProfileRequest;
import com.openlap.user.dto.response.UserResponse;
import com.openlap.user.entities.User;
import com.openlap.user.exception.user.EmailAlreadyTakenException;
import com.openlap.user.exception.user.IncorrectPasswordException;
import com.openlap.user.exception.user.PasswordsDoNotMatchException;
import com.openlap.user.repositories.UserRepository;
import com.openlap.user.services.TokenService;
import com.openlap.user.services.UserRoleService;
import javax.servlet.http.HttpServletRequest;
import org.junit.Before;
import org.junit.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

/** Unit tests for the account-management service methods (profile/email/password updates). */
public class UserAccountUpdateServiceTest {

  private static final String CURRENT_EMAIL = "user@mail.com";
  private static final String STORED_HASH = "$2a$hashed";

  private final UserRepository userRepository = mock(UserRepository.class);
  private final TokenService tokenService = mock(TokenService.class);
  private final PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
  private final HttpServletRequest request = mock(HttpServletRequest.class);

  private final UserServiceImpl service =
      new UserServiceImpl(
          userRepository,
          tokenService,
          mock(LrsService.class),
          mock(StatementService.class),
          mock(UserRoleService.class),
          passwordEncoder);

  private User currentUser;

  @Before
  public void setUp() {
    currentUser = new User();
    currentUser.setId("id-1");
    currentUser.setName("Old Name");
    currentUser.setEmail(CURRENT_EMAIL);
    currentUser.setPassword(STORED_HASH);

    TokenRequest tokenRequest = mock(TokenRequest.class);
    when(tokenRequest.getUserEmail()).thenReturn(CURRENT_EMAIL);
    when(tokenService.verifyToken(request)).thenReturn(tokenRequest);
    when(userRepository.findByEmail(CURRENT_EMAIL)).thenReturn(currentUser);
    when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
  }

  // ---- updateProfile ----

  @Test
  public void updateProfileChangesNameAndReturnsUpdatedDetails() {
    UserResponse response = service.updateProfile(request, new UpdateProfileRequest("New Name"));

    assertThat(currentUser.getName()).isEqualTo("New Name");
    assertThat(response.getName()).isEqualTo("New Name");
    assertThat(response.getEmail()).isEqualTo(CURRENT_EMAIL);
    verify(userRepository).save(currentUser);
  }

  // ---- updateEmail ----

  @Test
  public void updateEmailHappyPathChangesEmailWhenPasswordCorrectAndEmailFree() {
    when(passwordEncoder.matches("correct-pass", STORED_HASH)).thenReturn(true);
    when(userRepository.existsByEmail("new@mail.com")).thenReturn(false);

    UserResponse response =
        service.updateEmail(request, new UpdateEmailRequest("new@mail.com", "correct-pass"));

    assertThat(currentUser.getEmail()).isEqualTo("new@mail.com");
    assertThat(response.getEmail()).isEqualTo("new@mail.com");
    verify(userRepository).save(currentUser);
  }

  @Test
  public void updateEmailRejectsIncorrectCurrentPassword() {
    when(passwordEncoder.matches("wrong-pass", STORED_HASH)).thenReturn(false);

    assertThatThrownBy(
            () -> service.updateEmail(request, new UpdateEmailRequest("new@mail.com", "wrong-pass")))
        .isInstanceOf(IncorrectPasswordException.class)
        .hasMessage("Current password is incorrect.");

    assertThat(currentUser.getEmail()).isEqualTo(CURRENT_EMAIL);
    verify(userRepository, never()).save(any(User.class));
  }

  @Test
  public void updateEmailRejectsDuplicateEmail() {
    when(passwordEncoder.matches("correct-pass", STORED_HASH)).thenReturn(true);
    when(userRepository.existsByEmail("taken@mail.com")).thenReturn(true);

    assertThatThrownBy(
            () ->
                service.updateEmail(
                    request, new UpdateEmailRequest("taken@mail.com", "correct-pass")))
        .isInstanceOf(EmailAlreadyTakenException.class)
        .hasMessage("Email already taken.");

    assertThat(currentUser.getEmail()).isEqualTo(CURRENT_EMAIL);
    verify(userRepository, never()).save(any(User.class));
  }

  @Test
  public void updateEmailWithSameEmailDoesNotCheckUniquenessOrThrow() {
    when(passwordEncoder.matches("correct-pass", STORED_HASH)).thenReturn(true);

    UserResponse response =
        service.updateEmail(request, new UpdateEmailRequest(CURRENT_EMAIL, "correct-pass"));

    assertThat(response.getEmail()).isEqualTo(CURRENT_EMAIL);
    verify(userRepository, never()).existsByEmail(anyString());
    verify(userRepository, never()).save(any(User.class));
  }

  // ---- changePassword ----

  @Test
  public void changePasswordHappyPathEncodesAndSavesNewPassword() {
    when(passwordEncoder.matches("current-pass", STORED_HASH)).thenReturn(true);
    when(passwordEncoder.encode("NewPassw0rd@1")).thenReturn("$2a$newhash");

    service.changePassword(
        request, new ChangePasswordRequest("current-pass", "NewPassw0rd@1", "NewPassw0rd@1"));

    assertThat(currentUser.getPassword()).isEqualTo("$2a$newhash");
    verify(passwordEncoder).encode("NewPassw0rd@1");
    verify(userRepository).save(currentUser);
  }

  @Test
  public void changePasswordRejectsIncorrectCurrentPassword() {
    when(passwordEncoder.matches("wrong-pass", STORED_HASH)).thenReturn(false);

    assertThatThrownBy(
            () ->
                service.changePassword(
                    request, new ChangePasswordRequest("wrong-pass", "NewPassw0rd@1", "NewPassw0rd@1")))
        .isInstanceOf(IncorrectPasswordException.class)
        .hasMessage("Current password is incorrect.");

    assertThat(currentUser.getPassword()).isEqualTo(STORED_HASH);
    verify(passwordEncoder, never()).encode(anyString());
    verify(userRepository, never()).save(any(User.class));
  }

  @Test
  public void changePasswordRejectsMismatchedConfirmation() {
    when(passwordEncoder.matches("current-pass", STORED_HASH)).thenReturn(true);

    assertThatThrownBy(
            () ->
                service.changePassword(
                    request,
                    new ChangePasswordRequest("current-pass", "NewPassw0rd@1", "Different@123")))
        .isInstanceOf(PasswordsDoNotMatchException.class)
        .hasMessage("Passwords do not match");

    assertThat(currentUser.getPassword()).isEqualTo(STORED_HASH);
    verify(passwordEncoder, never()).encode(eq("NewPassw0rd@1"));
    verify(userRepository, never()).save(any(User.class));
  }
}
