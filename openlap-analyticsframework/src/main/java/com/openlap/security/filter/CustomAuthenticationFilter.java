package com.openlap.security.filter;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.openlap.infrastructure.error.ErrorResponseWriter;
import com.openlap.security.AuthTokenProperties;
import com.openlap.user.exception.user.UserNotFoundException;
import java.io.IOException;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;
import javax.servlet.FilterChain;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Slf4j
public class CustomAuthenticationFilter extends UsernamePasswordAuthenticationFilter {
  private final String jwtToken;
  private final AuthenticationManager authenticationManager;
  private final ErrorResponseWriter errorResponseWriter;
  private final AuthTokenProperties tokenProperties;

  public CustomAuthenticationFilter(
      AuthenticationManager authenticationManager,
      String jwtToken,
      ErrorResponseWriter errorResponseWriter,
      AuthTokenProperties tokenProperties) {
    this.authenticationManager = authenticationManager;
    this.jwtToken = jwtToken;
    this.errorResponseWriter = errorResponseWriter;
    this.tokenProperties = tokenProperties;
  }

  @Override
  public Authentication attemptAuthentication(
      HttpServletRequest request, HttpServletResponse response) throws AuthenticationException {
    String userEmail = request.getParameter("userEmail");
    String password = request.getParameter("password");
    log.info("Attempting to authenticate user with email: '{}'", userEmail);

    UsernamePasswordAuthenticationToken authenticationToken =
        new UsernamePasswordAuthenticationToken(userEmail, password);
    try {
      return authenticationManager.authenticate(authenticationToken);
    } catch (UserNotFoundException ex) {
      log.error("User not found with email: {}", userEmail);
      throw ex;
    }
  }

  @Override
  protected void successfulAuthentication(
      HttpServletRequest request,
      HttpServletResponse response,
      FilterChain chain,
      Authentication authentication)
      throws IOException {
    User user = (User) authentication.getPrincipal();
    Algorithm algorithm = Algorithm.HMAC256(jwtToken.getBytes());
    Date issuedAt = new Date();
    String access_token =
        JWT.create()
            .withSubject(user.getUsername())
            .withIssuedAt(issuedAt)
            .withExpiresAt(new Date(issuedAt.getTime() + tokenProperties.getAccessTokenTtlMillis()))
            .withIssuer(request.getRequestURL().toString())
            .withClaim(
                "roles",
                user.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority)
                    .collect(Collectors.toList()))
            .sign(algorithm);
    String refresh_token =
        JWT.create()
            .withSubject(user.getUsername())
            .withIssuedAt(issuedAt)
            .withExpiresAt(new Date(issuedAt.getTime() + tokenProperties.getRefreshTokenTtlMillis()))
            .withIssuer(request.getRequestURL().toString())
            .sign(algorithm);

    Map<String, String> tokens = new HashMap<>();
    tokens.put("access_token", access_token);
    tokens.put("refresh_token", refresh_token);

    response.setContentType(APPLICATION_JSON_VALUE);

    new ObjectMapper().writeValue(response.getOutputStream(), tokens);
  }

  @Override
  protected void unsuccessfulAuthentication(
      HttpServletRequest request, HttpServletResponse response, AuthenticationException failed)
      throws IOException {
    log.warn("Authentication failed: {}", failed.getMessage());

    // Status decision is preserved (401, or 404 when the cause is UserNotFoundException); only the
    // response body is unified, and internal exception messages are no longer leaked.
    boolean userNotFound = failed.getCause() instanceof UserNotFoundException;
    HttpStatus status = userNotFound ? HttpStatus.NOT_FOUND : HttpStatus.UNAUTHORIZED;
    String message =
        userNotFound
            ? "User not found."
            : "Authentication failed: check your email and password.";
    errorResponseWriter.write(request, response, status, "AUTHENTICATION_FAILED", message);
  }
}
