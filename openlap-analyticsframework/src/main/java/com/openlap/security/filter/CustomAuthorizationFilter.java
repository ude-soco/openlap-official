package com.openlap.security.filter;

import static java.util.Arrays.stream;
import static org.springframework.http.HttpHeaders.AUTHORIZATION;

import com.auth0.jwt.exceptions.TokenExpiredException;
import com.openlap.infrastructure.error.ErrorResponseWriter;
import com.openlap.user.dto.request.TokenRequest;
import com.openlap.user.services.TokenService;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collection;
import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

@Slf4j
public class CustomAuthorizationFilter extends OncePerRequestFilter {
  private final TokenService tokenService;
  private final ErrorResponseWriter errorResponseWriter;

  public CustomAuthorizationFilter(
      TokenService tokenService, ErrorResponseWriter errorResponseWriter) {
    this.tokenService = tokenService;
    this.errorResponseWriter = errorResponseWriter;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    if (request.getServletPath().equals("/api/login")
        || request.getServletPath().startsWith("/v1/token")
        || request.getServletPath().startsWith("/v1/register")
        || request.getServletPath().startsWith("/v1/code")) {
      filterChain.doFilter(request, response);
    } else {
      String authorizationHeader = request.getHeader(AUTHORIZATION);
      if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
        try {
          TokenRequest tokenRequest = tokenService.verifyToken(request);
          Collection<SimpleGrantedAuthority> authorities = new ArrayList<>();
          stream(tokenRequest.getRoles())
              .forEach(
                  role -> {
                    authorities.add(new SimpleGrantedAuthority(role));
                  });
          UsernamePasswordAuthenticationToken authenticationToken =
              new UsernamePasswordAuthenticationToken(
                  tokenRequest.getUserEmail(), null, authorities);
          SecurityContextHolder.getContext().setAuthentication(authenticationToken);
          filterChain.doFilter(request, response);
        } catch (Exception e) {
          // Token validation logic is unchanged; only the error rendering is unified here.
          // Status is preserved at 403 (the previous behaviour).
          boolean expired = e instanceof TokenExpiredException;
          String code = expired ? "TOKEN_EXPIRED" : "INVALID_TOKEN";
          String message = expired ? "The access token has expired." : "Invalid access token.";
          log.warn("Token rejected ({}): {}", code, e.getMessage());
          errorResponseWriter.write(request, response, HttpStatus.FORBIDDEN, code, message);
        }
      } else {
        filterChain.doFilter(request, response);
      }
    }
  }
}
