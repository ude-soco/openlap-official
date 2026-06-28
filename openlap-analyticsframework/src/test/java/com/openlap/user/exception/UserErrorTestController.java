package com.openlap.user.exception;

import com.openlap.user.exception.role.RoleAlreadyExistsException;
import com.openlap.user.exception.role.RoleNotAllowedException;
import com.openlap.user.exception.role.RoleNotFoundException;
import com.openlap.user.exception.user.EmailAlreadyTakenException;
import com.openlap.user.exception.user.InvalidLrsUserException;
import com.openlap.user.exception.user.InvalidUserDetailsException;
import com.openlap.user.exception.user.PasswordsDoNotMatchException;
import com.openlap.user.exception.user.UserNotFoundException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Test-only controller that throws each migrated user-module exception. Test sources only. */
@RestController
@RequestMapping("/user-error-test")
public class UserErrorTestController {

  @GetMapping("/user-not-found")
  public void userNotFound() {
    throw new UserNotFoundException("User not found.");
  }

  @GetMapping("/role-not-found")
  public void roleNotFound() {
    throw new RoleNotFoundException("Role 'X' not found");
  }

  @GetMapping("/email-taken")
  public void emailTaken() {
    throw new EmailAlreadyTakenException("Email already taken.");
  }

  @GetMapping("/role-exists")
  public void roleExists() {
    throw new RoleAlreadyExistsException("Role already exists");
  }

  @GetMapping("/password-mismatch")
  public void passwordMismatch() {
    throw new PasswordsDoNotMatchException("Passwords do not match");
  }

  @GetMapping("/invalid-details")
  public void invalidDetails() {
    throw new InvalidUserDetailsException("Only one of LRS provider/consumer should be provided");
  }

  @GetMapping("/invalid-lrs")
  public void invalidLrs() {
    throw new InvalidLrsUserException("Not a valid LRS user.");
  }

  @GetMapping("/role-not-allowed")
  public void roleNotAllowed() {
    throw new RoleNotAllowedException("Role not allowed");
  }
}
