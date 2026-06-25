package com.openlap.security.filter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.http.HttpHeaders.AUTHORIZATION;

import com.auth0.jwt.exceptions.JWTVerificationException;
import com.openlap.user.dto.request.TokenRequest;
import com.openlap.user.services.TokenService;
import org.junit.After;
import org.junit.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Characterization tests for {@link CustomAuthorizationFilter} in isolation (no Spring context).
 * Verifies how a request's bearer token is turned into an authenticated {@code SecurityContext},
 * and how invalid/missing tokens are handled.
 */
public class CustomAuthorizationFilterTest {

  private final TokenService tokenService = mock(TokenService.class);
  private final CustomAuthorizationFilter filter = new CustomAuthorizationFilter(tokenService);

  @After
  public void clearContext() {
    SecurityContextHolder.clearContext();
  }

  @Test
  public void validTokenPopulatesAuthenticatedSecurityContext() throws Exception {
    when(tokenService.verifyToken(any()))
        .thenReturn(new TokenRequest("user@mail.com", new String[] {"ROLE_USER"}, "tok", null));
    MockHttpServletRequest request = new MockHttpServletRequest("GET", "/v1/users/my");
    request.setServletPath("/v1/users/my");
    request.addHeader(AUTHORIZATION, "Bearer valid-token");
    MockHttpServletResponse response = new MockHttpServletResponse();
    MockFilterChain chain = new MockFilterChain();

    filter.doFilter(request, response, chain);

    // request proceeded down the chain and the user is authenticated with the claim's authority
    assertThat(chain.getRequest()).isNotNull();
    assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
    assertThat(SecurityContextHolder.getContext().getAuthentication().getAuthorities())
        .extracting("authority")
        .containsExactly("ROLE_USER");
  }

  @Test
  public void invalidTokenIsRejectedWithForbiddenAndStopsTheChain() throws Exception {
    when(tokenService.verifyToken(any())).thenThrow(new JWTVerificationException("bad token"));
    MockHttpServletRequest request = new MockHttpServletRequest("GET", "/v1/users/my");
    request.setServletPath("/v1/users/my");
    request.addHeader(AUTHORIZATION, "Bearer tampered");
    MockHttpServletResponse response = new MockHttpServletResponse();
    MockFilterChain chain = new MockFilterChain();

    filter.doFilter(request, response, chain);

    assertThat(response.getStatus()).isEqualTo(403);
    assertThat(chain.getRequest()).isNull(); // chain was NOT continued
    assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
  }

  @Test
  public void missingTokenProceedsUnauthenticated() throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest("GET", "/v1/users/my");
    request.setServletPath("/v1/users/my");
    MockHttpServletResponse response = new MockHttpServletResponse();
    MockFilterChain chain = new MockFilterChain();

    filter.doFilter(request, response, chain);

    // no credentials: the filter lets the request through; downstream authorization rejects it
    assertThat(chain.getRequest()).isNotNull();
    assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
  }
}
