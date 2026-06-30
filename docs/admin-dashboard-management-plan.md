# OpenLAP Admin Dashboard — Management Phase: Audit & Plan

**Status:** Active · **PR A (usage counts) in progress**
**Prereq reading:** [`admin-dashboard-plan.md`](./admin-dashboard-plan.md) (read-only phase, PR1–PR5, shipped)
**Last updated:** 2026-06-30

Extends the dashboard beyond read-only inspection so admins can manage users,
visualization libraries/types, and analytics methods. This is security-sensitive;
the plan is sequenced so the safe, additive work lands first and the
remote-code-execution-class work (plugin upload) is gated behind hardening.

---

## 1. Executive summary

Two risk tiers:

- **Low-risk, mostly-additive (first):** usage counts, user-detail + LRS view
  (read-only, secret-stripped), admin role/profile management. The data model
  supports all of this with small, isolated backend additions — every reference
  we need (`indicator → method/library/type/creator`) is a structured `@DBRef`,
  and `add/removeRoleFromUser` already exist in the service layer.
- **High-risk, gated on hardening (last):** **JAR upload/reload** is
  **unsandboxed RCE** with **zero validation** and a **live path-traversal hole**,
  plus a currently-exploitable issue where `GET …/reload` and `…/populate` are
  reachable by any `ROLE_USER`. Hard delete corrupts data (dangling `@DBRef`s,
  orphaned content). **Do not expose upload/delete until §10 hardening is done.**

Recommended spine: usage counts → soft-disable (`enabled` flag) as the primary
"retire" mechanism → usage-gated delete → upload UI only after a dedicated
plugin-loader hardening PR. Prefer **deactivate over delete** for users and
catalog items. A near-term security patch (§10 items 1–2) is warranted
independently of any UI.

---

## 2. Existing write endpoints & risks

Context path `/api`. **None are currently reachable from the UI** (PR1 unrouted
the old `manage-*` pages; nothing calls roles/engine).

| Endpoint | Method | Required role (actual) | Mutates | Risk |
|---|---|---|---|---|
| `/v1/analytics/methods/upload` | POST | SUPER_ADMIN ✅ | JAR+DB | **RCE**, no validation, path traversal |
| `/v1/analytics/methods/{id}` | DELETE | SUPER_ADMIN ✅ | DB | Dangling `@DBRef` → render fails |
| `/v1/analytics/methods/delete?fileName=` | DELETE | SUPER_ADMIN ✅ | JAR+DB | Path traversal via `fileName` |
| `/v1/analytics/methods/create` | POST | SUPER_ADMIN ✅ | DB | Row → arbitrary class |
| `/v1/analytics/methods/reload` | **GET** | **ROLE_USER ⚠️** | re-scan+DB | Any user re-runs plugin code |
| `/v1/analytics/methods/populate` | **GET** | **ROLE_USER ⚠️** | re-scan+DB | Any user; undoes admin deletes |
| `/v1/visualizations/upload` | POST | SUPER_ADMIN ✅ | JAR+DB | **RCE**, no validation, traversal |
| `/v1/visualizations/{libraries/{id},types/{id},delete}` | DELETE | SUPER_ADMIN ✅ | JAR+DB | Dangling refs, traversal, stale-loader leak |
| `/v1/visualizations/reload` | **GET** | **ROLE_USER ⚠️** | re-scan+DB | Any user; stale classes after replace |
| `/v1/roles/create` · `/v1/roles/add` | POST | SUPER_ADMIN ✅ | DB | Add-only; no last-admin guard |
| `/v1/engine/initialize` | GET | SUPER_ADMIN ✅ | bulk populate | Re-runs all plugin code |
| user update / delete | — | — | — | **Do not exist** |

---

## 3. Usage-count feasibility — Easy → Moderate ✅

A saved `Indicator` references everything as structured `@DBRef`s (no blob parsing):
- method → `analyticsTechniqueReference.analyticsTechnique` (`@DBRef`; **null for COMPOSITE**)
- library → `visualizationTechniqueReference.visLibrary` (`@DBRef`)
- type → `visualizationTechniqueReference.visType` (`@DBRef`)
- creator → `createdBy` (`@DBRef User`) → unique-user counts

Both library and type are stored directly. `configurationRequest` blob is not needed.

**Recommended approach:** read indicators and tally by ref id. Because `@DBRef`
is stored as `{$ref,$id}`, **Spring-Data derived `countBy…` will NOT work**; use
either (a) a `MongoTemplate` pass reading the raw `$id`s (no target dereference —
safe against dangling refs + no N+1), or (b) a hand-written `@Query`/aggregation
on the `…$id` path (the pattern already exists in `IndicatorRepository`). PR A
uses (a): read raw `Document`s and tally in memory.

