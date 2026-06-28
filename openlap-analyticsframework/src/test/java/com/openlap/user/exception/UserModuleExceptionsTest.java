package com.openlap.user.exception;

import static org.assertj.core.api.Assertions.assertThat;

import com.openlap.infrastructure.exception.OpenLapException;
import com.openlap.user.exception.role.RoleAlreadyExistsException;
import com.openlap.user.exception.role.RoleNotAllowedException;
import com.openlap.user.exception.role.RoleNotFoundException;
import com.openlap.user.exception.user.EmailAlreadyTakenException;
import com.openlap.user.exception.user.InvalidLrsUserException;
import com.openlap.user.exception.user.InvalidUserDetailsException;
import com.openlap.user.exception.user.PasswordsDoNotMatchException;
import com.openlap.user.exception.user.UserNotFoundException;
import org.junit.Test;
import org.springframework.http.HttpStatus;

/**
 * Verifies the migrated user-module exceptions are {@link OpenLapException}s that preserve their
 * prior HTTP status and carry stable, module-specific error codes.
 */
public class UserModuleExceptionsTest {

  @Test
  public void mapToPreservedStatusAndStableCode() {
    assertMapping(new UserNotFoundException("x"), HttpStatus.NOT_FOUND, "USER_NOT_FOUND");
    assertMapping(new RoleNotFoundException("x"), HttpStatus.NOT_FOUND, "ROLE_NOT_FOUND");
    assertMapping(new EmailAlreadyTakenException("x"), HttpStatus.CONFLICT, "EMAIL_ALREADY_TAKEN");
    assertMapping(new RoleAlreadyExistsException("x"), HttpStatus.CONFLICT, "ROLE_ALREADY_EXISTS");
    // PR4.1 normalized statuses:
    assertMapping(new PasswordsDoNotMatchException("x"), HttpStatus.BAD_REQUEST, "PASSWORDS_DO_NOT_MATCH");
    assertMapping(new InvalidUserDetailsException("x"), HttpStatus.BAD_REQUEST, "INVALID_USER_DETAILS");
    assertMapping(new InvalidLrsUserException("x"), HttpStatus.BAD_REQUEST, "INVALID_LRS_USER");
    assertMapping(new RoleNotAllowedException("x"), HttpStatus.FORBIDDEN, "ROLE_NOT_ALLOWED");
  }

  @Test
  public void preserveMessageAndKeepCauseOutOfClientDetails() {
    UserNotFoundException ex = new UserNotFoundException("User not found.", new RuntimeException("db down"));
    assertThat(ex.getMessage()).isEqualTo("User not found.");
    assertThat(ex.getCause().getMessage()).isEqualTo("db down"); // available for server-side logging
    assertThat(ex.getDetails()).isNull(); // never exposed to clients
  }

  private static void assertMapping(OpenLapException ex, HttpStatus status, String code) {
    assertThat(ex).isInstanceOf(OpenLapException.class);
    assertThat(ex.getStatus()).isEqualTo(status);
    assertThat(ex.getCode()).isEqualTo(code);
  }
}
