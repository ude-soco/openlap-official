package com.openlap.user.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openlap.analytics_statements.entities.LrsStore;
import com.openlap.analytics_statements.entities.utility_entities.UniqueIdentifierType;
import com.openlap.analytics_statements.services.LrsService;
import com.openlap.analytics_statements.services.StatementService;
import com.openlap.infrastructure.exception.ServiceException;
import com.openlap.user.dto.response.AdminUserDetailResponse;
import com.openlap.user.entities.Role;
import com.openlap.user.entities.RoleType;
import com.openlap.user.entities.User;
import com.openlap.user.entities.utility_entities.LrsConsumer;
import com.openlap.user.entities.utility_entities.LrsProvider;
import com.openlap.user.exception.user.UserNotFoundException;
import com.openlap.user.repositories.UserRepository;
import com.openlap.user.services.TokenService;
import com.openlap.user.services.UserRoleService;
import java.util.Collections;
import java.util.Optional;
import org.bson.types.ObjectId;
import org.junit.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

/** Unit tests for the admin user-detail mapping (roles + secret-free LRS connections). */
public class AdminUserDetailMappingTest {

  private final UserRepository userRepository = mock(UserRepository.class);
  private final LrsService lrsService = mock(LrsService.class);
  private final UserServiceImpl service =
      new UserServiceImpl(
          userRepository,
          mock(TokenService.class),
          lrsService,
          mock(StatementService.class),
          mock(UserRoleService.class),
          mock(PasswordEncoder.class));

  private static LrsStore store(String id, String title, Integer statementCount) {
    LrsStore lrsStore = new LrsStore();
    lrsStore.setId(id);
    lrsStore.setTitle(title);
    lrsStore.setStatementCount(statementCount);
    return lrsStore;
  }

  @Test
  public void mapsRolesAndLrsConnectionsAndNeverResolvesTheClient() {
    User user = new User();
    user.setId("u1");
    user.setName("Alice");
    user.setEmail("alice@mail.com");
    user.setRoles(Collections.singletonList(new Role("r1", RoleType.ROLE_USER)));
    user.setLrsConsumerList(
        Collections.singletonList(new LrsConsumer(new ObjectId(), "lrsC", "mailto:alice@x.com")));
    user.setLrsProviderList(
        Collections.singletonList(new LrsProvider("lrsP", "client1", UniqueIdentifierType.MBOX)));

    when(userRepository.findById("u1")).thenReturn(Optional.of(user));
    when(lrsService.getLrsStore("lrsC")).thenReturn(store("lrsC", "Course LRS", null));
    when(lrsService.getLrsStore("lrsP")).thenReturn(store("lrsP", "Provider LRS", 42));

    AdminUserDetailResponse detail = service.getUserDetailById("u1");

    assertThat(detail.getId()).isEqualTo("u1");
    assertThat(detail.getEmail()).isEqualTo("alice@mail.com");
    assertThat(detail.getRoles()).containsExactly("ROLE_USER");
    assertThat(detail.isEnabled()).isTrue();

    assertThat(detail.getLrsConsumerConnections()).hasSize(1);
    assertThat(detail.getLrsConsumerConnections().get(0).getLrsTitle()).isEqualTo("Course LRS");
    assertThat(detail.getLrsConsumerConnections().get(0).getUniqueIdentifier())
        .isEqualTo("mailto:alice@x.com");

    assertThat(detail.getLrsProviderConnections()).hasSize(1);
    assertThat(detail.getLrsProviderConnections().get(0).getLrsTitle()).isEqualTo("Provider LRS");
    assertThat(detail.getLrsProviderConnections().get(0).getStatementCount()).isEqualTo(42);
    assertThat(detail.getLrsProviderConnections().get(0).getUniqueIdentifierType())
        .isEqualTo("MBOX");

    // The LRS client (which holds the basic-auth secret) must never be resolved.
    verify(lrsService, never()).getLrsClient(anyString());
  }

  @Test
  public void adminUserDetailJsonIncludesEnabledAndNoSecrets() throws Exception {
    User user = new User();
    user.setId("u1");
    user.setName("Alice");
    user.setEmail("alice@mail.com");
    user.setPassword("secret-hash");
    user.setEnabled(false);
    user.setRoles(Collections.singletonList(new Role("r1", RoleType.ROLE_USER)));
    when(userRepository.findById("u1")).thenReturn(Optional.of(user));

    AdminUserDetailResponse detail = service.getUserDetailById("u1");
    String json = new ObjectMapper().writeValueAsString(detail);

    assertThat(json).contains("\"enabled\":false");
    assertThat(json).doesNotContain("password");
    assertThat(json).doesNotContain("basicAuth");
    assertThat(json).doesNotContain("basicSecret");
    assertThat(json).doesNotContain("basicKey");
  }

  @Test
  public void missingLrsStoreFallsBackToUnknownTitleInsteadOfCrashing() {
    User user = new User();
    user.setId("u2");
    user.setLrsProviderList(
        Collections.singletonList(new LrsProvider("gone", "client9", UniqueIdentifierType.MBOX)));

    when(userRepository.findById("u2")).thenReturn(Optional.of(user));
    when(lrsService.getLrsStore("gone"))
        .thenThrow(new ServiceException("No LRS found with id: gone"));

    AdminUserDetailResponse detail = service.getUserDetailById("u2");

    assertThat(detail.getLrsProviderConnections()).hasSize(1);
    assertThat(detail.getLrsProviderConnections().get(0).getLrsTitle()).isEqualTo("Unknown LRS");
    assertThat(detail.getLrsProviderConnections().get(0).getLrsId()).isEqualTo("gone");
  }

  @Test
  public void unknownUserThrowsNotFound() {
    when(userRepository.findById("missing")).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.getUserDetailById("missing"))
        .isInstanceOf(UserNotFoundException.class);
  }
}
