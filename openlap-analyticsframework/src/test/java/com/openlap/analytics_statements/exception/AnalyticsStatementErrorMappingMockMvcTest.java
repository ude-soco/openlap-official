package com.openlap.analytics_statements.exception;

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
 * Proves the migrated analytics_statements exceptions render the unified error envelope (via the
 * auto-loaded GlobalApiExceptionHandler — the legacy AnalyticsStatementExceptionHandler is gone)
 * with preserved HTTP statuses, stable codes, trace id, the legacy compat alias, and no leaked
 * cause.
 *
 * <p>Pre-migration these returned a legacy {@code ExceptionResponse} body without a {@code code};
 * the statuses (404/409/403) are unchanged. The shared {@code DatabaseOperationException} is
 * intentionally NOT migrated in this PR and its behaviour is asserted to be unchanged.
 */
@RunWith(SpringRunner.class)
@WebMvcTest(
    controllers = AnalyticsStatementErrorTestController.class,
    excludeFilters =
        @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = SecurityConfig.class))
@AutoConfigureMockMvc(addFilters = false)
@Import(ApiErrorResponseFactory.class)
@TestPropertySource(properties = "openlap.api.error.legacy-compat=true")
public class AnalyticsStatementErrorMappingMockMvcTest {

  @Autowired private MockMvc mockMvc;

  // bootstrap CommandLineRunner collaborators (kept off MongoDB)
  @MockBean private UserRegisterService userRegisterService;
  @MockBean private UserRoleService userRoleService;
  @MockBean private EngineService engineService;

  @Before
  public void seedTraceId() {
    MDC.put(ApiErrorResponseFactory.TRACE_ID_MDC_KEY, "test-trace");
  }

  @After
  public void clearMdc() {
    MDC.clear();
  }

  private void assertUnifiedError(String path, int httpStatus, String code, String message)
      throws Exception {
    mockMvc
        .perform(get("/analytics-statement-error-test" + path))
        .andExpect(status().is(httpStatus))
        .andExpect(jsonPath("$.status").value(httpStatus))
        .andExpect(jsonPath("$.code").value(code))
        .andExpect(jsonPath("$.message").value(message))
        .andExpect(jsonPath("$.path").value("/analytics-statement-error-test" + path))
        .andExpect(jsonPath("$.traceId").value("test-trace"))
        .andExpect(jsonPath("$.httpStatus").exists()) // legacy compatibility alias
        .andExpect(jsonPath("$.cause").doesNotExist());
  }

  @Test
  public void lrsNotFound() throws Exception {
    assertUnifiedError("/lrs-not-found", 404, "LRS_NOT_FOUND", "LRS id not found");
  }

  @Test
  public void lrsAlreadyExists() throws Exception {
    assertUnifiedError(
        "/lrs-already-exists",
        409,
        "LRS_ALREADY_EXISTS",
        "LRS with this title already exist. Please choose another title.");
  }

  @Test
  public void lrsManipulation() throws Exception {
    assertUnifiedError(
        "/lrs-manipulation",
        403,
        "LRS_MANIPULATION_NOT_ALLOWED",
        "You do not have permission to update the LRS");
  }

  @Test
  public void databaseFailureNowUsesUnifiedEnvelope() throws Exception {
    // DatabaseOperationException is now an InfrastructureException (legacy com.openlap.exception
    // retired): 500 with a stable code via the unified handler, no cause.
    mockMvc
        .perform(get("/analytics-statement-error-test/database-failure"))
        .andExpect(status().is(500))
        .andExpect(jsonPath("$.code").value("DATABASE_OPERATION_FAILED"))
        .andExpect(jsonPath("$.cause").doesNotExist());
  }
}
