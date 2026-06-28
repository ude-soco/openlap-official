package com.openlap.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Single source of truth for the JWT token policy. Values are externalized to {@code
 * application.properties} ({@code openlap.auth.*}) so login token minting, refresh token minting,
 * and token verification all share ONE configured lifetime instead of duplicated magic numbers.
 *
 * <p>Policy (defaults): access token = 15 minutes, refresh token = 5 days, verification leeway = 30
 * seconds. Refresh-token rotation and server-side revocation are intentionally NOT implemented in
 * this phase.
 */
@Component
public class AuthTokenProperties {

  private static final long MILLIS_PER_MINUTE = 60_000L;
  private static final long MILLIS_PER_DAY = 24L * 60L * 60L * 1000L;

  private final long accessTokenTtlMinutes;
  private final long refreshTokenTtlDays;
  private final long jwtLeewaySeconds;

  public AuthTokenProperties(
      @Value("${openlap.auth.access-token-ttl-minutes:15}") long accessTokenTtlMinutes,
      @Value("${openlap.auth.refresh-token-ttl-days:5}") long refreshTokenTtlDays,
      @Value("${openlap.auth.jwt-leeway-seconds:30}") long jwtLeewaySeconds) {
    this.accessTokenTtlMinutes = accessTokenTtlMinutes;
    this.refreshTokenTtlDays = refreshTokenTtlDays;
    this.jwtLeewaySeconds = jwtLeewaySeconds;
  }

  /** Access-token lifetime in milliseconds — used by BOTH login and refresh minting. */
  public long getAccessTokenTtlMillis() {
    return accessTokenTtlMinutes * MILLIS_PER_MINUTE;
  }

  /** Refresh-token lifetime in milliseconds. */
  public long getRefreshTokenTtlMillis() {
    return refreshTokenTtlDays * MILLIS_PER_DAY;
  }

  /** Clock-skew tolerance (seconds) applied when verifying token expiry. */
  public long getJwtLeewaySeconds() {
    return jwtLeewaySeconds;
  }

  public long getAccessTokenTtlMinutes() {
    return accessTokenTtlMinutes;
  }

  public long getRefreshTokenTtlDays() {
    return refreshTokenTtlDays;
  }
}
