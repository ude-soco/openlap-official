# Add analytics and visualization plugins

The current feature branch implements phase 4 of [issue #1](https://github.com/ude-soco/openlap-official/issues/1):
upload, explicit contract inspection, review and activation for both plugin kinds.
It has not been deployed. First complete the preserved-JAR inventory and migration
in the [artifact migration guide](./plugin-artifact-migration.md).

## Admin workflow

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
  management is implemented through [Upload new version](./plugin-version-management.md)
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
Staging/object cleanup and cancellation are deferred to the dependency and
retention work in phase 6; this workflow performs no hard deletion.

Success and failure outcomes for upload, inspection and activation use the
existing admin audit log. Plugin/driver exception text is not copied into audit
messages; known public validation/storage messages and bounded metadata are used.
Audit logging failure does not reverse a completed installation.

## API

All paths below are relative to `/api` and require SUPER_ADMIN authority.
Responses use `ApiSuccess.data`; errors use the existing unified error envelope.

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
errors retain the phase 3 error codes and do not trigger local fallback.

Legacy local create/upload/reload/populate routes remain blocked in S3 mode and
direct maintainers to the new Add workflow. Legacy deletion remains blocked until
the dependency-safe removal workflow is implemented.

## Verification and rollout

`./mvnw test` covers static versus executable inspection, authorization/auditing,
archive limits and existing backend regressions. The opt-in
`python3 scripts/test-plugin-artifacts.py` additionally exercises real MongoDB and
Garage, including both-kind activation/runtime loading, duplicate rejection,
partial failure visibility, concurrent activation claims and crash recovery.
Frontend build/lint checks and desktop/mobile browser smoke tests cover both
dialogs, explicit trust confirmation, failed activation recovery and catalog refresh.

No live backend has been replaced or migrated by this implementation. Before edge
rollout, preserve JARs from every running backend, migrate and verify their exact
bytes, inject the S3 configuration, then test old indicators and these new flows
on every replica and after restart. Production still requires the agreed backup,
restore and availability gates. Metadata/version editing, guarded deletion and
the usage overview remain phases 6–7. Metadata and replacement/version management
are implemented in the [version management guide](./plugin-version-management.md).
