# OpenLAP Admin Dashboard — Audit & Implementation Plan

**Status:** Active · **PR1 (admin shell + docs) in progress**
**Scope owner:** Admin Dashboard initiative
**Last updated:** 2026-06-30

This document captures a read-only audit of the OpenLAP codebase and the agreed,
incremental plan for an **Admin Dashboard** where `ROLE_SUPER_ADMIN` users manage:
Users, Visualization Libraries, Visualization Types, and Analytics Methods.

> The audit changed no code. Implementation proceeds in small, reviewable PRs.
> PR1 builds only the protected shell + this document — no management features.

---

## 1. Executive summary

The foundations already exist. OpenLAP has a working admin role
(`ROLE_SUPER_ADMIN`), enforced end-to-end (DB → JWT `roles` claim → backend URL
guards → frontend `PrivateRoute` + role-filtered sidebar), and a **scaffolded
admin area** (`src/pages/admin/` with `/manage-analytics` and
`/manage-visualization`) that already lists, uploads, and deletes the
analytics/visualization plugin JARs.

The gaps cluster in two areas:

- **User management** is almost entirely missing as an admin surface. There is
  **no "list users" endpoint**, no admin edit, no delete/deactivate, and the
  `User` entity has **no status or createdOn field**. Only role *assignment*
  exists (backend `POST /v1/roles/add`, no UI).
- **Catalog management** (viz libraries/types, analytics methods) is functional
  but has **no enable/disable** (only destructive delete), is stylistically
  pre-modern, and has plugin-loader hazards (no classloader eviction; some
  state-changing operations exposed as `GET` and reachable by ordinary users).

**Approach:** build the dashboard as a thin, mostly-frontend effort that reuses
the existing role/guard/catalog endpoints, restyles the existing admin pages to
the modern design system, and adds **one small backend slice** (a paginated,
admin-gated *list users* endpoint) to unblock a read-only Users page. Defer
anything needing entity/schema changes (user status, soft enable/disable, audit
logging) and treat plugin upload as a separately-approved scope.

---

## 2. Decisions (locked for this initiative)

| # | Decision |
|---|----------|
| 1 | **Consolidate** management under `/admin/*`; keep **redirects** from `/manage-analytics` and `/manage-visualization` so old links don't break. |
| 2 | Users page first cut is **read-only list only** — no role assignment in the first Users PR. |
| 3 | **Defer** `User` schema/login changes — ship Users **without** status/created-date for now. |
| 4 | **Hide plugin upload** in the new admin UI. Existing backend endpoints stay untouched; just don't surface upload yet. |
| 5 | **Read-only first** — no delete / enable / disable in the first admin PRs. |
| 6 | The "state-changing `GET`" authorization smell is logged as a **security follow-up**, not mixed into dashboard PRs (unless trivial + low risk). |
| 7 | **Defer** audit logging. |
| 8 | This plan is saved at `docs/admin-dashboard-plan.md`. |

---

## 3. Existing capabilities

### Authentication & authorization
- Roles: `RoleType` enum — `ROLE_USER`, `ROLE_USER_WITHOUT_LRS`,
  `ROLE_SUPER_ADMIN`, `ROLE_DATA_PROVIDER`. **Admin = `ROLE_SUPER_ADMIN`**,
  seeded at startup (`AnalyticsFramework.java`). Frontend mirror:
  `src/pages/account-manager/utils/enums/role-types.js` (`admin: "ROLE_SUPER_ADMIN"`).
- Backend authz is **URL-pattern based, first-match-wins**, all in
  `security/SecurityConfig.java`. **No method security** (`@PreAuthorize` etc.)
  anywhere. Admin-gated patterns: `/v1/roles/**`, `/v1/engine/**`, and **write**
  (non-GET) on `/v1/analytics/**` & `/v1/visualizations/**`. Uses
  `hasAnyAuthority("ROLE_SUPER_ADMIN")`, not `hasRole`.