---

## 4. User / LRS management feasibility

| Capability | Verdict |
|---|---|
| View user detail (safe fields + roles) | Small backend add (`findById` inherited; no `…/{id}` yet) |
| View a user's LRS connections | Small backend add — reuse secret-free `LrsConsumerResponse`; add slim provider DTO |
| Update another user's name/email | Small backend add — current methods are JWT-self-bound |
| Role assign/remove | Small backend add — `add/removeRoleFromUser` exist; only `add` is exposed; needs remove/replace + last-admin guard |
| Deactivate (disable login) | Small→moderate — add `enabled` to `User`; switch `loadUserByUsername` to 7-arg `UserDetails` ctor |
| Delete user | **Unsafe without cascade work** (see §5) |

**🔴 Secrets — never expose:** `ClientApi.basic_auth` (Base64 `key:secret` = live
Authorization header), `basic_secret`, `basic_key`, `User.password`.
`LrsProviderResponse.basicAuth` exposes `basic_auth` on `GET /v1/users/my` — that's
**self-only** (likely intentional for the owner), but **admin/cross-user LRS views
must use a secret-stripped DTO, never `LrsProviderResponse`**. Safe to show: LRS
title, `lrsId`, `uniqueIdentifier`/`uniqueIdentifierType`, statement count, timestamps.

---

## 5. Safe delete / disable recommendation

Hard delete is unsafe (dangling `@DBRef`s → indicator render/analyze failures, no
migration; users orphan their content). Recommendation:

1. **Soft-disable is the primary retire mechanism.** Add `enabled` (default true)
   to `VisLibrary`, `VisType`, `AnalyticsTechnique`, `User`.
   - **Editor invariant:** disabled items are filtered out of the editor's
     selection lists (no *new* usage), but the render/analyze path is unchanged
     (resolves the `@DBRef` regardless of `enabled`), so **existing saved
     indicators keep working**.
   - Disabled user = blocked new logins/refreshes; data preserved.
2. **Show "Used by N indicators"** before destructive actions.
3. **Hard delete only when `usageCount == 0`** (catalog: also after loader/file
   cleanup). Block with an explanation when in use; offer "Disable instead".
4. **User delete:** prefer deactivate; allow delete only with an explicit cascade
   strategy (see below).

**Cascade facts (confirmed):** hard-deleting a user orphans `@DBRef createdBy` in
**Indicator, AnalyticsQuestion, IndicatorDrafts, ISC** (no cascade anywhere; no
delete endpoint exists). `LrsStore`/`LrsClient` are **organisation-owned**, so
they are *not* orphaned — only the user's embedded `lrsProviderList`/`lrsConsumerList`
(linkage + credential pointers) vanish with the user doc. `IndicatorDrafts` has
**no** `findByCreatedBy_Id` finder (Indicator/Question/ISC do), so cascade cleanup
of drafts needs a new query; per-resource deletes don't chain. So any
"cascade-delete user" must enumerate each collection explicitly.

---

## 6. Plugin upload / reload risk analysis

- **Upload = unsandboxed RCE.** No extension/magic/size/signature checks; the
  framework does `Class.forName(name, true, loader)` + `setAccessible(true).newInstance()`
  with the app classloader as parent → **arbitrary code runs during upload**.
- **Path traversal (live):** `getOriginalFilename()` concatenated raw into the
  path (`Utils.saveFile`/`deleteFile`) — affects upload, delete, reload's `fileName`.
- **Malformed JAR:** parse errors swallowed → HTTP 200 + orphaned file; partial inserts.
- **Replace-in-place (viz):** never-evicted `loaderCache` → stale classes +
  classloader/file-handle leak → restart required. Analytics re-reads fresh (clean).
- **Delete:** dangling `@DBRef`s → render/analyze throws; no migration/warning.
- **`reload`/`populate` reachable by `ROLE_USER`:** any user re-runs plugin code,
  undoes admin deletions.

**Verdict: do not expose upload/delete now.**

---

## 7. Proposed backend APIs

**Introduce a `/v1/admin/**` namespace** gated by a single early
`hasAnyAuthority(ROLE_SUPER_ADMIN)` matcher (avoids the `/v1/users/{id}` vs
`/v1/users/my/**` collision and first-match-wins fragility).

