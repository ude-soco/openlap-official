package com.openlap.user.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.openlap.user.entities.Role;
import com.openlap.user.entities.RoleType;
import com.openlap.user.entities.User;
import com.openlap.user.exception.role.LastSuperAdminException;
import com.openlap.user.exception.role.RoleNotAllowedException;
import com.openlap.user.repositories.RoleRepository;
import com.openlap.user.repositories.UserRepository;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import org.bson.types.ObjectId;
import org.junit.Test;

/** Unit tests for the admin role-replacement guardrails. */
public class UserRoleServiceImplTest {

  private static final String SUPER_ADMIN_ROLE_ID = "aaaaaaaaaaaaaaaaaaaaaaaa";

  private final RoleRepository roleRepository = mock(RoleRepository.class);
  private final UserRepository userRepository = mock(UserRepository.class);
  private final UserRoleServiceImpl service =
      new UserRoleServiceImpl(roleRepository, userRepository);

  private static User userWithRoles(RoleType... roleTypes) {
    User user = new User();
    user.setEmail("u@mail.com");
    List<Role> roles = new ArrayList<>();
    for (RoleType roleType : roleTypes) {
      roles.add(new Role("id-" + roleType, roleType));
    }
    user.setRoles(roles);
    return user;
  }

  @Test
  public void rejectsEmptyRoleSet() {
    assertThatThrownBy(
            () -> service.replaceUserRoles(userWithRoles(RoleType.ROLE_USER), new HashSet<>()))
        .isInstanceOf(RoleNotAllowedException.class);
    verify(userRepository, never()).save(any());
  }

  @Test
  public void rejectsUserAndWithoutLrsCombination() {
    assertThatThrownBy(
            () ->
                service.replaceUserRoles(
                    userWithRoles(RoleType.ROLE_USER),
                    new HashSet<>(
                        Arrays.asList(RoleType.ROLE_USER, RoleType.ROLE_USER_WITHOUT_LRS))))
        .isInstanceOf(RoleNotAllowedException.class);
    verify(userRepository, never()).save(any());
  }

  @Test
  public void replacesRolesForNonAdmin() {
    User user = userWithRoles(RoleType.ROLE_USER);
    when(roleRepository.findByName(RoleType.ROLE_DATA_PROVIDER))
        .thenReturn(new Role("dp-id", RoleType.ROLE_DATA_PROVIDER));

    service.replaceUserRoles(user, new HashSet<>(Arrays.asList(RoleType.ROLE_DATA_PROVIDER)));

    assertThat(user.getRoles()).hasSize(1);
    assertThat(user.getRoles().iterator().next().getName())
        .isEqualTo(RoleType.ROLE_DATA_PROVIDER);
    verify(userRepository).save(user);
  }

  @Test
  public void blocksRemovingTheLastSuperAdmin() {
    User user = userWithRoles(RoleType.ROLE_SUPER_ADMIN);
    when(roleRepository.findByName(RoleType.ROLE_SUPER_ADMIN))
        .thenReturn(new Role(SUPER_ADMIN_ROLE_ID, RoleType.ROLE_SUPER_ADMIN));
    when(userRepository.countActiveByRoleId(new ObjectId(SUPER_ADMIN_ROLE_ID))).thenReturn(1L);

    assertThatThrownBy(
            () -> service.replaceUserRoles(user, new HashSet<>(Arrays.asList(RoleType.ROLE_USER))))
        .isInstanceOf(LastSuperAdminException.class);
    verify(userRepository, never()).save(any());
  }

  @Test
  public void allowsRemovingSuperAdminWhenAnotherRemains() {
    User user = userWithRoles(RoleType.ROLE_SUPER_ADMIN);
    when(roleRepository.findByName(RoleType.ROLE_SUPER_ADMIN))
        .thenReturn(new Role(SUPER_ADMIN_ROLE_ID, RoleType.ROLE_SUPER_ADMIN));
    when(userRepository.countActiveByRoleId(new ObjectId(SUPER_ADMIN_ROLE_ID))).thenReturn(2L);
    when(roleRepository.findByName(RoleType.ROLE_USER))
        .thenReturn(new Role("user-id", RoleType.ROLE_USER));

    service.replaceUserRoles(user, new HashSet<>(Arrays.asList(RoleType.ROLE_USER)));

    assertThat(user.getRoles()).hasSize(1);
    assertThat(user.getRoles().iterator().next().getName()).isEqualTo(RoleType.ROLE_USER);
    verify(userRepository).save(user);
  }
}
