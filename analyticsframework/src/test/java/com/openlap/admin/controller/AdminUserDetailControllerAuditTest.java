package com.openlap.admin.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.openlap.admin.audit.AdminAuditActions;
import com.openlap.admin.audit.AdminAuditService;
import com.openlap.admin.audit.AdminResourceTypes;
import com.openlap.user.dto.request.AdminUpdateRolesRequest;
import com.openlap.user.dto.request.AdminUpdateUserStatusRequest;
import com.openlap.user.dto.response.AdminUserDetailResponse;
import com.openlap.user.entities.RoleType;
import com.openlap.user.exception.role.LastSuperAdminException;
import com.openlap.user.services.UserService;
import java.util.Collections;
import java.util.Map;
import org.junit.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockHttpServletRequest;

public class AdminUserDetailControllerAuditTest {

  private final UserService userService = mock(UserService.class);
  private final AdminAuditService adminAuditService = mock(AdminAuditService.class);
  private final AdminUserDetailController controller =
      new AdminUserDetailController(userService, adminAuditService);
  private final MockHttpServletRequest request = new MockHttpServletRequest();

  @Test
  public void successfulUserStatusChangeCreatesAuditLog() {
    when(userService.getUserDetailById("u1"))
        .thenReturn(userDetail(true, Collections.singletonList("ROLE_USER")));
    when(userService.setUserEnabled("u1", false))
        .thenReturn(userDetail(false, Collections.singletonList("ROLE_USER")));

    controller.updateUserStatus(request, "u1", new AdminUpdateUserStatusRequest(false));

    ArgumentCaptor<Map<String, Object>> metadataCaptor = ArgumentCaptor.forClass(Map.class);
    verify(adminAuditService)
        .logSuccess(
            eq(request),
            eq(AdminAuditActions.USER_STATUS_UPDATE),
            eq(AdminResourceTypes.USER),
            eq("u1"),
            eq("alice@mail.com"),
            metadataCaptor.capture());
    assertThat(metadataCaptor.getValue())
        .containsEntry("oldEnabled", true)
        .containsEntry("newEnabled", false);
  }

  @Test
  public void failedLastSuperAdminDisableCreatesFailureAuditLog() {
    when(userService.getUserDetailById("u1"))
        .thenReturn(userDetail(true, Collections.singletonList("ROLE_SUPER_ADMIN")));
    when(userService.setUserEnabled("u1", false))
        .thenThrow(new LastSuperAdminException("Cannot deactivate the last active super admin."));

    assertThatThrownBy(
            () -> controller.updateUserStatus(request, "u1", new AdminUpdateUserStatusRequest(false)))
        .isInstanceOf(LastSuperAdminException.class);

    ArgumentCaptor<Map<String, Object>> metadataCaptor = ArgumentCaptor.forClass(Map.class);
    verify(adminAuditService)
        .logFailure(
            eq(request),
            eq(AdminAuditActions.USER_STATUS_UPDATE),
            eq(AdminResourceTypes.USER),
            eq("u1"),
            eq("alice@mail.com"),
            eq("Cannot deactivate the last active super admin."),
            metadataCaptor.capture());
    assertThat(metadataCaptor.getValue())
        .containsEntry("oldEnabled", true)
        .containsEntry("requestedEnabled", false);
  }

  @Test
  public void roleUpdateLogsOldAndNewRoles() {
    when(userService.getUserDetailById("u1"))
        .thenReturn(userDetail(true, Collections.singletonList("ROLE_USER")));
    when(userService.replaceUserRoles("u1", Collections.singleton(RoleType.ROLE_DATA_PROVIDER)))
        .thenReturn(userDetail(true, Collections.singletonList("ROLE_DATA_PROVIDER")));

    controller.updateUserRoles(
        request,
        "u1",
        new AdminUpdateRolesRequest(Collections.singleton(RoleType.ROLE_DATA_PROVIDER)));

    ArgumentCaptor<Map<String, Object>> metadataCaptor = ArgumentCaptor.forClass(Map.class);
    verify(adminAuditService)
        .logSuccess(
            eq(request),
            eq(AdminAuditActions.USER_ROLES_UPDATE),
            eq(AdminResourceTypes.USER),
            eq("u1"),
            eq("alice@mail.com"),
            metadataCaptor.capture());
    assertThat(metadataCaptor.getValue())
        .containsEntry("oldRoles", Collections.singletonList("ROLE_USER"))
        .containsEntry("newRoles", Collections.singletonList("ROLE_DATA_PROVIDER"));
  }

  @Test
  public void auditServiceFailureDoesNotBreakSuccessfulAdminAction() {
    when(userService.getUserDetailById("u1"))
        .thenReturn(userDetail(true, Collections.singletonList("ROLE_USER")));
    when(userService.setUserEnabled("u1", false))
        .thenReturn(userDetail(false, Collections.singletonList("ROLE_USER")));
    doThrow(new RuntimeException("audit down"))
        .when(adminAuditService)
        .logSuccess(any(), any(), any(), any(), any(), any());

    assertThatCode(
            () -> controller.updateUserStatus(request, "u1", new AdminUpdateUserStatusRequest(false)))
        .doesNotThrowAnyException();
  }

  private AdminUserDetailResponse userDetail(boolean enabled, java.util.List<String> roles) {
    return new AdminUserDetailResponse(
        "u1", "Alice", "alice@mail.com", roles, enabled, Collections.emptyList(), Collections.emptyList());
  }
}
