package com.openlap.user.validation;

import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;

import org.junit.Test;

/** Unit tests for the OpenLAP password policy (see {@link PasswordValidator}). */
public class PasswordValidatorTest {

  @Test
  public void rejectsTooShort() {
    // 7 characters
    assertNotNull(PasswordValidator.firstViolation("Ab1@xyz"));
  }

  @Test
  public void rejectsTooLong() {
    // 65 characters, otherwise valid (upper, lower, digit, special, allowed chars).
    assertNotNull(PasswordValidator.firstViolation("A1@" + "a".repeat(62)));
  }

  @Test
  public void acceptsMaxLengthPassword() {
    // exactly 64 characters
    assertNull(PasswordValidator.firstViolation("A1@" + "a".repeat(61)));
  }

  @Test
  public void rejectsMissingUppercase() {
    assertNotNull(PasswordValidator.firstViolation("abcdefgh1@jk"));
  }

  @Test
  public void rejectsMissingLowercase() {
    assertNotNull(PasswordValidator.firstViolation("ABCDEFGH1@JK"));
  }

  @Test
  public void rejectsMissingNumber() {
    assertNotNull(PasswordValidator.firstViolation("Abcdefghi@jk"));
  }

  @Test
  public void rejectsMissingSpecial() {
    assertNotNull(PasswordValidator.firstViolation("Abcdefgh1jkl"));
  }

  @Test
  public void rejectsInvalidCharacter() {
    // Valid otherwise (length, upper, lower, digit, special), but contains a space.
    assertNotNull(PasswordValidator.firstViolation("Abcdef1@xy z"));
  }

  @Test
  public void acceptsValidPassword() {
    assertNull(PasswordValidator.firstViolation("Abcdefgh1@jk"));
  }

  @Test
  public void acceptsValidPasswordWithSectionSign() {
    // 12 chars, uses "§" (U+00A7) as the allowed special character.
    assertNull(PasswordValidator.firstViolation("Abcdefg1§xyz"));
  }
}
