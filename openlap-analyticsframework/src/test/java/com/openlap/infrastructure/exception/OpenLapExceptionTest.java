package com.openlap.infrastructure.exception;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Collections;
import java.util.Map;
import org.junit.Test;
import org.springframework.http.HttpStatus;

/** Maps each semantic exception to its HTTP status / default code and verifies cause safety. */
public class OpenLapExceptionTest {

  @Test
  public void defaultStatusAndCodePerType() {
    assertStatusAndCode(new ValidationException("m"), HttpStatus.BAD_REQUEST, "VALIDATION_FAILED");
    assertStatusAndCode(new NotFoundException("m"), HttpStatus.NOT_FOUND, "NOT_FOUND");
    assertStatusAndCode(new ConflictException("m"), HttpStatus.CONFLICT, "CONFLICT");
    assertStatusAndCode(new UnauthorizedException("m"), HttpStatus.UNAUTHORIZED, "UNAUTHORIZED");
    assertStatusAndCode(new ForbiddenException("m"), HttpStatus.FORBIDDEN, "FORBIDDEN");
    assertStatusAndCode(new InfrastructureException("m"), HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR");
  }

  @Test
  public void customCodeIsHonoured() {
    OpenLapException ex = new NotFoundException("USER_NOT_FOUND", "User not found.");
    assertThat(ex.getCode()).isEqualTo("USER_NOT_FOUND");
    assertThat(ex.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
    assertThat(ex.getMessage()).isEqualTo("User not found.");
  }

  @Test
  public void detailsAreRetained() {
    Map<String, Object> details = Collections.singletonMap("conflictingId", "abc");
    OpenLapException ex = new ConflictException("EMAIL_ALREADY_TAKEN", "taken", details);
    assertThat(ex.getDetails()).containsEntry("conflictingId", "abc");
  }

  @Test
  public void causeIsAvailableForLoggingButNotInDetails() {
    Throwable root = new RuntimeException("boom");
    OpenLapException ex = new InfrastructureException("DB write failed", root);

    assertThat(ex.getCause()).isSameAs(root); // available for server-side logging
    assertThat(ex.getDetails()).isNull(); // never exposed to clients
  }

  private static void assertStatusAndCode(OpenLapException ex, HttpStatus status, String code) {
    assertThat(ex.getStatus()).isEqualTo(status);
    assertThat(ex.getCode()).isEqualTo(code);
  }
}
