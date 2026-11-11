package com.openlap.security;

import static org.springframework.security.config.http.SessionCreationPolicy.STATELESS;

import com.openlap.infrastructure.error.ErrorResponseWriter;
import com.openlap.infrastructure.security.RestAccessDeniedHandler;
import com.openlap.infrastructure.security.RestAuthenticationEntryPoint;
import com.openlap.security.filter.CustomAuthenticationFilter;
import com.openlap.security.filter.CustomAuthorizationFilter;
import com.openlap.user.entities.RoleType;
import com.openlap.user.services.TokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {
  @Value("${server.token}")
  String jwtToken;

  private final UserDetailsService userDetailsService;
  private final BCryptPasswordEncoder bCryptPasswordEncoder;
  private final TokenService tokenService;
  private final UrlBasedCorsConfigurationSource corsConfigurationSource;
  private final ErrorResponseWriter errorResponseWriter;
  private final RestAuthenticationEntryPoint authenticationEntryPoint;
  private final RestAccessDeniedHandler accessDeniedHandler;
  private final AuthTokenProperties authTokenProperties;

  @Bean
  public AuthenticationManager authenticationManager() {
    DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
    provider.setPasswordEncoder(bCryptPasswordEncoder);
    return new ProviderManager(provider);
  }

  @Bean
  public SecurityFilterChain securityFilterChain(
      HttpSecurity http, AuthenticationManager authenticationManager) throws Exception {
    http.authenticationManager(authenticationManager);
    http.csrf(AbstractHttpConfigurer::disable);
    http.headers(headers -> headers.frameOptions(frameOptions -> frameOptions.disable()));
    http.sessionManagement(session -> session.sessionCreationPolicy(STATELESS));
    http.cors(cors -> cors.configurationSource(corsConfigurationSource));

    http.authorizeHttpRequests(authorize -> authorize
        .requestMatchers("/login/**", "/v1/register/**", "/v1/token/refresh/**", "/v1/code/**")
        .permitAll()
        .requestMatchers(HttpMethod.GET, "/v1/content/news", "/v1/content/publications")
        .permitAll()
        // All admin-management endpoints live under /v1/admin/** and are SUPER_ADMIN-only.
        // Declared early (requestMatchers are first-match-wins) so no broader rule can shadow it.
        .requestMatchers("/v1/admin/**")
        .hasAnyAuthority(RoleType.ROLE_SUPER_ADMIN.toString())
        .requestMatchers("/v1/lrs/**")
        .hasAnyAuthority(RoleType.ROLE_DATA_PROVIDER.toString())
        .requestMatchers("/v1/users/my/lrs/**", "/v1/isc/**", "/v1/analytics/goals/**")
        .hasAnyAuthority(RoleType.ROLE_USER.toString(), RoleType.ROLE_USER_WITHOUT_LRS.toString())
        // Admin-only user administration (list users). Must precede the broader
        // "/v1/users/my/**" self-service rule below (requestMatchers are first-match-wins).
        // Matches only the exact list path and its trailing-slash form, so
        // "/v1/users/my/**" continues to work for normal users.
        .requestMatchers("/v1/users", "/v1/users/")
        .hasAnyAuthority(RoleType.ROLE_SUPER_ADMIN.toString())
        .requestMatchers("/v1/users/my/**")
        .hasAnyAuthority(
            RoleType.ROLE_USER.toString(),
            RoleType.ROLE_USER_WITHOUT_LRS.toString(),
            RoleType.ROLE_SUPER_ADMIN.toString(),
            RoleType.ROLE_DATA_PROVIDER.toString())
        .requestMatchers("/v1/indicators/**", "/v1/questions/**", "/v1/statements/**")
        .hasAnyAuthority(RoleType.ROLE_USER.toString())
        // Harden the state-changing plugin endpoints that are exposed via GET (reload/populate): lock
        // them to SUPER_ADMIN. This MUST precede the broad GET rule below (requestMatchers are
        // first-match-wins) which would otherwise grant ROLE_USER. The "/**" suffix also covers the
        // trailing-slash form. Read-only catalog GETs (method/library/type lists, input-params) are
        // NOT matched here and remain available to ROLE_USER via the broad GET rule.
        .requestMatchers(
            "/v1/analytics/methods/reload/**",
            "/v1/analytics/methods/populate/**",
            "/v1/visualizations/reload/**")
        .hasAnyAuthority(RoleType.ROLE_SUPER_ADMIN.toString())
        .requestMatchers(
            HttpMethod.GET, "/v1/analytics/**", "/v1/visualizations/**", "/v1/analytics/goals/**")
        .hasAnyAuthority(RoleType.ROLE_USER.toString(), RoleType.ROLE_SUPER_ADMIN.toString())
        .requestMatchers("/v1/roles/**", "/v1/engine/**", "/v1/analytics/**", "/v1/visualizations/**")
        .hasAnyAuthority(RoleType.ROLE_SUPER_ADMIN.toString())
        .anyRequest().authenticated());

    // Render authentication/authorization failures with the unified error envelope.
    // (Rendering only — the authorization rules above are unchanged.)
    http.exceptionHandling(exceptions -> exceptions
        .authenticationEntryPoint(authenticationEntryPoint)
        .accessDeniedHandler(accessDeniedHandler));

    http.addFilter(
        new CustomAuthenticationFilter(
            authenticationManager, jwtToken, errorResponseWriter, authTokenProperties));
    http.addFilterBefore(
        new CustomAuthorizationFilter(tokenService, errorResponseWriter),
        UsernamePasswordAuthenticationFilter.class);
    return http.build();
  }
}