- Frontend guard: `src/setup/routes-manager/private-routes.jsx`
  (`<PrivateRoute allowedRoles={[RoleTypes.admin]}>`). Non-matching users are
  redirected to `/login` (there is no dedicated "unauthorized" page yet).
- Role-filtered sidebar already exists (`common/components/app-shell/sidebar-nav.jsx`
  + `setup/routes-manager/router-config.jsx`).

### Catalog (visualization + analytics) — already API-complete
| Capability | Visualization | Analytics |
|---|---|---|
| List | `GET /v1/visualizations/libraries`, `/types`, `/libraries/{id}/types` — used by the editor | `GET /v1/analytics/methods`, `/inputs|params|input-params/{id}` — used by editor + admin page |
| Upload JAR | `POST /v1/visualizations/upload` (admin) | `POST /v1/analytics/methods/upload` (admin) — already wired in admin UI |
| Delete | `DELETE /libraries/{id}`, `/types/{id}`, `/delete?fileName=` (admin) | `DELETE /methods/{id}`, `/delete?fileName=` (admin) |
| Storage | Mongo `visualization-library` / `visualization-type`, **JAR-derived** | Mongo `analytics-technique`, **JAR-derived** |

### User — self-service only
- `GET /v1/users/my`, `PATCH /v1/users/my/profile|email|password`, LRS add/delete —
  all bound to "current user from JWT". Full self-service UI in
  `src/pages/account-manager`.
- Role assignment: `POST /v1/roles/add {role, userEmail}` (admin-gated) — no UI.

### Design system (reuse these)
`PageHeader`, `EmptyState`, `SectionCard`, `DashboardCard`, `MetadataChip`,
`CustomDialog`, plus the modern list-page pattern in
`src/pages/indicators/dashboard/components/my-indicators-table.jsx` (list/card
toggle, Grid v2, overflow `Menu`, per-row busy, en-GB dates, `TablePagination`,
`theme.custom.radii.card`). Tokens live in `common/theme/scoped-theme.js`
(`custom.radii.card = 16`, `custom.shadows.card`, `custom.motion`).

---

## 4. Missing APIs

| Need | Status | Notes |
|---|---|---|
| List all users (paginated) | Missing | `UserRepository` has only `findByEmail`; `findAll()` inherited but unused. **Blocks the Users page.** |
| Expose user `id` + `roles` in a DTO | Missing | `UserResponse` returns only name/email/LRS. |
| Remove a role from a user | Missing endpoint | Service method `removeRoleFromUser` exists; no controller. |
| Admin create user (incl. admin) | Missing | `createAdmin()` is bootstrap-only; registration blocks `ROLE_SUPER_ADMIN`. |
| Admin edit *another* user | Missing | All edit paths hard-wired to JWT identity. |
| Delete user | Missing | Cascade concerns (LRS stores/clients, indicators). |
| User `enabled`/`status`, `createdOn` | Missing fields | Entity + login-path change. "Deactivate" is **not representable** today. |
| Enable/disable lib/type/method (soft) | Missing flag | No `enabled` field on any catalog entity; only hard delete. |

---

## 5. Information architecture

```
/admin                         Overview — section cards + (future) counts
├─ /admin/users                Users: read-only list (roles); assignment later
├─ /admin/visualizations
│   ├─ /libraries              Visualization libraries + JAR source
│   └─ /types                  Chart types: library, inputs, image
└─ /admin/analytics-methods    Analytics methods: inputs, params, type, source
```

Legacy `/manage-analytics` and `/manage-visualization` **redirect to `/admin`**
(consolidation). The existing page components remain in the repo and are
reintroduced, restyled, under `/admin/*` in later PRs.

---

## 6. Proposed route structure

All inside the private tree in `src/setup/routes-manager/app-routes.jsx`,
lazy-loaded and wrapped in `PrivateRoute allowedRoles={[RoleTypes.admin]}`:

