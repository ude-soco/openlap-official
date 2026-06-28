# Localization (i18n) — status & TODO

## Finding
The frontend currently has **no i18n/translation system** — no `i18next` / `react-i18next` /
`react-intl` dependency, no locale files, and no `useTranslation`/`FormattedMessage` usage. All
user-facing copy is inline English string literals.

Introducing a full i18n framework was intentionally **out of scope** for the
landing/auth redesign (it would be a large, app-wide migration). This note records the
public-facing strings that should be localized **first** when i18n is later adopted.

## Recommended approach (when adopting i18n)
1. Add `i18next` + `react-i18next`, an `i18n` init, and `src/locales/{en,de}/…json`.
2. Wrap strings with `t("…")`, starting with the **public** pages below (highest user visibility,
   smallest surface) before tackling the authenticated app.
3. The password rule labels are already centralized in
   [`common/utils/password-policy.js`](./utils/password-policy.js) — a single, clean seam to
   localize the checklist.

## Strings to localize (priority order)

### 1. Login (`pages/login/login.jsx`)
- Title "Welcome back"; subtitle "Sign in to your OpenLAP account"
- Button "Sign in"; loading "Logging in..."
- "Don't have an account?" / "Create an account"
- Caption "Part of the OpenLAP learning analytics ecosystem"
- Field labels "Email Address", "Password"; toggle aria "Show password" / "Hide password"
- Snackbars "Login successful!", "An unexpected error occurred. Please try again."

### 2. Register (`pages/register/register.jsx`)
- Title "Create your account"; subtitle "Join OpenLAP to design and implement your learning analytics indicators"
- Section labels "Account details", "Learning Record Store connection"
- Switch "Connect to a Learning Record Store (LRS)?"; "Choose role", "User", "Data Provider" + role tooltips
- Button "Create an account"; loading "Preparing your account..."
- "Already have an account?" / "Log in to your account"
- Confirm feedback "Passwords match" / "Passwords do not match"
- Snackbars "Account created successfully!", error messages

### 3. Password checklist (`common/utils/password-policy.js`)
- "Password requirements:" heading, the 7 rule labels, "Allowed special characters: …"
- Screen-reader state " — met" / " — not met"
- Note: backend validation messages are returned by the API and would need separate (server-side) localization.

### 4. Shared auth (`common/components/auth-header/auth-header.jsx`)
- Logo aria "OpenLAP, go to homepage"; cross-link labels "Sign in" / "Sign up"

### 5. Landing page (`pages/landing-page/**`) — larger, lower priority
- Section headings/subtitles (Architecture, Features, Team, News, Publications, Contact), nav labels,
  hero copy/CTAs, footer. Content (news/publications/team) already lives in `data/` and would be
  localized there or via keyed lookups.

> Backend-sourced strings (validation/error messages from `openlap-analyticsframework`) are
> **not** frontend-localizable here and would require server-side i18n.
