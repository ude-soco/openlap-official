package com.openlap.user.exception;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.openlap.analytics_engine.services.EngineService;
import com.openlap.infrastructure.error.ApiErrorResponseFactory;
import com.openlap.security.SecurityConfig;
import com.openlap.user.services.UserRegisterService;
import com.openlap.user.services.UserRoleService;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit4.SpringRunner;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Proves the migrated user-module exceptions render the unified error envelope (via the auto-loaded
 * GlobalApiExceptionHandler — the legacy UserExceptionHandler/RoleExceptionHandler are gone) with
 * preserved HTTP statuses, stable codes, trace id, the legacy compat alias, and no cause.
 */
@RunWith(SpringRunner.class)
@WebMvcTest(
    controllers = UserErrorTestController.class,
    excludeFilters =
        @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = SecurityConfig.class))
@AutoConfigureMockMvc(addFilters = false)
@Import(ApiErrorResponseFactory.class)
@TestPropertySource(properties = "openlap.api.error.legacy-compat=true")
public class UserModuleErrorMappingMockMvcTest {

  @Autowired private MockMvc mockMvc;

  // bootstrap CommandLineRunner collaborators (kept off MongoDB)
  @MockBean private UserRegisterService userRegisterService;
  @MockBean private UserRoleService userRoleService;
  @MockBean private EngineService engineService;

  @Before
  public void seedTraceId() {
    // TraceIdFilter is disabled in this slice; seed the MDC so traceId appears in the envelope.
    MDC.put(ApiErrorResponseFactory.TRACE_ID_MDC_KEY, "test-trace");
  }

  @After
  public void clearMdc() {
    MDC.clear();
  }

  private void assertUnifiedError(String path, int httpStatus, String code, String message)
      throws Exception {
    mockMvc
        .perform(get("/user-error-test" + path))
        .andExpect(status().is(httpStatus))
        .andExpect(jsonPath("$.status").value(httpStatus))
        .andExpect(jsonPath("$.code").value(code))
        .andExpect(jsonPath("$.message").value(message))
        .andExpect(jsonPath("$.path").value("/user-error-test" + path))
        .andExpect(jsonPath("$.traceId").value("test-trace"))
        .andExpect(jsonPath("$.httpStatus").exists()) // legacy compatibility alias
        .andExpect(jsonPath("$.cause").doesNotExist());
  }

  @Test
  public void userNotFound() throws Exception {
    assertUnifiedError("/user-not-found", 404, "USER_NOT_FOUND", "User not found.");
  }

  @Test
  public void roleNotFound() throws Exception {
    assertUnifiedError("/role-not-found", 404, "ROLE_NOT_FOUND", "Role 'X' not found");
  }

  @Test
  public void duplicateEmail() throws Exception {
    assertUnifiedError("/email-taken", 409, "EMAIL_ALREADY_TAKEN", "Email already taken.");
  }

  @Test
  public void roleAlreadyExists() throws Exception {
    assertUnifiedError("/role-exists", 409, "ROLE_ALREADY_EXISTS", "Role already exists");
  }

  // --- PR4.1 normalized statuses ---

  @Test
  public void passwordMismatchNowReturns400() throws Exception {
    assertUnifiedError("/password-mismatch", 400, "PASSWORDS_DO_NOT_MATCH", "Passwords do not match");
  }

  @Test
  public void invalidUserDetailsNowReturns400() throws Exception {
    assertUnifiedError(
        "/invalid-details", 400, "INVALID_USER_DETAILS",
        "Only one of LRS provider/consumer should be provided");
  }

  @Test
  public void invalidLrsUserNowReturns400() throws Exception {
    assertUnifiedError("/invalid-lrs", 400, "INVALID_LRS_USER", "Not a valid LRS user.");
  }

  @Test
  public void roleNotAllowedNowReturns403() throws Exception {
    assertUnifiedError("/role-not-allowed", 403, "ROLE_NOT_ALLOWED", "Role not allowed");
  }
}
