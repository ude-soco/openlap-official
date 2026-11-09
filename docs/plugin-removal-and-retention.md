# Plugin removal, recovery and usage

Implemented on `feat/shoeb-plugin-management-s3`; not deployed. This extends the
[upload workflow](./plugin-upload-workflow.md) and
[version management](./plugin-version-management.md). All management endpoints
require SUPER_ADMIN and record successful and failed mutations in the admin audit.

## Remove or disable

Use **Disable** to retire a plugin from new selections while keeping saved work
usable. In **Details & versions → Review removal**, the server lists the exact
affected entries, revisions and reference counts before confirmation. A library
removal includes all currently available chart types. Removing a chart on its own
preserves its parent library and shared JAR.

Removal checks the primary MongoDB collections directly:

| Collection | Protected references |
| --- | --- |
| `analytics-indicator` | Saved indicators |
| `analytics-indicator-drafts` | Persisted editor sessions and configuration snapshots |
| `openlap-isc` | Saved and draft specification cards |
| `plugin-installation` | Pending installation and replacement sources |

The scanner handles BSON DBRefs, raw IDs, nested documents, arrays and JSON
snapshots. Known configuration fields with malformed or oversized JSON block
removal. Its error response gives counts and guidance without exposing user
configuration contents. Dashboard usage is deliberately narrower and must never
be used as the deletion guard.

The submitted affected IDs and management revisions must match a fresh server
review. In-flight save reservations, new dependencies, concurrent edits or another
removal reject the request. Refreshing a rejected review clears its confirmation.
Legacy delete routes remain retired with HTTP 409. Local populate/reload/upload
cannot recreate an S3-managed catalog; local mutation is also rejected if removal
history exists after a configuration change back to local mode.

## Deployment gate

Keep `PLUGIN_DELETION_ENABLED=false` (the default) during the application rollout.
Enable it only after **every backend that writes indicators, drafts, cards or
installation reviews runs the new reference guards in S3 mode**. The guards run
in S3 mode even while removal is disabled. An older writer can bypass them, so
rollback to an older image requires disabling removal and draining writers first.

`PLUGIN_RETENTION_DAYS` defaults to `30` and must be positive. Keep it consistent
across replicas and stable during recovery. A changed setting changes the recovery
deadline used by the server. This gate does not replace the preserved-JAR
migration, backup/restore or production availability requirements in the
[issue plan](./issue-1-plugin-management-plan.md).

## Save and removal coordination

Spring Mongo BeforeSave/AfterSave listeners reserve every referenced catalog ID
before a real source write. A chart reservation also protects its library. Pending
installation creation reserves its new READY artifact. Artifact uploads acquire
their own reservation before remote writes. Reservation predicates match the
observed removal marker or artifact state, closing save-versus-removal and
upload-versus-cleanup races without requiring MongoDB transactions.

Removal stores a `plugin-removal` journal with retained catalog snapshots. It
freezes every affected row, rechecks references, then conditionally changes the
journal from `PREPARING` to `COMMITTING` before marking rows `REMOVED`. A failure
before commit cancels the journal before releasing freezes and advances revisions
to invalidate stale requests. A cancelled freeze remains logically available if
its physical marker could not be cleared. An uncertain commit keeps rows frozen
until **Resume removal** completes the same journal. Retrying an old journal
cannot start a new removal.

An acknowledged source save releases its reservations. A failed or indeterminate
write, or a failed release, can leave durable `referencePins` that deliberately
block removal and cleanup. They **never expire automatically**: time alone does
not establish that a delayed write is finished. Diagnostics identify the source
collection and ID without returning its content to the browser.

To repair an orphaned reservation, the deployment maintainer must first drain all
writers, ensure no old process or database/object-store request can still commit,
and preserve a consistent backup. Compare the source document's
`_pluginReferenceWrite` marker, catalog state and pending operation with the pin.
After resolving that exact write, remove only its corresponding reservation and
rerun the authoritative review before resuming writers. Do not bulk-clear pins,
delete journals, or use an age-based pin cleanup script. Unknown outcomes remain
blocked until their owner establishes the outcome.

## Recovery

**Removed entries** lists recent removals and interrupted operations. Chart-type
pages also list removals of their containing libraries. The affected names make
the full recovery scope visible.

