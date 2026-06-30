# OpenLAP Admin Dashboard — Catalog Soft-Disable Plan

**Status:** Active · **PR D1 (backend) in progress**
**Prereq reading:** [`admin-dashboard-plan.md`](./admin-dashboard-plan.md), [`admin-dashboard-management-plan.md`](./admin-dashboard-management-plan.md)
**Last updated:** 2026-06-30

Allow admins to **enable/disable** visualization libraries, visualization types, and
analytics methods. Disabled items are hidden from **new** indicator selection but
**existing saved indicators keep rendering/analyzing/editing**. No hard delete.

---

## 1. Current entity / list behavior (verified)

**Entities — no flag today** (must add):
| Entity | `@Document` | Lombok | Fields |
|---|---|---|---|
| `VisLibrary` | `visualization-library` | `@Data @Getter @Setter @AllArgsConstructor @NoArgsConstructor` | id, creator, name, description, frameworkLocation, `@DBRef visualizationTypes` |
| `VisType` | `visualization-type` | same | id, `@DBRef visualizationLib`, name, chartConfiguration, implementingClass |
| `AnalyticsTechnique` | `analytics-technique` | `@Getter @Setter @AllArgsConstructor @NoArgsConstructor` | id, name, description, type, creator, fileName, implementingClass, outputs |

**Editor list endpoints → service methods (filter targets):**
- `GET /v1/visualizations/libraries` → `VisualizationLibraryServiceImpl.getAllVisualizationLibraries()`
- `GET /v1/visualizations/types` & `/libraries/{id}/types` → `VisualizationTypeServiceImpl` (shared `generateVisTypeResponseList`)
- `GET /v1/analytics/methods` → `AnalyticsTechniqueServiceImpl.getAllAnalyticsTechniques()`

**Render/analyze paths are decoupled (the safety guarantee):** saved indicators embed
`@DBRef`s and re-resolve by id — `fetchVisualizationTypeMethod`/`fetchVisualizationLibraryMethod`
(`findById`), `loadAnalyticsMethodInstance`→`fetchAnalyticsTechniqueMethod` (`findById`).
None consult `enabled` or the list methods (zero caller overlap). → disabling never breaks
existing indicators.

**Shared-endpoint conflict:** admin pages and the editor call the *same* GETs, so the admin
surface needs **separate** list endpoints that return all items.

**Edit hydration is safe:** editing re-hydrates the selected item by value from the saved
`configuration` blob (sessionStorage), not from the list endpoints.

---

## 2. Backend design

**A. Entity flag (no migration):** `private Boolean enabled = true;` + explicit
`public boolean isEnabled() { return enabled == null || enabled; }` on all three entities.
The `= true` initializer runs in the no-args constructor Spring Data uses, so documents
missing the field read back `true`; the getter coalesces residual `null`. New uploads/creates
set `enabled=true` explicitly.

**B. Filter editor list endpoints to enabled-only** (in the list methods only):
- libraries: keep `isEnabled()`.
- types (`generateVisTypeResponseList`): keep `type.isEnabled()` **and** parent
  `type.getVisualizationLib().isEnabled()`.
- analytics: filter in `getAllAnalyticsTechniques()` **only** — not the shared
  `fetchAllAnalyticsTechniquesMethod()` (reused by populate/upload dedup).

**C. Leave unfiltered** (existing indicators must keep working): all by-id detail endpoints
(`/types/{id}`, `/types/{id}/inputs|outputs`, `/analytics/methods/{id}`,
`/input-params|inputs|outputs|params/{id}`, `/validate`) and the `/preview`, `/analyze`,
`/update` and render resolvers.

**D. New admin endpoints** (under existing `/v1/admin/**` SUPER_ADMIN matcher — no SecurityConfig change):
- `GET /v1/admin/visualizations/libraries` · `…/types` · `GET /v1/admin/analytics-methods` →
  all items incl. disabled, with `enabled`.
- `PATCH …/libraries/{id}/status` · `…/types/{id}/status` · `…/analytics-methods/{id}/status`
  — body `{ "enabled": boolean }`, returns updated DTO.
- Usage warning data already exists at `GET /v1/admin/usage` (per-id `indicatorCount` /
  `uniqueUserCount`; absent id = 0).

---

## 3. Frontend UX (PR D2)

Admin pages switch to the admin list endpoints; show Enabled/Disabled chips; enable/disable
toggle → confirmation dialog with usage warning ("Used by N indicators; disabling prevents new
use but does not break existing indicators"); update row + snackbar. No hard delete.

---

## 4. Migration / backward compatibility

No migration script — boxed `Boolean enabled = true` + null-coalescing `isEnabled()` makes
legacy docs read as enabled. New writes set the flag explicitly. Fully reversible.

---

## 5. PR sequence

- **PR D1 — backend:** entity flag; editor-list filtering (+ parent-library check for types);
  admin list endpoints (DTO `enabled`); PATCH status endpoints; tests.
- **PR D2 — frontend:** admin pages → admin endpoints, status chips, enable/disable +
  confirmation + usage warning.

(Usage-gated **hard delete** stays a later PR — not bundled here.)

---

## 6. Risks / decisions

1. Separate `/v1/admin/**` catalog list endpoints (chosen) vs. `?includeDisabled` on user GETs.
2. Type under a disabled library hidden via a parent-`isEnabled()` check (no cascade writes).
3. Re-saving an existing indicator that references a disabled item is allowed (reference persists;
   can't switch to a disabled item).
4. Render/analyze/preview/update paths are **never** filtered by `enabled`.
