# Plugin details and replacement versions

Phase 5 of [issue #1](https://github.com/ude-soco/openlap-official/issues/1) adds
metadata editing, version history and replacement uploads to the existing admin
catalogs. The implementation remains on `feat/shoeb-plugin-management-s3`; it has
not been deployed. Follow the [migration guide](./plugin-artifact-migration.md)
before replacing any live backend pod.

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
   [shared upload workflow](./plugin-upload-workflow.md). Existing version bytes
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

Interrupted activation retains phase 4's hidden staging rows, deterministic IDs
and resumable claims. No old rows are changed during upload, inspection or
activation. Incomplete new rows stay unavailable until the complete installation
commits ACTIVE. Review records and objects are retained; cancellation and cleanup
are part of the later dependency/retention work.

## API additions

All paths are relative to `/api` and require SUPER_ADMIN. Responses retain the
`ApiSuccess.data` envelope and existing unified errors.

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

Audit actions include metadata updates, replacement mapping review and previous
version disabling, with resource IDs and predecessor/family context. Actor
resolution and safe failure logging use the existing admin audit service.

## Verification and rollout

Real MongoDB/Garage tests cover metadata parity, legacy ObjectId preservation,
stale edits and retirement, three generations of both plugin kinds, original
binary execution after disabling, explicit removed-entry mappings and later
reintroduction, and inherited versus new-entry statuses. Security tests exercise
the new admin routes. Browser smoke tests cover both domains on desktop and
mobile, conflict recovery, mapping, interrupted activation, previous-version
disabling and history navigation.

Guarded removal/recovery and the usage overview are now implemented; see the
[removal and retention guide](./plugin-removal-and-retention.md). Edge rollout still needs
preserved JARs from every live replica, explicit migration and replica/restart
acceptance. Production also requires the agreed backup/restore and availability
gates. An old image that only understands local JAR paths is insufficient rollback
for newly installed S3-only versions.
