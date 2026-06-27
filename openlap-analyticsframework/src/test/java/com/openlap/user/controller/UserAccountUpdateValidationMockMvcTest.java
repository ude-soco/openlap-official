package com.openlap.user.controller;

import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.openlap.analytics_engine.services.EngineService;
import com.openlap.infrastructure.error.ApiErrorResponseFactory;
import com.openlap.security.SecurityConfig;
import com.openlap.user.services.UserRegisterService;
import com.openlap.user.services.UserRoleService;
import com.openlap.user.services.UserService;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
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
    controllers = UserController.class,
    excludeFilters =
        @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = SecurityConfig.class))
@AutoConfigureMockMvc(addFilters = false)
@Import(ApiErrorResponseFactory.class)
public class UserAccountUpdateValidationMockMvcTest {

  @Autowired private MockMvc mockMvc;

  // Controller dependency under test.
  @MockBean private UserService userService;
  // Bootstrap CommandLineRunner collaborators (kept off MongoDB), mirroring the user error test.
  @MockBean private UserRegisterService userRegisterService;
  @MockBean private UserRoleService userRoleService;
  @MockBean private EngineService engineService;

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
}
