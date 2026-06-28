package com.openlap.user.validation;

import java.util.function.IntPredicate;
import javax.validation.ConstraintValidator;
import javax.validation.ConstraintValidatorContext;

/**
 * Enforces the OpenLAP password policy:
 *
 * <ul>
 *   <li>between {@value #MIN_LENGTH} and {@value #MAX_LENGTH} characters
 *   <li>at least one uppercase letter
 *   <li>at least one lowercase letter
 *   <li>at least one number
 *   <li>at least one allowed special character
 *   <li>only letters, numbers and the allowed special characters
 * </ul>
 *
 * <p>Allowed special characters: {@code !"§$%&/()=?*+#-_.:,;@}
 *
 * <p>Null/blank values return valid here so they are reported by {@code @NotBlank} instead, which
 * avoids duplicate messages.
 */
public class PasswordValidator implements ConstraintValidator<ValidPassword, String> {

  static final int MIN_LENGTH = 12;
  static final int MAX_LENGTH = 64;

  /** Allowed special characters: ! " § $ % &amp; / ( ) = ? * + # - _ . : , ; @ ("§" is U+00A7). */
  static final String ALLOWED_SPECIALS = "!\"§$%&/()=?*+#-_.:,;@";

  @Override
  public boolean isValid(String value, ConstraintValidatorContext context) {
    if (value == null || value.isEmpty()) {
      return true;
    }
    String violation = firstViolation(value);
    if (violation == null) {
      return true;
    }
    context.disableDefaultConstraintViolation();
    context.buildConstraintViolationWithTemplate(violation).addConstraintViolation();
    return false;
  }

  /** Returns the first failing rule's message, or {@code null} when the password is valid. */
  static String firstViolation(String password) {
    if (password.length() < MIN_LENGTH) {
      return "Password must be at least " + MIN_LENGTH + " characters long";
    }
    if (password.length() > MAX_LENGTH) {
      return "Password must be at most " + MAX_LENGTH + " characters long";
    }
    if (!contains(password, Character::isUpperCase)) {
      return "Password must contain at least one uppercase letter";
    }
    if (!contains(password, Character::isLowerCase)) {
      return "Password must contain at least one lowercase letter";
    }
    if (!contains(password, Character::isDigit)) {
      return "Password must contain at least one number";
    }
    if (!containsAllowedSpecial(password)) {
      return "Password must contain at least one allowed special character";
    }
    if (!onlyAllowedCharacters(password)) {
      return "Password contains an invalid character. Only letters, numbers and the allowed special characters are permitted";
    }
    return null;
  }

  private static boolean contains(String password, IntPredicate predicate) {
    for (int i = 0; i < password.length(); i++) {
      if (predicate.test(password.charAt(i))) {
        return true;
      }
    }
    return false;
  }

  private static boolean containsAllowedSpecial(String password) {
    for (int i = 0; i < password.length(); i++) {
      if (ALLOWED_SPECIALS.indexOf(password.charAt(i)) >= 0) {
        return true;
      }
    }
    return false;
  }

  private static boolean onlyAllowedCharacters(String password) {
    for (int i = 0; i < password.length(); i++) {
      char c = password.charAt(i);
      boolean allowed =
          (c >= 'A' && c <= 'Z')
              || (c >= 'a' && c <= 'z')
              || (c >= '0' && c <= '9')
              || ALLOWED_SPECIALS.indexOf(c) >= 0;
      if (!allowed) {
        return false;
      }
    }
    return true;
  }
}
