package com.openlap.security;

import static org.springframework.security.config.http.SessionCreationPolicy.STATELESS;

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
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityConfigurerAdapter;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig extends WebSecurityConfigurerAdapter {
  @Value("${server.token}")
  String jwtToken;

  private final UserDetailsService userDetailsService;
  private final BCryptPasswordEncoder bCryptPasswordEncoder;
  private final TokenService tokenService;
  private final UrlBasedCorsConfigurationSource corsConfigurationSource;

  @Override
  protected void configure(AuthenticationManagerBuilder auth) throws Exception {
    auth.userDetailsService(userDetailsService).passwordEncoder(bCryptPasswordEncoder);
  }

  @Override
  protected void configure(HttpSecurity http) throws Exception {
    http.csrf().disable();
    http.headers().frameOptions().disable();
    http.sessionManagement().sessionCreationPolicy(STATELESS);

    // CORS configuration
    http.cors().configurationSource(corsConfigurationSource);

    http.authorizeRequests()
        .antMatchers("/login/**", "/v1/register/**", "/v1/token/refresh/**", "/v1/code/**")
        .permitAll();
    http.authorizeRequests()
        .antMatchers("/v1/lrs/**")
        .hasAnyAuthority(RoleType.ROLE_DATA_PROVIDER.toString());
    http.authorizeRequests()
        .antMatchers("/v1/users/my/lrs/**", "/v1/isc/**", "/v1/analytics/goals/**")
        .hasAnyAuthority(RoleType.ROLE_USER.toString(), RoleType.ROLE_USER_WITHOUT_LRS.toString());
    http.authorizeRequests()
        .antMatchers("/v1/users/my/**")
        .hasAnyAuthority(
            RoleType.ROLE_USER.toString(),
            RoleType.ROLE_USER_WITHOUT_LRS.toString(),
            RoleType.ROLE_SUPER_ADMIN.toString(),
            RoleType.ROLE_DATA_PROVIDER.toString());
    http.authorizeRequests()
        .antMatchers("/v1/indicators/**", "/v1/questions/**", "/v1/statements/**")
        .hasAnyAuthority(RoleType.ROLE_USER.toString());
    http.authorizeRequests()
        .antMatchers(
            HttpMethod.GET, "/v1/analytics/**", "/v1/visualizations/**", "/v1/analytics/goals/**")
        .hasAnyAuthority(RoleType.ROLE_USER.toString(), RoleType.ROLE_SUPER_ADMIN.toString());
    http.authorizeRequests()
        .antMatchers("/v1/roles/**", "/v1/engine/**", "/v1/analytics/**", "/v1/visualizations/**")
        .hasAnyAuthority(RoleType.ROLE_SUPER_ADMIN.toString());
    http.authorizeRequests().anyRequest().authenticated();
    http.addFilter(new CustomAuthenticationFilter(authenticationManagerBean(), jwtToken));
    http.addFilterBefore(
        new CustomAuthorizationFilter(tokenService), UsernamePasswordAuthenticationFilter.class);
  }

  @Bean
  @Override
  public AuthenticationManager authenticationManagerBean() throws Exception {
    return super.authenticationManagerBean();
  }
}
