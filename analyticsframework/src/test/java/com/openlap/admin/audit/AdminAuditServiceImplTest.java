package com.openlap.admin.audit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.openlap.user.dto.request.TokenRequest;
import com.openlap.user.entities.User;
import com.openlap.user.repositories.UserRepository;
import com.openlap.user.services.TokenService;
import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockHttpServletRequest;

public class AdminAuditServiceImplTest {

  private final AdminAuditLogRepository auditLogRepository = mock(AdminAuditLogRepository.class);
  private final TokenService tokenService = mock(TokenService.class);
  private final UserRepository userRepository = mock(UserRepository.class);
  private final AdminAuditServiceImpl service =
      new AdminAuditServiceImpl(auditLogRepository, tokenService, userRepository);

  @Test
  public void logSuccessCreatesAuditLogAndSanitizesSecretMetadata() {
    MockHttpServletRequest request = new MockHttpServletRequest();
    when(tokenService.verifyToken(request))
        .thenReturn(new TokenRequest("admin@mail.com", new String[] {"ROLE_SUPER_ADMIN"}, "tok", null));
    User actor = new User();
    actor.setId("admin-id");
    actor.setEmail("admin@mail.com");
    when(userRepository.findByEmail("admin@mail.com")).thenReturn(actor);

    Map<String, Object> nested = new LinkedHashMap<>();
    nested.put("basicSecret", "hidden");
    nested.put("safeNested", "kept");
    Map<String, Object> metadata = new LinkedHashMap<>();
    metadata.put("password", "hidden");
    metadata.put("basicAuth", "hidden");
    metadata.put("basicSecret", "hidden");
    metadata.put("basicKey", "hidden");
    metadata.put("safe", "kept");
    metadata.put("nested", nested);

    service.logSuccess(
        request,
        AdminAuditActions.USER_UPDATE,
        AdminResourceTypes.USER,
        "u1",
        "alice@mail.com",
        metadata);

    ArgumentCaptor<AdminAuditLog> captor = ArgumentCaptor.forClass(AdminAuditLog.class);
    verify(auditLogRepository).save(captor.capture());
    AdminAuditLog log = captor.getValue();
    assertThat(log.getActorUserId()).isEqualTo("admin-id");
    assertThat(log.getActorEmail()).isEqualTo("admin@mail.com");
    assertThat(log.getAction()).isEqualTo(AdminAuditActions.USER_UPDATE);
    assertThat(log.getOutcome()).isEqualTo(AdminAuditOutcomes.SUCCESS);
    assertThat(log.getMetadata()).containsEntry("safe", "kept");
    assertThat(log.getMetadata()).doesNotContainKeys("password", "basicAuth", "basicSecret", "basicKey");
    @SuppressWarnings("unchecked")
    Map<String, Object> nestedMetadata = (Map<String, Object>) log.getMetadata().get("nested");
    assertThat(nestedMetadata).containsEntry("safeNested", "kept").doesNotContainKey("basicSecret");
  }

  @Test
  public void auditStoreFailureDoesNotBreakCaller() {
    MockHttpServletRequest request = new MockHttpServletRequest();
    when(auditLogRepository.save(any())).thenThrow(new RuntimeException("mongo down"));

    assertThatCode(
            () ->
                service.logSuccess(
                    request,
                    AdminAuditActions.USER_STATUS_UPDATE,
                    AdminResourceTypes.USER,
                    "u1",
                    "alice@mail.com",
                    new LinkedHashMap<>()))
        .doesNotThrowAnyException();
  }
}
