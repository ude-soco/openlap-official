# Plugin administration

SUPER_ADMIN maintainers manage analytics methods, visualization libraries and
chart types through the Admin Dashboard. This guide covers adding trusted JARs,
editing details, replacement versions, reversible removal, recovery and explicit
artifact cleanup. Management endpoints audit successful and failed mutations;
metadata editing also works in local storage mode.

Uploads, replacement installation, removal and recovery require S3 mode. For an
installation moving from local JARs, first preserve every backend replica and
complete the [artifact migration procedure](plugin-artifact-migration.md).
Use the [production release runbook](plugin-production-rollout.md) for writer
pauses, frozen checkpoints, independent backup/restore and availability gates.
This guide describes application behavior; it does not establish that a particular
installation has completed those gates.

## Add plugins

SUPER_ADMIN users can open **Add methods** from Analytics Methods or **Add library**
from Visualization Libraries. Both use the same responsive dialog:

1. Choose a nonempty JAR up to 100 MiB. Filenames use letters, numbers, dots,
   underscores and dashes, ending in `.jar`; path separators and `..` are rejected.
   Filenames are display metadata, never storage object keys.
2. **Upload & validate** bounds and checks the archive, discovers concrete entry
   classes without initializing them, and stores verified bytes in S3. It does not
   add selectable entries or execute constructors.
3. Confirm that the JAR's source is trusted, then **Inspect contracts**. This
   explicitly executes constructors and metadata methods with backend privileges.
   It does not call analytics execution or chart rendering. This is not a sandbox;
   only trusted SUPER_ADMIN maintainers should install plugins.
4. Review the complete set of names, descriptions, classes, input/output/parameter
   counts, library metadata and chart configuration checks. The SHA-256 identifies
   the binary. Any invalid entry rejects the entire inspection.
5. **Activate plugin** publishes the complete installation. Its new entries start
   enabled. Existing entries, metadata, disabled states and saved indicator
   references are preserved. The catalog refreshes after successful activation.

The dialog shows upload/validation progress and actionable errors, keeps a file
selection after recoverable upload failure, and refreshes server state after a
mutation error. **Recent uploads** lists the latest 50 saved reviews for that kind;
selecting one loads its complete review so work can resume from another replica
or browser session. Closing a dialog does not delete its uploaded artifact.
While an operation is running, modal dismissal and guarded navigation are blocked,
and browser unload gets the standard warning. Narrow screens use a full-screen
dialog with persistent actions and scrolling review content.

Uploads are available only in `PLUGIN_STORAGE_MODE=s3`, after startup has verified
the existing migrated catalog. In local mode, the dialog explains the deployment
prerequisite. Storage credentials never reach the browser.

## Supported contracts

- Analytics JARs must contain at least one concrete, public `AnalyticsMethod`
  implementation with a public no-argument constructor. Inspection validates
  bounded metadata and initialized input, output and parameter contracts.
- Visualization JARs must contain exactly one public `VisualizationLibraryInfo`
  implementation and at least one concrete `VisualizationCodeGenerator`, each
  with a public no-argument constructor. Inspection discovers the library
  independently of class ordering, initializes chart input configuration, checks
  chart configuration and verifies a public, constructible `DataTransformer`.
- A review supports at most 64 entries, 512 characters per entry class name,
  128 KiB per serialized contract and 1 MiB of complete inspected metadata.
  Core OpenLAP template/dataset classes must be provided dependencies rather than
  bundled duplicates. Unresolvable or unsupported classes reject the archive.
