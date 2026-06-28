package com.openlap.security.filter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.http.HttpHeaders.AUTHORIZATION;

import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.exceptions.TokenExpiredException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.openlap.infrastructure.error.ApiErrorResponseFactory;
import com.openlap.infrastructure.error.ErrorResponseWriter;
import com.openlap.user.dto.request.TokenRequest;
import com.openlap.user.services.TokenService;
import java.time.Instant;
import org.junit.After;
import org.junit.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Characterization tests for {@link CustomAuthorizationFilter} in isolation (no Spring context).
 * Token validation is unchanged; the failure responses now use the unified error envelope.
 */
public class CustomAuthorizationFilterTest {

  private final TokenService tokenService = mock(TokenService.class);
  private final ObjectMapper objectMapper = new ObjectMapper();
  private final ErrorResponseWriter writer =
      new ErrorResponseWriter(new ApiErrorResponseFactory(true), objectMapper);
  private final CustomAuthorizationFilter filter =
      new CustomAuthorizationFilter(tokenService, writer);

  @After
  public void clearContext() {
    SecurityContextHolder.clearContext();
  }

  private static MockHttpServletRequest request(String bearer) {
    MockHttpServletRequest request = new MockHttpServletRequest("GET", "/v1/users/my");
    request.setServletPath("/v1/users/my");
    if (bearer != null) {
      request.addHeader(AUTHORIZATION, "Bearer " + bearer);
    }
    return request;
  }

  @Test
  public void validTokenPopulatesAuthenticatedSecurityContext() throws Exception {
    when(tokenService.verifyToken(any()))
        .thenReturn(new TokenRequest("user@mail.com", new String[] {"ROLE_USER"}, "tok", null));
    MockHttpServletResponse response = new MockHttpServletResponse();
    MockFilterChain chain = new MockFilterChain();

    filter.doFilter(request("valid-token"), response, chain);

    assertThat(chain.getRequest()).isNotNull();
    assertThat(SecurityContextHolder.getContext().getAuthentication().getAuthorities())
        .extracting("authority")
        .containsExactly("ROLE_USER");
  }

  @Test
  public void invalidTokenIsRejectedWithUnifiedEnvelope() throws Exception {
    when(tokenService.verifyToken(any())).thenThrow(new JWTVerificationException("bad token"));
    MockHttpServletResponse response = new MockHttpServletResponse();
    MockFilterChain chain = new MockFilterChain();

    filter.doFilter(request("tampered"), response, chain);

    assertThat(response.getStatus()).isEqualTo(403);
    assertThat(chain.getRequest()).isNull(); // chain was NOT continued
    assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    JsonNode body = objectMapper.readTree(response.getContentAsString());
    assertThat(body.get("code").asText()).isEqualTo("INVALID_TOKEN");
    assertThat(body.has("cause")).isFalse();
  }

  @Test
  public void expiredTokenReportsTokenExpired() throws Exception {
    when(tokenService.verifyToken(any()))
        .thenThrow(new TokenExpiredException("expired", Instant.now()));
    MockHttpServletResponse response = new MockHttpServletResponse();

    filter.doFilter(request("expired"), response, new MockFilterChain());

    assertThat(response.getStatus()).isEqualTo(403);
    JsonNode body = objectMapper.readTree(response.getContentAsString());
    assertThat(body.get("code").asText()).isEqualTo("TOKEN_EXPIRED");
  }

  @Test
  public void missingTokenProceedsUnauthenticated() throws Exception {
    MockHttpServletResponse response = new MockHttpServletResponse();
    MockFilterChain chain = new MockFilterChain();

    filter.doFilter(request(null), response, chain);

    assertThat(chain.getRequest()).isNotNull();
    assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
  }
}
