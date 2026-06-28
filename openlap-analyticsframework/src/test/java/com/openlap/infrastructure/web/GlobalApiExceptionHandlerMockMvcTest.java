package com.openlap.infrastructure.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.openlap.infrastructure.error.ApiErrorResponseFactory;
import com.openlap.security.SecurityConfig;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit4.SpringRunner;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Drives the new unified handler + catch-all through the real MVC stack and asserts that legacy
 * advices still take precedence for the exceptions they own. Security filters are disabled
 * ({@code addFilters=false}) so requests reach the controller; this test is about error mapping.
 */
@RunWith(SpringRunner.class)
@WebMvcTest(
    controllers = ErrorTestController.class,
    // Exclude the app's WebSecurityConfigurerAdapter; this slice tests error mapping, not security,
    // and runs with addFilters=false. Avoids pulling in its UserDetailsService/etc. dependencies.
    excludeFilters =
        @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = SecurityConfig.class))
@AutoConfigureMockMvc(addFilters = false)
@Import({
  ApiErrorResponseFactory.class,
  com.openlap.infrastructure.error.ErrorResponseWriter.class,
  CatchAllExceptionResolver.class
})
@TestPropertySource(properties = "openlap.api.error.legacy-compat=true")
public class GlobalApiExceptionHandlerMockMvcTest {

  @Autowired private MockMvc mockMvc;

  // The main class's bootstrap CommandLineRunner @Bean is instantiated in the slice; mock its
  // collaborators so no MongoDB-backed services are required.
  @org.springframework.boot.test.mock.mockito.MockBean
  private com.openlap.user.services.UserRegisterService userRegisterService;

  @org.springframework.boot.test.mock.mockito.MockBean
  private com.openlap.user.services.UserRoleService userRoleService;

  @org.springframework.boot.test.mock.mockito.MockBean
  private com.openlap.analytics_engine.services.EngineService engineService;

  @Test
  public void openLapExceptionRendersUnifiedEnvelope() throws Exception {
    mockMvc
        .perform(post("/test/openlap-notfound"))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.status").value(404))
        .andExpect(jsonPath("$.error").value("NOT_FOUND"))
        .andExpect(jsonPath("$.code").value("USER_NOT_FOUND"))
        .andExpect(jsonPath("$.message").value("User not found."))
        .andExpect(jsonPath("$.path").value("/test/openlap-notfound"))
        .andExpect(jsonPath("$.timestamp").exists())
        .andExpect(jsonPath("$.cause").doesNotExist())
        // legacy compat aliases present
        .andExpect(jsonPath("$.httpStatus").value("NOT_FOUND"))
        .andExpect(jsonPath("$.errors").exists());
  }

  @Test
  public void validationErrorsReturnValidationFailed() throws Exception {
    mockMvc
        .perform(
            post("/test/valid").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.details.fieldErrors[0].field").value("name"))
        .andExpect(jsonPath("$.cause").doesNotExist());
  }

  @Test
  public void malformedJsonReturnsMalformedRequest() throws Exception {
    mockMvc
        .perform(post("/test/body").contentType(MediaType.APPLICATION_JSON).content("{\"name\":"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("MALFORMED_REQUEST"));
  }

  @Test
  public void missingParameterReturnsMissingParameter() throws Exception {
    mockMvc
        .perform(get("/test/param"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("MISSING_PARAMETER"))
        .andExpect(jsonPath("$.details.parameter").value("q"));
  }

  @Test
  public void unsupportedMethodReturnsMethodNotAllowed() throws Exception {
    mockMvc
        .perform(post("/test/param"))
        .andExpect(status().isMethodNotAllowed())
        .andExpect(jsonPath("$.code").value("METHOD_NOT_ALLOWED"));
  }

  @Test
  public void unsupportedMediaTypeReturnsUnsupportedMediaType() throws Exception {
    mockMvc
        .perform(post("/test/body").contentType(MediaType.TEXT_PLAIN).content("hello"))
        .andExpect(status().isUnsupportedMediaType())
        .andExpect(jsonPath("$.code").value("UNSUPPORTED_MEDIA_TYPE"));
  }

  @Test
  public void catchAllReturnsGenericInternalError() throws Exception {
    mockMvc
        .perform(get("/test/boom"))
        .andExpect(status().isInternalServerError())
        .andExpect(jsonPath("$.status").value(500))
        .andExpect(jsonPath("$.code").value("INTERNAL_ERROR"))
        .andExpect(jsonPath("$.message").value("An unexpected error occurred."))
        .andExpect(jsonPath("$.cause").doesNotExist());
  }

  @Test
  public void legacyCentralHandlerStillOwnsServiceException() throws Exception {
    // legacy GlobalExceptionHandler -> ApiError {httpStatus, errors:{serverError}}; NOT the new envelope.
    mockMvc
        .perform(get("/test/legacy-service"))
        .andExpect(status().isInternalServerError())
        .andExpect(jsonPath("$.code").doesNotExist())
        .andExpect(jsonPath("$.timestamp").doesNotExist())
        .andExpect(jsonPath("$.errors.serverError").exists());
  }

  @Test
  public void migratedModuleExceptionUsesUnifiedEnvelope() throws Exception {
    // analytics_module is now migrated (IndicatorExceptionHandler removed): IndicatorNotFoundException
    // extends the shared NotFoundException, so it renders the unified envelope with a stable code.
    // (The legacy central handler still owns the shared ServiceException — see the test above.)
    mockMvc
        .perform(get("/test/migrated-indicator"))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("INDICATOR_NOT_FOUND"))
        .andExpect(jsonPath("$.message").value("indicator not found"))
        .andExpect(jsonPath("$.cause").doesNotExist());
  }
}