- Uploading the same kind and bytes reopens the same persisted installation and
  cannot duplicate its entries. Different bytes with an already installed entry
  class, or an existing visualization library name, cannot replace that plugin
  through Add. Disabled entries still count as installed. Replacement/version
  management is implemented through [Upload new version](#upload-a-replacement)
  and preserves original indicator references.

## Publication and recovery

The primary Mongo database holds `plugin-installation` records with these states:

| State | Behavior |
| --- | --- |
| `UPLOADED` | Archive and object verified; constructors have not run |
| `INSPECTING` | An explicitly confirmed inspection owns a versioned claim |
| `INSPECTION_FAILED` | No entries activated; refresh, review the error and retry or choose a corrected JAR |
| `INSPECTED` | Complete bounded contracts persisted for review |
| `ACTIVATING` | Catalog installation is running or needs completion; staged entries remain hidden |
| `ACTIVE` | All catalog rows verified and published together |

Requests carry the current review version. Stale requests return HTTP 409 and
must reload the saved review. A timed-out request may already have completed;
refresh before deciding whether to retry. An inspection abandoned by a crashed
backend can be explicitly retried after 10 minutes, with renewed trust confirmation.
This can repeat constructors; only the current claim can save its result.

Activation uses deterministic catalog IDs and immutable insert-only writes.
New analytics, library and type rows carry `installationId`. Catalog reads,
runtime fetches and startup verification consult the parent installation state:
no staged entry becomes selectable or executable before its installation is
atomically changed to `ACTIVE`. Legacy migrated entries without `installationId`
retain their existing behavior. Once active, normal soft-disable remains available.

A `plugin-management-lock` record serializes catalog activations across replicas.
It has an installation owner and a separate claim for the running attempt. An
ordinary partial failure releases the attempt while retaining ownership for
**Complete activation**; a process crash permits an explicit retry after 10 minutes.
Other installations wait for the owner to finish. A completed installation's
leftover lock is safely reclaimed by the next activation. Never remove lock or
staged catalog records manually while a worker might still be writing them.

Mongo transactions are not required. A partial write can leave hidden rows or
unattached artifacts, but it does not publish a subset of entries. Retrying the
same installation completes its rows without creating duplicate catalog IDs.
Idle reviews can be discarded and restored, and expired artifacts can be cleaned
through the [recovery](#recovery) and [explicit cleanup](#explicit-binary-cleanup) workflows.
Installation itself performs no hard deletion.

Plugin/driver exception text is not copied into audit
messages; known public validation/storage messages and bounded metadata are used.
Audit logging failure does not reverse a completed operation.

## Edit details

Open **Details & versions** on an analytics method, visualization library or
chart type. Analytics methods and libraries allow name, description and creator
or attribution changes. Chart types allow name and description changes; their
creator comes from the parent library. Names are required and limited to 300
characters; creator text allows 300 and descriptions allow 10000.

The editor changes display metadata only. IDs, JARs, implementing classes, type,
input/output contracts, chart configuration and indicator references remain
unchanged. It works in local mode as well as S3 mode. Metadata and status changes
share a `managementVersion` revision. A stale edit returns HTTP 409, preserves
typed text and offers **Reload latest**, with confirmation before discarding
unsaved changes. Status changes use atomic field updates too, preserving unknown
legacy fields and version lineage instead of saving a stale complete entity.

## Upload a replacement

1. Open the latest installed version in **Details & versions**, then choose
   **Upload new version**. Analytics uploads replace an artifact's complete set
   of methods; visualization uploads replace one library and its chart types.
   Individual chart types are versioned through their parent library.
2. Upload and explicitly inspect a trusted JAR using the
   [Add plugins workflow](#add-plugins). Existing version bytes
   are immutable. The new JAR must have a different checksum.
3. Map every old entry to a class discovered in the new JAR, or explicitly choose
   **No replacement in this JAR**. A new class can replace only one old entry.
   Matching class names are suggested, but the mapping must be saved explicitly.
4. Review the resulting entries. Mapped entries inherit the reviewed old name,
   description, attribution and enabled/disabled state. New contracts and chart
   configuration come from the new JAR. Unmapped new entries start enabled.
   A visualization library also inherits its edited details and enabled state.
5. Activate the complete version. It gets new catalog IDs and immutable artifact
   references. Original IDs and indicator references are never rebound. Old
   methods and chart types remain executable, including intentionally disabled
   versions needed by saved indicators.
6. After successful activation, optionally confirm **Disable previous version**.
   For analytics this disables the previous artifact's enabled methods. For
   visualization it disables the previous library; individual old chart flags
   remain intact. This is a separate action so a failed replacement cannot
   retire the working version. Disable affects new selections, not execution of
   saved indicators.

Previous details and statuses are checked when saving the mapping and immediately
before starting activation. A concurrent edit requires a fresh mapping review.
Once activation has begun, its reviewed payload stays immutable across retries;
subsequent edits to old entries remain independent. Disabling previous entries
uses their current, explicitly reviewed revisions. A stale request is rejected;
if a race interrupts a multi-method disable, refresh and retry only the remaining
enabled entries. The newly installed version remains active.

## History and conflict handling

History groups artifact versions under a stable plugin family. Each version
shows its checksum, activation date when known, contained entries and statuses.
**View details** opens another version in the same dialog. Catalog rows also show
an artifact badge, so identically named versions remain distinguishable.
Library chart counts use library IDs rather than display names.

Each replacement stores its predecessor artifact, family, explicit mappings and
reviewed source metadata. New catalog entries carry `pluginFamilyId` and, when
mapped, `previousId`. Migrated legacy records need no new IDs or automatic rewrite;
their family is inferred from the original analytics artifact or library ID.

Only the latest family version can be replaced. Activation rechecks this under
the shared catalog activation lock, preventing two concurrently reviewed
replacements from creating competing successors. Entry class collisions are
allowed within the explicitly selected family, including older generations, and
blocked across unrelated families. An old entry omitted from one generation can
remain usable through its old ID and be reintroduced in a later generation.

Artifacts retain content-addressed identities. Replacement review IDs also encode
the source family and predecessor artifact; the same binary and context reopen
the same review. A newer source context can start a separate review without
rewriting an abandoned older one. A binary already installed in a family's
history cannot be installed again as another generation. Use its existing
version and status controls instead.

Interrupted activation retains hidden staging rows, deterministic IDs and
resumable claims. No old rows are changed during upload, inspection or
activation. Incomplete new rows stay unavailable until the complete installation
commits `ACTIVE`. Review records and objects are retained; idle reviews can be
[discarded or restored](#recovery), and binary cleanup requires its separate
[retention review](#explicit-binary-cleanup).

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

Keep `PLUGIN_REMOVAL_ENABLED=false` during the application rollout.
Enable it only after **every backend that writes indicators, drafts, cards or
installation reviews runs the new reference guards in S3 mode**. The guards run
in S3 mode even while removal is disabled. An older writer can bypass them, so
rollback to an older image requires disabling removal and draining writers first.

`PLUGIN_REMOVAL_ENABLED=true` permits reversible catalog removal, resume and
restore. It does not permit remote object deletion. Keep the separate
`PLUGIN_DELETION_ENABLED=false` unless the provider's durable physical deletion
has been qualified and cleanup is separately approved. Cleanup requires both
gates, S3 storage and the existing reference/retention review. The API reports
logical recovery and physical cleanup availability separately, and the admin
controls show the distinction.

`GET /v1/admin/plugins/removed` reports logical recovery as `available` and
physical cleanup as `cleanupAvailable`. The cleanup review's own `available`
field also reflects the physical gate; candidate eligibility alone never permits
deletion.

Both gates are false by default. For compatibility, when `PLUGIN_REMOVAL_ENABLED`
is absent it inherits the effective `PLUGIN_DELETION_ENABLED` setting; existing
deployments that enabled the old combined gate keep their behavior. Explicitly
set both flags on every replica to select independent behavior. For example,
`PLUGIN_REMOVAL_ENABLED=true` with `PLUGIN_DELETION_ENABLED=false` enables logical
recovery while retaining every stored artifact. Do not enable either gate until
its rollout and recovery requirements are met.

`PLUGIN_RETENTION_DAYS` defaults to `30` and must be positive. Keep it consistent
across replicas and stable during recovery. A changed setting changes the recovery
deadline used by the server. This gate does not replace the preserved-JAR
migration, backup/restore or production availability requirements in the
[production release runbook](plugin-production-rollout.md).

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

## API

All paths below are relative to `/api` and require SUPER_ADMIN authority.
Responses use `ApiSuccess.data`; errors use the existing unified error envelope.

### Upload and activation

| Method and path | Body / behavior |
| --- | --- |
| `GET /v1/admin/plugins?kind=ANALYTICS` | Availability and latest 50 upload summaries; use `VISUALIZATION` for libraries |
| `GET /v1/admin/plugins/{id}` | Full persisted review and current catalog conflicts |
| `POST /v1/admin/plugins/upload?kind=ANALYTICS` | Multipart `file`; static validation and durable upload only |
| `POST /v1/admin/plugins/{id}/inspect` | `{ "version": 0, "trusted": true }`; explicit contract execution |
| `POST /v1/admin/plugins/{id}/activate` | `{ "version": 2 }`; idempotent complete installation |

Malformed contracts return HTTP 400 / `INVALID_PLUGIN_CONTRACT`; oversized
multipart requests return HTTP 413 / `UPLOAD_TOO_LARGE`. Stale or conflicting
reviews use HTTP 409 / `PLUGIN_REVIEW_CONFLICT`. An attempt to fetch a staged
catalog item returns HTTP 409 / `PLUGIN_INSTALLATION_INCOMPLETE`. Storage/cache
errors use the artifact-storage error codes and do not trigger local fallback.

Legacy local create/upload/reload/populate routes remain blocked in S3 mode and
direct maintainers to Add plugins. Legacy deletion remains retired; use the
guarded removal review in Details & versions.

### Metadata and replacement versions

| Method and path | Behavior |
| --- | --- |
| `GET /v1/admin/plugins/catalog/{kind}/{id}` | Safe metadata, editable fields and current revision |
| `PATCH /v1/admin/plugins/catalog/{kind}/{id}` | `{ "version": 0, "name": "...", "description": "...", "creator": "..." }`; only fields editable for this kind are accepted |
| `GET /v1/admin/plugins/catalog/{kind}/{id}/history` | Grouped version history and whether the selected artifact is latest |
| `GET /v1/admin/plugins/catalog/{kind}/{id}/replacement-target` | Complete current source entries and revisions |
| `POST /v1/admin/plugins/upload?kind=ANALYTICS&replacementKind=ANALYTICS_METHOD&replacementId={id}` | Multipart upload in an explicit replacement context |
| `POST /v1/admin/plugins/{reviewId}/replacement` | `{ "version": 2, "mappings": { "oldId": "new.Class" }, "expectedVersions": { "oldId": 0 } }`; use JSON null for an explicitly unmapped old entry |
| `POST /v1/admin/plugins/{reviewId}/retire-previous` | `{ "version": 5, "expectedVersions": { "enabledOldId": 0 } }`; only after activation |

Catalog kinds are `ANALYTICS_METHOD`, `VISUALIZATION_LIBRARY` and
`VISUALIZATION_TYPE`. Replacement sources use the first two. Visualization
mapping requests include both library and chart revisions in `expectedVersions`;
retirement requests include the previous library revision. Analytics requests
cover every old method. HTTP 409 codes distinguish `PLUGIN_DETAILS_CONFLICT`,
`PLUGIN_REPLACEMENT_CONFLICT` and the existing review conflicts.

Audit records include resource IDs and predecessor/family context for metadata
updates, replacement mapping review and previous-version disabling.

### Removal, recovery and retention

| Method and path | Body / behavior |
| --- | --- |
| `GET /v1/admin/plugins/catalog/{kind}/{id}/removal` | Fresh removal scope, revisions, dependencies and availability |
| `DELETE /v1/admin/plugins/catalog/{kind}/{id}` | `{ "expectedVersions": { "affectedId": 0 } }`; confirm the complete reviewed scope |
| `GET /v1/admin/plugins/removed?kind=ANALYTICS_METHOD` | Removed entries, logical recovery availability and separate physical cleanup availability; accepts all catalog kinds |
| `POST /v1/admin/plugins/removals/{id}/resume` | Resume the existing interrupted removal journal |
| `POST /v1/admin/plugins/removals/{id}/restore` | Restore the complete journal's entries disabled, or resume recovery |
| `POST /v1/admin/plugins/{id}/discard` | `{ "version": 2 }`; discard an idle upload review |
| `POST /v1/admin/plugins/{id}/reopen` | `{ "version": 3 }`; reopen a retained discarded review |
| `GET /v1/admin/plugins/cleanup` | Preview bounded artifact-retention candidates and physical cleanup availability |
| `POST /v1/admin/plugins/cleanup` | `{ "confirmed": true, "artifactIds": ["analytics-..."] }`; clean only confirmed eligible artifacts |

`{id}` in removal resume/restore paths is a removal-journal ID; review and catalog
paths use their corresponding IDs. Never substitute the display name. The usage
overview uses `GET /v1/admin/usage` alongside the catalog lists.


## Verification and rollout

Run the backend checks from `analyticsframework/`:

```sh
./mvnw test
python3 scripts/test-plugin-artifacts.py
```

The first command covers inspection, authorization/auditing, archive limits,
reference parsing, guarded legacy mutations and usage totals. The second is an
opt-in disposable MongoDB/Garage integration suite. It exercises both plugin kinds,
runtime loading, metadata parity, legacy ObjectId preservation, version history,
explicit mappings, disabling, interrupted activation, concurrent claims, saved
and draft dependencies, shared JARs, save/removal races, restore, retention,
unknown-write pins, cleanup retries and purged predecessor metadata.

Frontend build/lint checks and plugin tests cover usage calculations,
sorting/filtering and failure handling. Desktop/mobile smoke checks should cover
upload trust confirmation, complete activation, metadata conflicts, version
mapping and history, removal review, disabled restore, cleanup retries and
unavailable counts.

Before replacing a backend that uses local JARs, preserve artifacts from every
replica, migrate and verify their exact bytes, inject the S3 configuration, then
test saved indicators and management workflows on every replica and after restart.
Follow the [production release runbook](plugin-production-rollout.md) for the
frozen checkpoint, independent backup/restore and availability requirements.
Enable removal or physical deletion only after the respective
[deployment gate](#deployment-gate) passes. An old image that understands only
local JAR paths cannot provide rollback for newly installed S3-only versions.
