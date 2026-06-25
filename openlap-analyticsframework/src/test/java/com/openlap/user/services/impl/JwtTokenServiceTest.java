package com.openlap.user.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.http.HttpHeaders.AUTHORIZATION;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.openlap.user.dto.request.TokenRequest;
import java.util.Date;
import org.junit.Before;
import org.junit.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * Characterization tests for JWT generation/verification as performed by {@link TokenServiceImpl}.
 * Pure unit test: the {@code @Value} secret is set via reflection and no Spring context is loaded.
 */
public class JwtTokenServiceTest {

  private static final String SECRET = "test-secret-key-that-is-long-enough-1234567890";

  private TokenServiceImpl tokenService;

  @Before
  public void setUp() {
    // UserRepository is unused by verifyToken(); pass null and inject the @Value secret.
    tokenService = new TokenServiceImpl(null);
    ReflectionTestUtils.setField(tokenService, "jwtToken", SECRET);
  }

  private static String sign(String subject, String[] roles, long expiresInMillis) {
    return JWT.create()
        .withSubject(subject)
        .withArrayClaim("roles", roles)
        .withExpiresAt(new Date(System.currentTimeMillis() + expiresInMillis))
        .sign(Algorithm.HMAC256(SECRET.getBytes()));
  }

  private static MockHttpServletRequest bearer(String token) {
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.addHeader(AUTHORIZATION, "Bearer " + token);
    return request;
  }

  @Test
  public void verifiesValidTokenAndExtractsSubjectAndRoles() {
    String token = sign("admin@mail.com", new String[] {"ROLE_SUPER_ADMIN"}, 60_000);

    TokenRequest result = tokenService.verifyToken(bearer(token));

    assertThat(result.getUserEmail()).isEqualTo("admin@mail.com");
    assertThat(result.getRoles()).containsExactly("ROLE_SUPER_ADMIN");
    assertThat(result.getToken()).isEqualTo(token);
  }

  @Test
  public void rejectsTokenSignedWithADifferentSecret() {
    String forged =
        JWT.create()
            .withSubject("attacker@mail.com")
            .withExpiresAt(new Date(System.currentTimeMillis() + 60_000))
            .sign(Algorithm.HMAC256("a-different-secret".getBytes()));

    assertThatThrownBy(() -> tokenService.verifyToken(bearer(forged)))
        .isInstanceOf(JWTVerificationException.class);
  }

  @Test
  public void rejectsExpiredToken() {
    String expired = sign("admin@mail.com", new String[] {"ROLE_USER"}, -1_000);

    assertThatThrownBy(() -> tokenService.verifyToken(bearer(expired)))
        .isInstanceOf(JWTVerificationException.class);
  }
}
