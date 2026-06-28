package com.openlap.security.filter;

import static java.util.Collections.singletonList;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.openlap.infrastructure.error.ApiErrorResponseFactory;
import com.openlap.infrastructure.error.ErrorResponseWriter;
import com.openlap.security.AuthTokenProperties;
import java.util.Map;
import org.junit.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;

/**
 * Characterization tests for the login flow handled by {@link CustomAuthenticationFilter}. These
 * exercise the real token-minting and failure handling (no Spring context, no MongoDB); the
 * {@code AuthenticationManager} is mocked since the filter only consumes its result.
 */
public class CustomAuthenticationFilterTest {

  private static final String SECRET = "test-secret-key-that-is-long-enough-1234567890";
  private static final long ACCESS_TTL_MINUTES = 15;
  private static final long REFRESH_TTL_DAYS = 5;

  private final AuthenticationManager authenticationManager = mock(AuthenticationManager.class);
  private final ObjectMapper objectMapper = new ObjectMapper();
  private final CustomAuthenticationFilter filter =
      new CustomAuthenticationFilter(
          authenticationManager,
          SECRET,
          new ErrorResponseWriter(new ApiErrorResponseFactory(true), objectMapper),
          new AuthTokenProperties(ACCESS_TTL_MINUTES, REFRESH_TTL_DAYS, 30));

  @Test
  @SuppressWarnings("unchecked")
  public void successfulAuthenticationIssuesSignedAccessAndRefreshTokens() throws Exception {
    User principal =
        new User(
            "admin@mail.com", "ignored", singletonList(new SimpleGrantedAuthority("ROLE_SUPER_ADMIN")));
    Authentication authentication =
        new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
    MockHttpServletRequest request = new MockHttpServletRequest("POST", "/login");
    MockHttpServletResponse response = new MockHttpServletResponse();

    filter.successfulAuthentication(request, response, new MockFilterChain(), authentication);

    Map<String, String> body = objectMapper.readValue(response.getContentAsByteArray(), Map.class);
    assertThat(body).containsKeys("access_token", "refresh_token");

    // The access token is verifiable with the same secret and carries subject + roles claim.
    DecodedJWT accessToken =
        JWT.require(Algorithm.HMAC256(SECRET.getBytes())).build().verify(body.get("access_token"));
    assertThat(accessToken.getSubject()).isEqualTo("admin@mail.com");
    assertThat(accessToken.getClaim("roles").asList(String.class))
        .containsExactly("ROLE_SUPER_ADMIN");
  }

  @Test
  @SuppressWarnings("unchecked")
  public void loginTokensUseTheConfiguredLifetimes() throws Exception {
    User principal =
        new User("u@mail.com", "ignored", singletonList(new SimpleGrantedAuthority("ROLE_USER")));
    Authentication authentication =
        new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
    MockHttpServletRequest request = new MockHttpServletRequest("POST", "/login");
    MockHttpServletResponse response = new MockHttpServletResponse();

    filter.successfulAuthentication(request, response, new MockFilterChain(), authentication);

    Map<String, String> body = objectMapper.readValue(response.getContentAsByteArray(), Map.class);
    Algorithm algorithm = Algorithm.HMAC256(SECRET.getBytes());
    DecodedJWT access = JWT.require(algorithm).build().verify(body.get("access_token"));
    DecodedJWT refresh = JWT.require(algorithm).build().verify(body.get("refresh_token"));

    // exp - iat (in seconds) equals the configured TTL exactly (JWT stores whole seconds).
    long accessTtlSeconds = ttlSeconds(access);
    long refreshTtlSeconds = ttlSeconds(refresh);
    assertThat(accessTtlSeconds).isEqualTo(ACCESS_TTL_MINUTES * 60);
    assertThat(refreshTtlSeconds).isEqualTo(REFRESH_TTL_DAYS * 24 * 60 * 60);
    // Regression guard: the old 24h-access / 10min-access mismatch must be gone.
    assertThat(accessTtlSeconds).isNotEqualTo(24 * 60 * 60).isNotEqualTo(10 * 60);
  }

  private static long ttlSeconds(DecodedJWT token) {
    return (token.getExpiresAt().getTime() - token.getIssuedAt().getTime()) / 1000;
  }

  @Test
  public void unsuccessfulAuthenticationReturns401UnifiedEnvelope() throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest("POST", "/login");
    MockHttpServletResponse response = new MockHttpServletResponse();

    filter.unsuccessfulAuthentication(
        request, response, new BadCredentialsException("Bad credentials"));

    assertThat(response.getStatus()).isEqualTo(401);
    JsonNode body = objectMapper.readTree(response.getContentAsByteArray());
    assertThat(body.get("code").asText()).isEqualTo("AUTHENTICATION_FAILED");
    assertThat(body.get("error").asText()).isEqualTo("UNAUTHORIZED");
    assertThat(body.has("cause")).isFalse();
  }
}
