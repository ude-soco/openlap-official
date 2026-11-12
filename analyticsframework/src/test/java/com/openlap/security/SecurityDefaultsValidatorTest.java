package com.openlap.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.Test;

/**
 * Unit tests for the P0 fail-fast guard. No Spring context is started; the validator is exercised
 * directly so the security behaviour is pinned independently of application wiring.
 */
public class SecurityDefaultsValidatorTest {

  private static final String STRONG_SECRET = "f3a1c9d8-2b7e-4a16-9c0d-strong-signing-key-2026";
  private static final String STRONG_ADMIN_PASSWORD = "Str0ng-Admin-Passw0rd!";

  @Test
  public void failsFastWhenJwtSecretIsTheDefault() {
    SecurityDefaultsValidator validator =
        new SecurityDefaultsValidator("secret", STRONG_ADMIN_PASSWORD, false);

    assertThatThrownBy(validator::afterPropertiesSet)
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("JWT signing secret");
  }

  @Test
  public void failsFastWhenAdminPasswordIsTheDefault() {
    SecurityDefaultsValidator validator =
        new SecurityDefaultsValidator(STRONG_SECRET, "1234qweR", false);

    assertThatThrownBy(validator::afterPropertiesSet)
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("admin password");
  }

  @Test
  public void failsFastWhenSecretsAreBlank() {
    SecurityDefaultsValidator validator = new SecurityDefaultsValidator("   ", "", false);

    assertThatThrownBy(validator::afterPropertiesSet).isInstanceOf(IllegalStateException.class);
    assertThat(validator.findViolations()).hasSize(2);
  }

  @Test
  public void startsWhenBothSecretsAreStrong() {
    SecurityDefaultsValidator validator =
        new SecurityDefaultsValidator(STRONG_SECRET, STRONG_ADMIN_PASSWORD, false);

    validator.afterPropertiesSet(); // must not throw
    assertThat(validator.findViolations()).isEmpty();
  }

  @Test
  public void allowInsecureDefaultsDowngradesFailureToWarning() {
    SecurityDefaultsValidator validator =
        new SecurityDefaultsValidator("secret", "1234qweR", true);

    validator.afterPropertiesSet(); // must not throw when explicitly allowed
    assertThat(validator.findViolations()).hasSize(2);
  }
}