The default recovery window ends 30 days after removal enters its commit phase.
Restore verifies registered artifacts through the verified cache and reserves the
parent library for a chart-only recovery. The journal becomes `RESTORING` before
verification so an interrupted recovery can continue after its original deadline.
Partially restored rows stay unavailable until the whole journal is `RESTORED`.
All recovered entries start **disabled**; enabling is a separate decision.
Retried recovery preserves later enabled states. Classloaders and local cache
files are retained for active executions.

Catalog IDs, visualization DBRefs and version metadata remain intact. Removed
versions stay visible in history; monotonically assigned family ordinals preserve
version ordering after removal and restore. A new binary can inherit a removed
predecessor's display metadata while creating new catalog IDs. It does not
resurrect the predecessor's IDs or its purged artifact key.

Idle upload reviews can be **Discarded** in the Add dialog. Discarded reviews stop
blocking their predecessor's removal and can be restored within the retention
period. Restoring a review validates its source again and requires inspection and
mapping again. Running inspection or activation cannot be discarded. Uploading
the same bytes after catalog removal reopens the historical installation review;
it does not silently reinstall the removed entries.

## Explicit binary cleanup

**Removed entries → Review artifact retention cleanup** previews up to the oldest
100 unpurged candidates. It processes at most 20 eligible artifacts per confirmed
request, restricted to the artifact IDs included in the confirmed preview.
Artifacts that become eligible later require a new review. This is an explicit,
bounded maintenance action; no scheduled cleanup or
automatic deletion is installed. Large backlogs may need a separately reviewed
pagination/maintenance procedure if the first 100 candidates remain blocked.

Before deletion the server checks artifact age, reservations, every catalog entry
sharing the binary, chart children, completed removal journals, recovery windows,
pending/discarded reviews and authoritative saved-work dependencies again. It
conditionally changes `STAGED`/`READY` to `PURGING` before the remote request,
closing new installation reservations. Referenced, recently removed or recently
discarded artifacts remain protected. Completed recovery-marker cleanup is
idempotent and runs before this check.

The S3 adapter verifies checksum and size before deletion. An already missing
object counts as a successful retry; corrupt bytes or an unavailable store leave
`PURGING` plus a bounded error for retry. Success records `PURGED`. Mongo catalog
records and version history are retained. Local cache files are not deleted.

**Purged keys are never reused**, even if the same JAR is uploaded later. Garage
does not enforce conditional PUT, and S3 DELETE retries must never delete a newly
reused key. A fresh build with a different checksum receives a new identity.
Registry tombstones prevent reinstallation under a retired key.

## Usage overview

The Admin Dashboard combines the three admin catalog lists with `/v1/admin/usage`:

- Installed, enabled and disabled **catalog entry** totals for analytics methods,
  libraries and chart types. Each binary version has separate catalog IDs.
- Total saved indicator documents and distinct recorded creator IDs, including
  legacy records with missing plugin references. Missing creators are not guessed.
- Per-entry saved-indicator references and distinct creators, most-used-first
  sorting, search, category tabs, filters and pagination.
- Entries with zero saved references, disabled entries still used by saved work,
  unresolved references outside loaded catalogs, and enabled chart types whose
  parent library is disabled or unavailable.
- Details/version management and catalog links. Mutations refresh the overview.
  Failed requests display unavailable counts rather than zero or an unused label.

Usage tallies direct stored plugin DBRefs in `analytics-indicator`; it does not
count execution frequency, drafts, activity telemetry or historical trends. A
composite indicator's constituent saved indicators retain their own references;
the dashboard does not infer transitive execution counts. Summing counts across
plugin kinds would double-count indicators, so totals come from indicator
documents and distinct creator IDs instead.

## Verification

Backend tests cover role enforcement/audit, reference parsing, guarded legacy
mutation and usage totals. Disposable MongoDB/Garage integration tests exercise
saved/draft/card dependencies, save races, shared JARs, partial removal and restore,
retention, unknown-write pins, cleanup retries, discarded reviews and new versions
using purged ancestors' metadata. Frontend tests cover usage calculations and
sorting/filtering; isolated desktop/mobile browser checks cover confirmations,
stale review recovery, disabled restore, cleanup retries and unavailable usage.

No live database migration, backend deployment or production cleanup is performed
by these changes. Edge and production acceptance remain required before closing
issue #1.
