package com.openlap.user.controller;

import static org.hamcrest.Matchers.hasItem;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.openlap.analytics_engine.services.EngineService;
import com.openlap.analytics_statements.services.LrsService;
import com.openlap.analytics_statements.services.StatementService;
import com.openlap.infrastructure.error.ApiErrorResponseFactory;
import com.openlap.security.SecurityConfig;
import com.openlap.user.services.UserRegisterService;
import com.openlap.user.services.UserRoleService;
import com.openlap.user.services.UserService;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.jackson2.autoconfigure.Jackson2AutoConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.junit4.SpringRunner;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Proves the account-update endpoints reject invalid payloads with the unified VALIDATION_FAILED
 * envelope (bean-validation wiring on the new DTOs), before any service call.
 */
@RunWith(SpringRunner.class)
@WebMvcTest(
    controllers = {UserController.class, UserRegisterController.class},
    excludeFilters =
        @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = SecurityConfig.class))
@AutoConfigureMockMvc(addFilters = false)
@ImportAutoConfiguration(Jackson2AutoConfiguration.class)
@Import(ApiErrorResponseFactory.class)
public class UserAccountUpdateValidationMockMvcTest {

  @Autowired private MockMvc mockMvc;

  // Controller dependency under test.
  @MockitoBean private UserService userService;
  @MockitoBean private StatementService statementService;
  @MockitoBean private LrsService lrsService;
  // Bootstrap CommandLineRunner collaborators (kept off MongoDB), mirroring the user error test.
  @MockitoBean private UserRegisterService userRegisterService;
  @MockitoBean private UserRoleService userRoleService;
  @MockitoBean private EngineService engineService;

  @Test
  public void updateProfileRejectsBlankName() throws Exception {
    mockMvc
        .perform(
            patch("/v1/users/my/profile")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.details.fieldErrors[*].field", hasItem("name")));
  }

  @Test
  public void updateEmailRejectsInvalidEmailAndMissingPassword() throws Exception {
    mockMvc
        .perform(
            patch("/v1/users/my/email")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"newEmail\":\"not-an-email\",\"currentPassword\":\"\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.details.fieldErrors[*].field", hasItem("newEmail")))
        .andExpect(jsonPath("$.details.fieldErrors[*].field", hasItem("currentPassword")));
  }

  @Test
  public void changePasswordRejectsWeakNewPassword() throws Exception {
    mockMvc
        .perform(
            patch("/v1/users/my/password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"currentPassword\":\"something\",\"newPassword\":\"weak\",\"confirmNewPassword\":\"weak\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.details.fieldErrors[*].field", hasItem("newPassword")));
  }

  @Test
  public void changePasswordRejectsBlankCurrentPassword() throws Exception {
    mockMvc
        .perform(
            patch("/v1/users/my/password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"currentPassword\":\"\",\"newPassword\":\"ValidPassw0rd@1\",\"confirmNewPassword\":\"ValidPassw0rd@1\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.details.fieldErrors[*].field", hasItem("currentPassword")));
  }

  @Test
  public void changePasswordRejectsTooManyUtf8BytesBeforeEncoding() throws Exception {
    String password = "Aa1!" + "§".repeat(9) + "x".repeat(51);
    mockMvc.perform(patch("/v1/users/my/password")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"currentPassword\":\"current-password\",\"newPassword\":\"" + password
                + "\",\"confirmNewPassword\":\"" + password + "\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.details.fieldErrors[*].field", hasItem("newPassword")))
        .andExpect(jsonPath("$.cause").doesNotExist());
    verify(userService, never()).changePassword(any(), any());
  }

  @Test
  public void registrationRejectsTooManyUtf8BytesBeforeEncoding() throws Exception {
    String password = "Aa1!" + "§".repeat(9) + "x".repeat(51);
    mockMvc.perform(post("/v1/register")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"Fixture user\",\"email\":\"fixture@example.test\",\"role\":\"ROLE_USER_WITHOUT_LRS\","
                + "\"password\":\"" + password + "\",\"confirmPassword\":\"" + password + "\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.details.fieldErrors[*].field", hasItem("password")))
        .andExpect(jsonPath("$.details.fieldErrors[*].field", hasItem("confirmPassword")))
        .andExpect(jsonPath("$.cause").doesNotExist());
    verify(userRegisterService, never()).registerUser(any());
  }
}
