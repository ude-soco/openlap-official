package com.openlap.user.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.openlap.analytics_statements.services.LrsService;
import com.openlap.analytics_statements.services.StatementService;
import com.openlap.user.dto.request.AdminUpdateUserRequest;
import com.openlap.user.dto.response.AdminUserDetailResponse;
import com.openlap.user.entities.Role;
import com.openlap.user.entities.RoleType;
import com.openlap.user.entities.User;
import com.openlap.user.exception.role.LastSuperAdminException;
import com.openlap.user.exception.user.EmailAlreadyTakenException;
import com.openlap.user.repositories.UserRepository;
import com.openlap.user.services.TokenService;
import com.openlap.user.services.UserRoleService;
import java.util.Collections;
import java.util.Optional;
import org.bson.types.ObjectId;
import org.junit.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

/** Unit tests for the admin user update (name/email; no password). */
public class AdminUserUpdateTest {

  private static final String SUPER_ADMIN_ROLE_ID = "aaaaaaaaaaaaaaaaaaaaaaaa";

  private final UserRepository userRepository = mock(UserRepository.class);
  private final UserServiceImpl service =
      new UserServiceImpl(
          userRepository,
          mock(TokenService.class),
          mock(LrsService.class),
          mock(StatementService.class),
          mock(UserRoleService.class),
          mock(PasswordEncoder.class));

  private static User user(String id, String name, String email) {
    User user = new User();
    user.setId(id);
    user.setName(name);
    user.setEmail(email);
    return user;
  }

  @Test
  public void updatesNameAndEmail() {
    when(userRepository.findById("u1")).thenReturn(Optional.of(user("u1", "Old", "old@mail.com")));
    when(userRepository.existsByEmail("new@mail.com")).thenReturn(false);
    when(userRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

    AdminUserDetailResponse detail =
        service.updateUserByAdmin("u1", new AdminUpdateUserRequest("New", "new@mail.com"));

    assertThat(detail.getName()).isEqualTo("New");
    assertThat(detail.getEmail()).isEqualTo("new@mail.com");
  }

  @Test
  public void rejectsDuplicateEmail() {
    when(userRepository.findById("u1")).thenReturn(Optional.of(user("u1", "Old", "old@mail.com")));
    when(userRepository.existsByEmail("taken@mail.com")).thenReturn(true);

    assertThatThrownBy(
            () ->
                service.updateUserByAdmin(
                    "u1", new AdminUpdateUserRequest("Old", "taken@mail.com")))
        .isInstanceOf(EmailAlreadyTakenException.class);
    verify(userRepository, never()).save(any());
  }

  @Test
  public void unchangedEmailSkipsUniquenessCheck() {
    when(userRepository.findById("u1"))
        .thenReturn(Optional.of(user("u1", "Old", "same@mail.com")));
    when(userRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

    AdminUserDetailResponse detail =
        service.updateUserByAdmin("u1", new AdminUpdateUserRequest("Renamed", "same@mail.com"));

    assertThat(detail.getName()).isEqualTo("Renamed");
    verify(userRepository, never()).existsByEmail(anyString());
  }

  @Test
  public void adminCanDisableAndEnableUser() {
    User user = user("u1", "Alice", "alice@mail.com");
    user.setEnabled(true);
    when(userRepository.findById("u1")).thenReturn(Optional.of(user));
    when(userRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

    AdminUserDetailResponse disabled = service.setUserEnabled("u1", false);
    AdminUserDetailResponse enabled = service.setUserEnabled("u1", true);

    assertThat(disabled.isEnabled()).isFalse();
    assertThat(enabled.isEnabled()).isTrue();
    verify(userRepository, times(2)).save(user);
  }

  @Test
  public void blocksDisablingLastActiveSuperAdmin() {
    User user = user("admin1", "Admin", "admin@mail.com");
    user.setEnabled(true);
    user.setRoles(
        Collections.singletonList(new Role(SUPER_ADMIN_ROLE_ID, RoleType.ROLE_SUPER_ADMIN)));
    when(userRepository.findById("admin1")).thenReturn(Optional.of(user));
    when(userRepository.countActiveByRoleId(new ObjectId(SUPER_ADMIN_ROLE_ID))).thenReturn(1L);

    assertThatThrownBy(() -> service.setUserEnabled("admin1", false))
        .isInstanceOf(LastSuperAdminException.class);
    verify(userRepository, never()).save(any());
  }

  @Test
  public void allowsDisablingSuperAdminWhenAnotherActiveSuperAdminRemains() {
    User user = user("admin1", "Admin", "admin@mail.com");
    user.setEnabled(true);
    user.setRoles(
        Collections.singletonList(new Role(SUPER_ADMIN_ROLE_ID, RoleType.ROLE_SUPER_ADMIN)));
    when(userRepository.findById("admin1")).thenReturn(Optional.of(user));
    when(userRepository.countActiveByRoleId(new ObjectId(SUPER_ADMIN_ROLE_ID))).thenReturn(2L);
    when(userRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

    AdminUserDetailResponse detail = service.setUserEnabled("admin1", false);

    assertThat(detail.isEnabled()).isFalse();
    verify(userRepository).save(user);
  }
}