**Users:** `GET /v1/users` (exists) · `GET /v1/admin/users/{id}` ·
`PATCH /v1/admin/users/{id}` · `PATCH /v1/admin/users/{id}/roles` (last-admin guard) ·
`PATCH /v1/admin/users/{id}/status` (needs `User.enabled`) · `DELETE /v1/admin/users/{id}` (only after cascade decision).

**Usage:** `GET /v1/admin/usage` → `{ visualizationLibraries, visualizationTypes,
analyticsMethods }`, each `[{ id, indicatorCount, uniqueUserCount }]`. **(PR A.)**

**Catalog:** add `enabled` + `PATCH …/{id}/status`; reuse existing upload/delete
**only after §10 hardening**; `DELETE` must block when `usageCount > 0`.

---

## 8. Proposed frontend UX

**Users:** detail drawer/page; role chips; LRS connections table (title /
identifier / statement count — no secrets); inline edit name/email; Manage roles
+ Deactivate/Delete behind typed confirmation; never render password/basic-auth.

**Catalog (libraries/types/methods):** "Used by N indicators" column/chip;
Disable/Enable toggle (when soft-disable lands); Delete greyed with tooltip when
in use; upload/reload hidden until hardening; detail drawer with parsed
types/inputs/params (build on PR4/PR5 read-only views).

---

## 9. Phased PR plan

| PR | Scope | Tier | Depends on |
|---|---|---|---|
| **PR A** | Usage-count endpoint + display "Used by N" | Low, additive | — |
| **PR B** | `GET /v1/admin/users/{id}` + user detail page (read-only, secret-stripped LRS) | Low | — |
| **PR C** | Safe role management + admin profile/email update (last-admin guard, confirmations) | Medium | PR B |
| **PR D** | Soft-disable model: `enabled` on libraries/types/methods **and** `User`; editor filtering; login honors it; toggles + UI | Medium–High | PR A |
| **PR E** | Usage-gated delete (+ user delete only with cascade decision) | Medium–High | PR A, PR D |
| **PR G** | Plugin-loader hardening (§10) — prerequisite for PR F | High | — |
| **PR F** | Upload/reload UI — only after PR G | High | **PR G** |

Plus a recommended near-term **security patch** (independent): §10 items 1–2.

---

## 10. Must-fix security issues before exposing upload/delete

1. **Path-traversal / filename sanitization** (`Utils.saveFile`/`deleteFile`). *Current vuln.* Low.
2. **Lock `GET …/reload` & `…/populate` to SUPER_ADMIN.** *Current vuln.* Low.
3. **Validate uploads** (extension + JAR magic + manifest + size; reject empty class list; delete file on failure). Low–Medium.
4. **Trust boundary / RCE** — signed JARs / enforced package allowlist / isolation. High.
5. **`loaderCache` lifecycle (viz)** — evict + `close()` on delete/reload/replace. Medium.
6. **Dangling-ref handling on delete** — block while referenced or null-out + flag. Medium.
7. **Stop swallowing errors / clean orphaned files.** Low.

---

## 11. Open questions

1. Confirm `/v1/admin/**` namespace (single SUPER_ADMIN matcher). Keep `/v1/users` or migrate to `/v1/admin/users`?
2. Confirm soft-disable `enabled` model on libraries/types/methods/users; delete only when `usageCount === 0`?
3. Deactivate semantics: block-new-logins (token-expiry latency) vs immediate revocation (per-request `enabled` check)?
4. User delete in scope? If yes: block-if-owns / cascade-delete / reassign?
5. Confirm upload UI stays out until PR G; do the near-term security patch (§10 1–2) soon?
6. Confirm `basic_auth` self-exposure is intentional; admin views strip it.
7. Confirm last-SUPER_ADMIN protection + self-demotion guard.
8. Audit logging for admin actions — wanted? Facility available, or app logs for now?
9. Usage endpoint: combined (one DB pass) — confirmed for PR A. Include unique-user counts — confirmed.

---

## 12. PR A — what shipped

- Backend: `GET /v1/admin/usage` (SUPER_ADMIN-only via new `/v1/admin/**` matcher)
  → counts per visualization library / type / analytics method, each with
  `indicatorCount` and `uniqueUserCount`, computed from saved indicators by
  reading raw `@DBRef` `$id`s (null/dangling-safe, no N+1). New package
  `com.openlap.admin`.
- Frontend: "Used by N indicators / N users" on the three catalog admin pages,
  loaded best-effort (usage failure shows "Usage unavailable", never blocks the page).
- No write actions, no schema changes, no soft-disable — those are later PRs.
