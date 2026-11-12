// Frontend mirror of the OpenLAP password policy.
//
// SOURCE OF TRUTH: the BACKEND
// (openlap-analyticsframework `com.openlap.user.validation.PasswordValidator`).
// This module exists only to power the live Register checklist for user
// guidance — it does NOT gate form submission; the backend always re-validates
// and is authoritative.
//
// ⚠️ If the backend policy changes, update the constants / rules below to match.
//
// Manual test checklist (Register):
//   - too short (< 12 chars)            → "At least 12 characters" unmet
//   - too long (> 64 chars)             → "At most 64 characters" unmet
//   - missing uppercase/lowercase/number/special → matching rule unmet
//   - an invalid character (e.g. a space, "€") → "Only allowed characters" unmet
//   - a valid 12–64 password meeting all rules → all rules met, submit succeeds
//   - confirm-password mismatch         → "Passwords do not match"

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 64;

// Must match PasswordValidator.ALLOWED_SPECIALS on the backend ("§" is U+00A7).
export const ALLOWED_SPECIAL_CHARACTERS = "!\"§$%&/()=?*+#-_.:,;@";

const isAllowedCharacter = (ch) =>
  /[A-Za-z0-9]/.test(ch) || ALLOWED_SPECIAL_CHARACTERS.includes(ch);

// Each rule mirrors one backend check, in the same order.
export const PASSWORD_RULES = [
  {
    id: "minLength",
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    test: (pw) => pw.length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: "maxLength",
    label: `At most ${PASSWORD_MAX_LENGTH} characters`,
    test: (pw) => pw.length > 0 && pw.length <= PASSWORD_MAX_LENGTH,
  },
  {
    id: "uppercase",
    label: "At least 1 uppercase letter",
    test: (pw) => /[A-Z]/.test(pw),
  },
  {
    id: "lowercase",
    label: "At least 1 lowercase letter",
    test: (pw) => /[a-z]/.test(pw),
  },
  {
    id: "number",
    label: "At least 1 number",
    test: (pw) => /[0-9]/.test(pw),
  },
  {
    id: "special",
    label: "At least 1 allowed special character",
    test: (pw) => [...pw].some((ch) => ALLOWED_SPECIAL_CHARACTERS.includes(ch)),
  },
  {
    id: "allowedOnly",
    label: "Only allowed characters are used",
    test: (pw) => pw.length > 0 && [...pw].every(isAllowedCharacter),
  },
];

// Evaluates every rule against the given password → [{ id, label, met }].
export const getPasswordCriteria = (password = "") =>
  PASSWORD_RULES.map(({ id, label, test }) => ({
    id,
    label,
    met: test(password),
  }));
