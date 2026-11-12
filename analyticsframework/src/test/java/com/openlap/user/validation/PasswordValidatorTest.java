package com.openlap.user.validation;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import java.nio.charset.StandardCharsets;
import org.junit.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

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
  public void acceptsMaximumUtf8ByteLengthWithAllowedMultibyteCharacters() {
    String password = "Aa1!" + "§".repeat(8) + "x".repeat(52);
    assertEquals(64, password.length());
    assertEquals(72, password.getBytes(StandardCharsets.UTF_8).length);
    assertNull(PasswordValidator.firstViolation(password));
    BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(4);
    assertTrue(encoder.matches(password, encoder.encode(password)));
  }

  @Test
  public void rejectsTooManyUtf8BytesDespiteAnAllowedCharacterLength() {
    String password = "Aa1!" + "§".repeat(9) + "x".repeat(51);
    assertEquals(64, password.length());
    assertEquals(73, password.getBytes(StandardCharsets.UTF_8).length);
    assertEquals("Password must use at most 72 UTF-8 bytes; shorten it or use fewer § characters",
        PasswordValidator.firstViolation(password));
  }

  @Test
  public void existingLegacyHashWithMoreThan72BytesStillAuthenticates() {
    String password = "Aa1!" + "§".repeat(9) + "x".repeat(51);
    // The old encoder accepted this input. Keep verification compatible while
    // rejecting it for new passwords; never rehash it through the old encoder.
    String legacyHash = org.mindrot.jbcrypt.BCrypt.hashpw(password, org.mindrot.jbcrypt.BCrypt.gensalt(4));
    assertTrue(new BCryptPasswordEncoder(4).matches(password, legacyHash));
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
