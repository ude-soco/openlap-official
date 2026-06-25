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

  private final AuthenticationManager authenticationManager = mock(AuthenticationManager.class);
  private final ObjectMapper objectMapper = new ObjectMapper();
  private final CustomAuthenticationFilter filter =
      new CustomAuthenticationFilter(
          authenticationManager,
          SECRET,
          new ErrorResponseWriter(new ApiErrorResponseFactory(true), objectMapper));

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
