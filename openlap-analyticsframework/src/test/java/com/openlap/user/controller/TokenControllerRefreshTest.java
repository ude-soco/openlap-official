package com.openlap.user.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.http.HttpHeaders.AUTHORIZATION;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.openlap.analytics_engine.services.EngineService;
import com.openlap.infrastructure.error.ApiErrorResponseFactory;
import com.openlap.infrastructure.error.ErrorResponseWriter;
import com.openlap.security.AuthTokenProperties;
import com.openlap.security.SecurityConfig;
import com.openlap.user.dto.request.TokenRequest;
import com.openlap.user.entities.Role;
import com.openlap.user.entities.RoleType;
import com.openlap.user.entities.User;
import com.openlap.user.services.TokenService;
import com.openlap.user.services.UserRegisterService;
import com.openlap.user.services.UserRoleService;
import com.openlap.user.services.UserService;
import java.util.Collections;
import org.junit.Test;
import org.junit.runner.RunWith;
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

/** Verifies the refresh endpoint's failure path now renders the unified envelope (403, preserved). */
@RunWith(SpringRunner.class)
@WebMvcTest(
    controllers = TokenController.class,
    excludeFilters =
        @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = SecurityConfig.class))
@AutoConfigureMockMvc(addFilters = false)
@Import({
  ApiErrorResponseFactory.class,
  ErrorResponseWriter.class,
  AuthTokenProperties.class
})
@TestPropertySource(
    properties = {
      "server.token=test-secret-key-that-is-long-enough-1234567890",
      "openlap.api.error.legacy-compat=true"
    })
public class TokenControllerRefreshTest {

  private static final String SECRET = "test-secret-key-that-is-long-enough-1234567890";

  @Autowired private MockMvc mockMvc;

  @MockBean private UserService userService;
  @MockBean private TokenService tokenService;

  // bootstrap CommandLineRunner collaborators
  @MockBean private UserRegisterService userRegisterService;
  @MockBean private UserRoleService userRoleService;
  @MockBean private EngineService engineService;

  @Test
  public void refreshWithInvalidTokenReturnsUnifiedEnvelope() throws Exception {
    given(tokenService.verifyToken(any())).willThrow(new JWTVerificationException("bad token"));

    mockMvc
        .perform(get("/v1/token/refresh").header(AUTHORIZATION, "Bearer x"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("REFRESH_FAILED"))
        .andExpect(jsonPath("$.cause").doesNotExist());
  }

  @Test
  public void refreshIssuesAccessTokenWithConfiguredLifetime() throws Exception {
    Algorithm algorithm = Algorithm.HMAC256(SECRET.getBytes());
    // A valid refresh token resolves to this user; the controller mints a NEW access token.
    given(tokenService.verifyToken(any()))
        .willReturn(new TokenRequest("user@mail.com", new String[0], "refresh-token", algorithm));
    User user = new User();
    user.setEmail("user@mail.com");
    user.setRoles(Collections.singletonList(new Role("role-id", RoleType.ROLE_USER)));
    given(userService.getUserByEmail("user@mail.com")).willReturn(user);

    String responseBody =
        mockMvc
            .perform(get("/v1/token/refresh").header(AUTHORIZATION, "Bearer refresh-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.access_token").exists())
            .andReturn()
            .getResponse()
            .getContentAsString();

    JsonNode data = new ObjectMapper().readTree(responseBody).get("data");
    DecodedJWT access = JWT.require(algorithm).build().verify(data.get("access_token").asText());
    long ttlSeconds = (access.getExpiresAt().getTime() - access.getIssuedAt().getTime()) / 1000;

    // Default policy = 15 minutes; explicitly NOT the old 10-minute refresh-access token.
    assertThat(ttlSeconds).isEqualTo(15 * 60);
    assertThat(ttlSeconds).isNotEqualTo(10 * 60);
    // The refresh token is returned unchanged (no rotation in this phase).
    assertThat(data.get("refresh_token").asText()).isEqualTo("refresh-token");
  }
}
