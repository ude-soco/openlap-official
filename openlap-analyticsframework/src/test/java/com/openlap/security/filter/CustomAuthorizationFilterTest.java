package com.openlap.security.filter;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertSame;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;
import static org.springframework.http.HttpHeaders.AUTHORIZATION;

import com.openlap.user.dto.request.TokenRequest;
import com.openlap.user.entities.User;
import com.openlap.user.services.TokenService;
import java.util.concurrent.atomic.AtomicBoolean;
import javax.servlet.FilterChain;
import javax.servlet.http.HttpServletRequest;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public class CustomAuthorizationFilterTest {

  private RecordingTokenService tokenService;
  private CustomAuthorizationFilter filter;

  @Before
  public void setUp() {
    SecurityContextHolder.clearContext();
    tokenService = new RecordingTokenService();
    filter = new CustomAuthorizationFilter(tokenService);
  }

  @After
  public void tearDown() {
    SecurityContextHolder.clearContext();
  }

  @Test
  public void invalidTokenReturnsInvalidTokenResponse() throws Exception {
    tokenService.failure = new RuntimeException("Token expired");
    MockHttpServletRequest request = protectedRequest();
    request.addHeader(AUTHORIZATION, "Bearer broken-token");
    MockHttpServletResponse response = new MockHttpServletResponse();
    AtomicBoolean chainCalled = new AtomicBoolean(false);

    filter.doFilter(request, response, chainThatSets(chainCalled));

    assertEquals(1, tokenService.verifyTokenCalls);
    assertFalse(chainCalled.get());
    assertEquals(403, response.getStatus());
    assertEquals("Token expired", response.getHeader("error"));
    assertTrue(response.getContentAsString().contains("\"error\":\"Invalid token.\""));
    assertTrue(response.getContentAsString().contains("\"message\":\"You need to login.\""));
  }

  @Test
  public void validTokenSetsAuthenticationAndAllowsChainToContinue() throws Exception {
    tokenService.tokenRequest =
        new TokenRequest("user@example.com", new String[] {"ROLE_USER"}, "valid-token", null);
    MockHttpServletRequest request = protectedRequest();
    request.addHeader(AUTHORIZATION, "Bearer valid-token");
    MockHttpServletResponse response = new MockHttpServletResponse();
    AtomicBoolean chainCalled = new AtomicBoolean(false);

    filter.doFilter(request, response, chainThatSets(chainCalled));

    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    assertEquals(1, tokenService.verifyTokenCalls);
    assertTrue(chainCalled.get());
    assertNotNull(authentication);
    assertEquals("user@example.com", authentication.getPrincipal());
    assertTrue(
        authentication.getAuthorities().stream()
            .anyMatch(authority -> authority.getAuthority().equals("ROLE_USER")));
  }

  @Test
  public void downstreamExceptionAfterValidTokenIsNotConvertedToInvalidToken() throws Exception {
    tokenService.tokenRequest =
        new TokenRequest("user@example.com", new String[] {"ROLE_USER"}, "valid-token", null);
    MockHttpServletRequest request = protectedRequest();
    request.addHeader(AUTHORIZATION, "Bearer valid-token");
    MockHttpServletResponse response = new MockHttpServletResponse();
    RuntimeException downstreamFailure = new RuntimeException("Controller failed");

    try {
      filter.doFilter(
          request,
          response,
          (servletRequest, servletResponse) -> {
            throw downstreamFailure;
          });
      fail("Expected downstream exception to propagate.");
    } catch (RuntimeException exception) {
      assertSame(downstreamFailure, exception);
    }

    assertEquals(1, tokenService.verifyTokenCalls);
    assertEquals(200, response.getStatus());
    assertFalse(response.getContentAsString().contains("Invalid token"));
  }

  @Test
  public void missingTokenStillAllowsChainToContinueWithoutTokenValidation() throws Exception {
    MockHttpServletRequest request = protectedRequest();
    MockHttpServletResponse response = new MockHttpServletResponse();
    AtomicBoolean chainCalled = new AtomicBoolean(false);

    filter.doFilter(request, response, chainThatSets(chainCalled));

    assertEquals(0, tokenService.verifyTokenCalls);
    assertTrue(chainCalled.get());
  }

  @Test
  public void publicEndpointStillBypassesTokenValidation() throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/login");
    request.setServletPath("/api/login");
    MockHttpServletResponse response = new MockHttpServletResponse();
    AtomicBoolean chainCalled = new AtomicBoolean(false);

    filter.doFilter(request, response, chainThatSets(chainCalled));

    assertEquals(0, tokenService.verifyTokenCalls);
    assertTrue(chainCalled.get());
  }

  private MockHttpServletRequest protectedRequest() {
    MockHttpServletRequest request = new MockHttpServletRequest("GET", "/v1/protected");
    request.setServletPath("/v1/protected");
    return request;
  }

  private FilterChain chainThatSets(AtomicBoolean chainCalled) {
    return (servletRequest, servletResponse) -> chainCalled.set(true);
  }

  private static final class RecordingTokenService implements TokenService {
    private TokenRequest tokenRequest;
    private RuntimeException failure;
    private int verifyTokenCalls;

    @Override
    public TokenRequest verifyToken(HttpServletRequest request) {
      verifyTokenCalls++;
      if (failure != null) {
        throw failure;
      }
      return tokenRequest;
    }

    @Override
    public User getUserFromToken(HttpServletRequest request) {
      throw new UnsupportedOperationException("Not used by CustomAuthorizationFilterTest.");
    }
  }
}