```jsx
<Route path="/admin"                           element={<PrivateRoute component={<AdminOverview/>}        allowedRoles={[RoleTypes.admin]} />} />
<Route path="/admin/users"                     element={<PrivateRoute component={<AdminUsers/>}           allowedRoles={[RoleTypes.admin]} />} />   {/* PR3 */}
<Route path="/admin/visualizations/libraries"  element={<PrivateRoute component={<AdminVizLibraries/>}    allowedRoles={[RoleTypes.admin]} />} />   {/* PR4 */}
<Route path="/admin/visualizations/types"      element={<PrivateRoute component={<AdminVizTypes/>}        allowedRoles={[RoleTypes.admin]} />} />   {/* PR4 */}
<Route path="/admin/analytics-methods"         element={<PrivateRoute component={<AdminAnalyticsMethods/>} allowedRoles={[RoleTypes.admin]} />} />  {/* PR5 */}
<Route path="/manage-analytics"     element={<Navigate to="/admin" replace />} />
<Route path="/manage-visualization" element={<Navigate to="/admin" replace />} />
```

Admin paths are **not** in `FULL_BLEED_PATH_PREFIXES`, so they automatically get
the content-sheet `Paper` wrapper from the layout — don't add an outer
`Container`. Consider a dedicated `/unauthorized` page in a later PR.

---

## 7. Proposed UI structure

- **`/admin` overview**: `PageHeader` + a `Grid` of cards (Users, Viz Libraries,
  Viz Types, Analytics Methods). Counts come from the list endpoints once wired;
  the Users count needs the new list endpoint (until then, no number).
- **`/admin/users`**: modern list pattern (control bar, search, list/card,
  `TablePagination`). Columns: name, email, role chips. createdOn/status only if
  the backend adds them — otherwise omit, don't fake.
- **Catalog pages**: same list pattern; reuse existing `manage-apis.js`, render
  with `PageHeader`/`SectionCard`/`EmptyState`/`MetadataChip`. Destructive
  actions (later, if approved) via `CustomDialog type="delete"`.
- Styling via shared components + `theme.custom` tokens only.

---

## 8. Backend changes needed (scoped)

**Minimal (unblocks read-only Users):**
- `GET /v1/users` (admin) — paginated → new `AdminUserResponse {id, name, email, roles[]}`
  (never password). Add an antMatcher
  `.antMatchers("/v1/users").hasAnyAuthority(ROLE_SUPER_ADMIN)` **before** the
  existing `/v1/users/my/**` rule (first-match-wins).
- Optional `GET /v1/users/count` for the overview (or derive from page metadata).

**Small (if write actions approved later):** role-remove endpoint
(`removeRoleFromUser` service exists); admin-create user.

**Larger (deferred — out of current scope):** `enabled`/`status` + `createdOn` on
`User` + `enabled` filtering in `loadUserByUsername`; soft `enabled` flags on
catalog entities + toggle endpoints + list filtering; classloader cache eviction
+ `URLClassLoader.close()` for safe JAR replace; cascade-safe deletes (dangling
`@DBRef`).

---

## 9. Frontend changes needed

- New admin pages (section 7), lazy routes (section 6), one admin nav group in
  `router-config.jsx` (`allowedRoles:[RoleTypes.admin]`) — `sidebar-nav.jsx`
  needs no change (renders generically).
- Restyle/replace the two existing `pages/admin/*` pages to the modern pattern;
  keep `manage-apis.js` (extend with `requestUsers` when the endpoint lands).
- New `admin/utils/admin-api.js` for user/role calls. Consider adding an
  `isAdmin` helper (none exists; role checks are inline `user.roles.some(...)`).
- Optional `/unauthorized` page.

---

## 10. Security requirements & risks

**Must-haves**
- **Backend enforcement is mandatory.** Frontend `PrivateRoute`/sidebar hiding is
  cosmetic. Every new admin endpoint **must** get a
  `hasAnyAuthority(ROLE_SUPER_ADMIN)` antMatcher in `SecurityConfig`, with
  **correct ordering** (the broad `/v1/analytics|visualizations/**` admin rule
  sits *after* a GET rule granting `ROLE_USER`).
