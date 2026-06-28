package com.openlap.analytics_module.exceptions;

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
 * Proves the migrated analytics_module exceptions render the unified error envelope (via the
 * auto-loaded GlobalApiExceptionHandler — the legacy goal/question/indicator handlers are gone)
 * with stable codes, trace id, the legacy compat alias, and no leaked cause.
 *
 * <p>Statuses across all three groups are preserved (404 / 409 / 403). One behaviour FIX: the
 * legacy {@code AnalyticsGoalExceptionHandler} mapped {@code AnalyticsGoalAlreadyExistsException}
 * with the wrong parameter type, so it errored at invocation (effectively a 500) instead of 409;
 * after migration it returns a clean 409.
 */
@RunWith(SpringRunner.class)
@WebMvcTest(
    controllers = AnalyticsModuleErrorTestController.class,
    excludeFilters =
        @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = SecurityConfig.class))
@AutoConfigureMockMvc(addFilters = false)
@Import(ApiErrorResponseFactory.class)
@TestPropertySource(properties = "openlap.api.error.legacy-compat=true")
public class AnalyticsModuleErrorMappingMockMvcTest {

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
        .perform(get("/analytics-module-error-test" + path))
        .andExpect(status().is(httpStatus))
        .andExpect(jsonPath("$.status").value(httpStatus))
        .andExpect(jsonPath("$.code").value(code))
        .andExpect(jsonPath("$.message").value(message))
        .andExpect(jsonPath("$.path").value("/analytics-module-error-test" + path))
        .andExpect(jsonPath("$.traceId").value("test-trace"))
        .andExpect(jsonPath("$.httpStatus").exists()) // legacy compatibility alias
        .andExpect(jsonPath("$.cause").doesNotExist());
  }

  // --- goal group ---

  @Test
  public void goalQuestionNotFound() throws Exception {
    assertUnifiedError(
        "/goal-question-not-found", 404, "ANALYTICS_QUESTION_NOT_FOUND",
        "Analytics question with id 'X' not found");
  }

  @Test
  public void goalAlreadyExistsNowReturns409() throws Exception {
    // Previously errored (wrong handler param type); now a clean 409 via ConflictException.
    assertUnifiedError(
        "/goal-already-exists", 409, "ANALYTICS_GOAL_ALREADY_EXISTS", "Analytics goal already exists");
  }

  // --- question group ---

  @Test
  public void questionNotFound() throws Exception {
    assertUnifiedError(
        "/question-not-found", 404, "ANALYTICS_QUESTION_NOT_FOUND",
        "Analytics question with id 'X' not found");
  }

  @Test
  public void questionAlreadyExists() throws Exception {
    assertUnifiedError(
        "/question-already-exists", 409, "ANALYTICS_QUESTION_ALREADY_EXISTS",
        "Analytics question already exists");
  }

  @Test
  public void questionMethodNotAllowed() throws Exception {
    assertUnifiedError(
        "/question-method-not-allowed", 403, "ANALYTICS_QUESTION_METHOD_NOT_ALLOWED",
        "You do not have the permission to update question");
  }

  // --- indicator group ---

  @Test
  public void indicatorNotFound() throws Exception {
    assertUnifiedError(
        "/indicator-not-found", 404, "INDICATOR_NOT_FOUND", "Indicator with id 'X' not found");
  }

  @Test
  public void indicatorManipulation() throws Exception {
    assertUnifiedError(
        "/indicator-manipulation", 403, "INDICATOR_MANIPULATION_NOT_ALLOWED",
        "You do not have permission to modify this indicator");
  }

  @Test
  public void previewNotPossible() throws Exception {
    assertUnifiedError(
        "/preview-not-possible", 403, "INDICATOR_PREVIEW_NOT_POSSIBLE",
        "Duplication not possible. User do not belong to the same LRS");
  }
}
