package com.openlap.security;

import java.util.ArrayList;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Fail-fast guard that refuses to start the application when security-critical settings still use
 * their well-known insecure defaults (a forgeable JWT signing secret, or the predictable seeded
 * super-admin password).
 *
 * <p>Validation runs during context initialization ({@link #afterPropertiesSet()}); throwing there
 * aborts startup before the web server begins serving requests.
 *
 * <p>For local development the check can be explicitly waived with {@code
 * openlap.security.allow-insecure-defaults=true} (env {@code ALLOW_INSECURE_DEFAULTS=true}), which
 * logs a prominent warning instead of failing. This must never be enabled in production.
 */
@Component
@Slf4j
public class SecurityDefaultsValidator implements InitializingBean {

  /** Built-in default of {@code server.token} / {@code JWT_SECRET_KEY} (see application.properties). */
  static final String INSECURE_JWT_SECRET = "secret";

  /** Built-in default of {@code user.admin.password} / {@code ADMIN_PASSWORD}. */
  static final String INSECURE_ADMIN_PASSWORD = "1234qweR";

  private final String jwtSecret;
  private final String adminPassword;
  private final boolean allowInsecureDefaults;

  public SecurityDefaultsValidator(
      @Value("${server.token:}") String jwtSecret,
      @Value("${user.admin.password:}") String adminPassword,
      @Value("${openlap.security.allow-insecure-defaults:false}") boolean allowInsecureDefaults) {
    this.jwtSecret = jwtSecret;
    this.adminPassword = adminPassword;
    this.allowInsecureDefaults = allowInsecureDefaults;
  }

  @Override
  public void afterPropertiesSet() {
    List<String> violations = findViolations();
    if (violations.isEmpty()) {
      return;
    }
    String detail = String.join("; ", violations);
    if (allowInsecureDefaults) {
      log.warn(
          "Starting with INSECURE security defaults [{}]. This is permitted only because "
              + "openlap.security.allow-insecure-defaults=true (ALLOW_INSECURE_DEFAULTS=true). "
              + "NEVER use this in production.",
          detail);
      return;
    }
    throw new IllegalStateException(
        "Refusing to start with insecure security defaults: "
            + detail
            + ". Set strong JWT_SECRET_KEY and ADMIN_PASSWORD values. For local development only, "
            + "set ALLOW_INSECURE_DEFAULTS=true (openlap.security.allow-insecure-defaults=true).");
  }

  /**
   * @return a human-readable description of each insecure default currently in effect; empty when
   *     the configuration is safe.
   */
  List<String> findViolations() {
    List<String> violations = new ArrayList<>();
    if (isBlank(jwtSecret) || INSECURE_JWT_SECRET.equals(jwtSecret)) {
      violations.add(
          "JWT signing secret (server.token / JWT_SECRET_KEY) is unset or uses the well-known "
              + "default 'secret'");
    }
    if (isBlank(adminPassword) || INSECURE_ADMIN_PASSWORD.equals(adminPassword)) {
      violations.add(
          "admin password (user.admin.password / ADMIN_PASSWORD) is unset or uses the well-known "
              + "default '1234qweR'");
    }
    return violations;
  }

  private static boolean isBlank(String value) {
    return value == null || value.trim().isEmpty();
  }
}