- **Destructive actions** → always confirm via `CustomDialog type="delete"` with
  explicit consequence text.
- **Never expose password**; expose `id`/`roles` only in admin DTOs.

**Risks to flag (found in audit — fix recommended, out of dashboard scope)**
1. **State-changing `GET` reachable by ordinary users.**
   `GET /v1/analytics/methods/populate`, `GET …/reload`, and
   `GET /v1/visualizations/reload` match the GET rule that grants `ROLE_USER`
   (first-match-wins), so **non-admins can trigger JAR rescans/reloads.** →
   tracked as a security follow-up (decision #6).
2. **Plugin upload = remote code execution surface.** Uploaded JARs are
   class-loaded and instantiated server-side. It exists and is admin-gated; a
   polished UI increases use. Upload stays **hidden** in the new UI (decision #4).
3. **Classloader cache never evicted** (viz): in-place JAR replacement serves
   stale classes and leaks file handles until restart.
4. **Dangling `@DBRef` on delete:** deleting a method/library still referenced by
   a saved indicator orphans the reference. Admin delete should warn / check use.
5. **No audit logging** for role/user changes — deferred (decision #7).
6. **"Deactivate user" is not representable** (no status field) — don't add a
   disabled-looking toggle that no-ops (decision #3).

---

## 11. Incremental PR plan

Ordering note: the Users page needs a backend list endpoint, so a small backend
slice (PR3-BE) precedes the Users frontend (PR3-FE).

| PR | Scope | FE/BE | Behavior change | Risk |
|---|---|---|---|---|
| **PR1** Admin shell + docs | `/admin` route, admin sidebar entry, redirects from `/manage-*`, placeholder overview, this doc | FE | New admin landing (admin only); legacy JAR routes redirect to `/admin` | Low |
| **PR2** Overview (read-only) | Count cards from existing list endpoints (Users numberless until PR3-BE) | FE | Shows catalog counts | Low |
| **PR3-BE** List users | `GET /v1/users` paginated + `AdminUserResponse` + ordered antMatcher | BE | New admin-only read endpoint | Low–Med |
| **PR3-FE** Users page | Read-only user list (name/email/role chips), search, pagination | FE | New admin Users page | Low |
| **PR4** Viz libraries/types (read-only, restyled) | Move + modernize `manage-visualization` into `/admin/visualizations/*` | FE | Restyle only; same data | Low |
| **PR5** Analytics methods (read-only, restyled) | Modernize `manage-analytics` into `/admin/analytics-methods` | FE | Restyle only | Low |
| **PR6** Write actions *(opt., if approved)* | Role-assign UI; carry over delete + (approved) upload with confirm dialogs | FE (+ tiny BE) | Admins can assign roles / delete / upload | Med |
| **PR7** Deferred backend *(only if scoped)* | User status/createdOn, soft enable/disable, classloader eviction, cascade-safe delete | BE | Enables deactivate / soft-disable | High |

---

## 12. PR1 — what shipped

- This document (`docs/admin-dashboard-plan.md`).
- `/admin` route, protected by `PrivateRoute allowedRoles={[RoleTypes.admin]}`.
- New `src/pages/admin/admin-overview.jsx` — `PageHeader` + four placeholder
  `DashboardCard`s ("Coming next"). No backend calls.
- Sidebar: the "Manage JARs" admin group is replaced by an **"Administration"**
  group with a single **"Admin Dashboard"** entry (`/admin`), admin-only.
- Redirects: `/manage-analytics` and `/manage-visualization` → `/admin`.
- The existing `manage-analytics.jsx` / `manage-visualization.jsx` components are
  **retained** in the repo (no routes reference them yet) for reuse in PR4/PR5.

**Intentionally unchanged:** all backend code, every existing API, role/security
logic, plugin upload exposure, and any delete/enable/disable behavior.

**Follow-ups opened by PR1:**
- JAR upload/delete UI is temporarily not reachable (returns restyled in PR4/PR5).
- Security follow-up: state-changing `GET` endpoints reachable by `ROLE_USER`.
