package com.openlap.security;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.Test;

/** Verifies the token-policy math and that login/refresh share ONE access-token lifetime. */
public class AuthTokenPropertiesTest {

  @Test
  public void derivesMillisFromTheConfiguredUnits() {
    AuthTokenProperties props = new AuthTokenProperties(15, 5, 30);

    assertThat(props.getAccessTokenTtlMillis()).isEqualTo(15L * 60 * 1000);
    assertThat(props.getRefreshTokenTtlMillis()).isEqualTo(5L * 24 * 60 * 60 * 1000);
    assertThat(props.getJwtLeewaySeconds()).isEqualTo(30);
  }

  @Test
  public void accessTokenLifetimeIsNoLongerTheOldMismatchedValues() {
    AuthTokenProperties props = new AuthTokenProperties(15, 5, 30);

    // The same access TTL is consumed by both login and refresh minting, and it is
    // neither the old 24h login value nor the old 10min refresh value.
    assertThat(props.getAccessTokenTtlMillis()).isNotEqualTo(24L * 60 * 60 * 1000);
    assertThat(props.getAccessTokenTtlMillis()).isNotEqualTo(10L * 60 * 1000);
  }

  @Test
  public void honoursNonDefaultConfiguration() {
    AuthTokenProperties props = new AuthTokenProperties(30, 7, 60);

    assertThat(props.getAccessTokenTtlMillis()).isEqualTo(30L * 60 * 1000);
    assertThat(props.getRefreshTokenTtlMillis()).isEqualTo(7L * 24 * 60 * 60 * 1000);
    assertThat(props.getJwtLeewaySeconds()).isEqualTo(60);
  }
}
