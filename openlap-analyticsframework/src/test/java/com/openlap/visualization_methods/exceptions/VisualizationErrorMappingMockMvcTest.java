package com.openlap.visualization_methods.exceptions;

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
 * Proves the migrated visualization_methods exceptions render the unified error envelope (via the
 * auto-loaded GlobalApiExceptionHandler — the legacy VisualizationLibrary/Type ExceptionHandlers
 * are gone) with stable codes, trace id, the legacy compat alias, and no leaked cause.
 *
 * <p>Status notes vs the legacy contract: both NOT_FOUND cases (404) and class-load (500) are
 * preserved; invalid-input is normalized 409 → 400 (a bad-input case mislabelled as a conflict).
 * The shared {@code exception/GlobalExceptionHandler} still declares a shadowed handler for
 * {@code VisualizationClassLoaderException}; this test confirms the unified handler now wins.
 */
@RunWith(SpringRunner.class)
@WebMvcTest(
    controllers = VisualizationErrorTestController.class,
    excludeFilters =
        @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = SecurityConfig.class))
@AutoConfigureMockMvc(addFilters = false)
@Import(ApiErrorResponseFactory.class)
@TestPropertySource(properties = "openlap.api.error.legacy-compat=true")
public class VisualizationErrorMappingMockMvcTest {

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
        .perform(get("/visualization-error-test" + path))
        .andExpect(status().is(httpStatus))
        .andExpect(jsonPath("$.status").value(httpStatus))
        .andExpect(jsonPath("$.code").value(code))
        .andExpect(jsonPath("$.message").value(message))
        .andExpect(jsonPath("$.path").value("/visualization-error-test" + path))
        .andExpect(jsonPath("$.traceId").value("test-trace"))
        .andExpect(jsonPath("$.httpStatus").exists()) // legacy compatibility alias
        .andExpect(jsonPath("$.cause").doesNotExist());
  }

  @Test
  public void libraryNotFound() throws Exception {
    assertUnifiedError(
        "/library-not-found", 404, "VISUALIZATION_LIBRARY_NOT_FOUND",
        "Visualization library with id 'X' not found");
  }

  @Test
  public void typeNotFound() throws Exception {
    assertUnifiedError(
        "/type-not-found", 404, "VISUALIZATION_TYPE_NOT_FOUND",
        "Visualization type with id 'X' not found");
  }

  @Test
  public void invalidInputNowReturns400() throws Exception {
    assertUnifiedError(
        "/invalid-input", 400, "VISUALIZATION_METHOD_INVALID_INPUT",
        "The mapping between the visualization inputs and analytics technique output is invalid.");
  }

  @Test
  public void classLoad() throws Exception {
    assertUnifiedError(
        "/class-load", 500, "VISUALIZATION_METHOD_CLASS_LOAD_FAILED",
        "Unable to load visualization method class");
  }
}
