# Plugin release database checkpoint

This page describes the frozen schema v1 path. The explicit
[online full-instance oplog mode](plugin-online-backup.md) has separate capture,
rehearsal and index actions and requires a reviewed single-member replica set.
Selecting it does not weaken the frozen prerequisites below.

The opt-in `.k8s/maintenance/plugin-checkpoint` component preserves one explicit
primary database and rehearses restoration inside its own temporary storage.
It uses the official MongoDB 4.4.30 runtime and Database Tools 100.10.0, starts no
application server and needs no Kubernetes API access or Pod exec. The default
action fails before accessing a database. Select an immutable image published
through the `plugin-checkpoint-*` workflow, which tests the exact image against
disposable fixtures before publishing it without rebuilding.

## Checkpoint capture prerequisites

1. Enforce and verify an actual writer pause. Scaling all old backend writers to
   zero through deployment configuration is one option; inspect live replicas
   and account for other writers and controllers. This stops the backend API.
   Keep old writers stopped through migration, then resume only compatible S3
   backends under the reviewed rollout plan. Restrict other plugin changes until
   acceptance ends. An evidence string does not enforce a freeze.
2. Retain the reviewed source bundle, private migration manifest, original
   inventory and application image pins with the checkpoint record. Determine
   the required S3 objects independently; this runner backs up MongoDB only.
3. Supply an existing protected claim with private writable access for UID/GID 1000
   and adequate actual space. The runner creates a fresh directory exclusively;
   it never repairs retained-volume ownership or permissions. Keep GitOps
   prune/delete protection in the environment overlay.
4. Configure one source URI/database and exact expected DNS host/port. Access
   needs reads, collection/index listing, `dbHash` and read-only FCV `getParameter`.
   An application read role can lack FCV access. Inject any credentials securely,
   outside source, logs and command arguments. Review DNS/Mongo-only egress and
   no ingress; on an unauthenticated server the network capability can permit
   writes even though the reviewed tool only reads the source.

## Explicit inputs and limits

| Input | Required value or default |
| --- | --- |
| Action | `--checkpoint` |
| `MONGODB_PRIMARY_URI` | One explicit `mongodb://HOST:PORT/DATABASE` source; supported TLS/auth options and securely injected credentials are optional |
| `OPENLAP_MONGODB_DB` | Explicit non-system database matching the URI |
| `CHECKPOINT_SOURCE_HOST` / `CHECKPOINT_SOURCE_PORT` | Exact source DNS host/port; no loopback, SRV or discovery |
| `CHECKPOINT_ID` | Fresh directory identifier; existing outputs are never reused |
| `CHECKPOINT_FREEZE_EVIDENCE` | Nonsecret reference to separately verified freeze evidence |
| `CHECKPOINT_OUTPUT_ROOT` | Existing `/outputs` mount by default |
| `CHECKPOINT_MAX_ARCHIVE_MIB` | `256`; compressed archive limit |
| `CHECKPOINT_MAX_EXPANDED_MIB` | `1024`; decompressed archive limit |
| `CHECKPOINT_MAX_RESTORE_MIB` | `1024`; local database disk limit |

Budgets accept 1–1024 MiB. The Job bounds scratch with `emptyDir` and container
ephemeral-storage, CPU and memory limits. The tool also checks actual free space;
a PVC request does not establish physical capacity. There is a 540-second image
deadline and 600-second Job deadline, no retries/TTL, no API token, no `fsGroup`,
UID/GID 1000, a read-only root and dropped capabilities. Database Tools receive
the URI through a mode 0600 temporary config, not argv.

## Verification and retained output

The tool compares source collection identities, counts, ordered BSON ID/content
hashes, indexes and options before and after the dump. `dbHash` briefly holds a
database read lock; the external writer pause remains mandatory. Unsupported
views, capped/system namespaces, missing `_id` indexes, unfinished index builds
and metadata outside the bounded format fail explicitly.

It validates the original full bounded gzip stream and SHA-256, then restores
that same archive into a new local database path at fixed loopback port 37017.
It attests the target's actual dbPath/bind/port/socket settings and child liveness
before restoring, compares every supported namespace and count/ID/content/index/
option hash, and stops the local server before publishing success.

Success produces only `CHECKPOINT_ID/database.archive.gz` and `checkpoint.json`,
both mode 0600 inside a mode 0700 directory. The bounded report prints collection
names, counts and hashes between `OPENLAP-CHECKPOINT-REPORT-V1` markers; review
that operational metadata's audience and retention. URI values, raw records and
client errors stay private. MongoDB MD5 values compare consistency; SHA-256
identifies the original compressed archive.

Failure retains partial output without a success report. Keep writers paused
until choosing a retry with a fresh identifier or aborting before migration and
restoring the previous backend replica count. Remove the temporary Job/policy
after any terminal result; retain the protected claim, archive and report.

This establishes a DB-only roundtrip in the tested runtime. Off-node retention,
replacement infrastructure, required S3 objects, image compatibility, application
acceptance and production availability remain separate release gates. An on-node
PVC alone does not satisfy the production backup gate.

## Rehearse a retrieved archive without a source connection

Use `--rehearse-archive` to verify a retrieved copy of an existing checkpoint.
This separate action accepts no source connection or restore-target URI. It
requires the original `checkpoint.json` and `database.archive.gz`, plus the
original report's SHA-256 from an independently trusted checkpoint record.
It does not require a new writer pause or access to the original database.
Record that hash when retaining the original successful checkpoint; calculating
a new expected hash from an untrusted retrieved report does not authenticate it.
The existing `--checkpoint` action and output format remain unchanged.

The operator retrieves the two files through the approved storage provider into
an existing input claim. Stage only these reviewed files using a trusted host or
a reviewed immutable input image; no Pod exec or live-code copying is needed.
Mount this claim read-only at `/inputs`. The runner verifies the actual Linux
mount is read-only and rejects symlink components and indirect paths. Use a
different protected output claim, writable by UID/GID 1000. Neither claim is
created, deleted, or given new ownership by this operation.

| Rehearsal input | Required value or default |
| --- | --- |
| Action | `--rehearse-archive` |
| `CHECKPOINT_ID` | Fresh result directory identifier |
| `CHECKPOINT_EXPECTED_REPORT_SHA256` | Independently trusted original report SHA-256, 64 lowercase hexadecimal characters |
| `CHECKPOINT_REPORT_PATH` | Explicit regular `.json` file below read-only `/inputs` |
| `CHECKPOINT_ARCHIVE_PATH` | Explicit regular `.gz` file below read-only `/inputs` |
| `CHECKPOINT_OUTPUT_ROOT` | Separate existing `/outputs` mount by default |
| `CHECKPOINT_MAX_ARCHIVE_MIB` / `CHECKPOINT_MAX_EXPANDED_MIB` / `CHECKPOINT_MAX_RESTORE_MIB` | Same 256 / 1024 / 1024 defaults and 1–1024 MiB bounds as capture |

Supply no database URI/name, S3 credentials, Kubernetes identity, or `envFrom`
imports. The runner rejects the source connection and common S3/API credential
environment variables. Run with external networking disabled: Docker
`--network=none`, or the opt-in
`.k8s/maintenance/plugin-checkpoint-rehearsal` Job and deny-all NetworkPolicy
under a network-policy-enforcing CNI. Loopback remains available for the local
restore. This optional component is not referenced by the application base.
Its default action, image and input placeholders fail closed. Patch only the
reviewed immutable image, explicit rehearsal action/inputs, fresh identifier and
existing claim names. Review that no other additive NetworkPolicy selects the
Job and permits egress. Establish the deny-all policy before creating the Job;
review ordering and CNI enforcement in the environment-specific operation.
Create a fresh Job for each approved attempt and remove
the Job/policy after its terminal result, retaining both claims.

Before parsing, the runner snapshots the report privately, bounds it to 256 KiB,
and verifies the trusted SHA-256. It accepts only the bounded version-1
successful capture schema produced by this MongoDB 4.4.30 / Tools 100.10.0
runner. It verifies every required field, flag and namespace, rejects unknown
fields, and checks the archive's exact compressed size and SHA-256. It consumes
only private snapshots, so changes to the mounted files cannot change the bytes
being restored. The full bounded gzip stream must match the original expanded
size. Scratch must accommodate both the compressed copy and restored database;
review actual capacity and adjust the Job's `emptyDir` and ephemeral-storage
budgets when increasing limits.

The fixed loopback server uses a fresh private database path with TTL processing
disabled. The runner attests its actual dbPath/bind/port/socket and liveness,
performs the full restore, and compares the exact database/FCV, supported
namespace set, counts, ordered BSON ID/content hashes, index definitions and
collection options against the original report. Source collection UUIDs are
provenance only: a restore creates new UUIDs. A matching source patch version is
not required; the isolated restore runtime remains exactly 4.4.30.

Success publishes only `CHECKPOINT_ID/rehearsal.json`, mode 0600 in a mode 0700
directory, after stopping the isolated server. It binds the trusted original
report hash, archive hash/sizes and original checkpoint ID with status
`RETRIEVED_ARCHIVE_RESTORE_VERIFIED`. The report prints names, counts and hashes
between `OPENLAP-CHECKPOINT-REHEARSAL-REPORT-V1` and
`OPENLAP-CHECKPOINT-REHEARSAL-REPORT-END-V1`; review the log audience and
retention. Failure leaves no success result, preserves any partial result for
review, and never overwrites or modifies the input files or a previous result.

Retain this separate result with the original report, immutable runner image
and the operator's provider retrieval evidence. It proves those retrieved bytes
roundtrip in the tested runtime. It does not prove where the copy was held,
ongoing off-node custody/retention, a current source freeze, required S3 object
recovery, replacement infrastructure, application acceptance or availability.
Those remain separate release gates; this action never restores a live database.

## Project a trusted checkpoint's plugin artifact index

The explicit `--index-plugin-artifacts` action uses the same inputs and isolated
restore as `--rehearse-archive`, then produces a private `artifact-index.json`
sidecar. Default capture/rehearsal actions and their report schemas are unchanged.
No source database connection, S3 client, credential, API identity or external
network access is accepted by this action. Select the reviewed checkpoint image
and change only the optional rehearsal Job's action to `--index-plugin-artifacts`.
Keep the same independently trusted original report SHA and read-only input files.

The projection starts only after the strict original report/archive checks and
the complete isolated restore/fingerprint comparison pass. It reads the restored
database, never an unbound live catalog. A second full database snapshot must
match the pre-projection snapshot before publication, including all collection
content, ordered IDs, indexes and options. The operation never changes database
records, attaches artifact references, imports factory entries or repairs state.

Success retains the existing `rehearsal.json` plus `artifact-index.json`, both
mode 0600. The fresh result directory has private 0700 permissions, with optional
inherited SGID (02700) below an fsGroup-prepared claim. No retained permissions or
ownership are changed. The sidecar is published last; failure or late report
output failure removes this run's completed reports and leaves no completed index
to accept. Existing results and input bytes are never overwritten.

The sidecar is deterministic UTF-8 JSON plus a newline:

| Field | Contract |
| --- | --- |
| `schemaVersion` / `projectionPolicy` | `1` / `OPENLAP_PLUGIN_ARTIFACT_INDEX_V1` |
| `status` | `CHECKPOINT_PLUGIN_ARTIFACT_INDEX_VERIFIED` |
| `binding` | Original checkpoint report SHA-256, archive SHA-256, checkpoint/database/runtime identity and original source identity fingerprint |
| `collections` | Fixed code-owned collection list, with absent-versus-present/empty evidence and original verified fingerprints |
| `artifacts` | Sorted immutable identities, kinds, SHA-256, declared sizes, object keys, lifecycle states and later object-presence requirements |
| `associations` | Sorted code-owned catalog/installation/removal/version and known executable-reference relationships, with typed/resolved/required flags |
| `legacyCatalogEntries` / `associationIssues` | Concrete unmigrated records or inconsistent/dangling typed relationships; no repairs are performed |
| `summary` | Bounded counts only |
| `associationsResolved` / `readyForS3Export` | False for unresolved/inconsistent associations; export readiness also requires no unmigrated legacy catalog entries |
| `emptyRegisteredPluginSnapshot` | No registry/catalog/installation/removal/version rows and no known associations under this versioned policy |
| `objectBytesVerified` / `s3RestoreVerified` | Always false; no object storage was accessed |

Binding fields include `originalCheckpointReportSha256`, `archiveSha256`,
`checkpointId`, `database`, `sourceIdentityMd5`, `sourceServerVersion`,
`restoreServerVersion`, `fcv` and `databaseToolsVersion`. No verification timestamp,
new restore UUID, rehearsal identifier, random value or machine-specific path is
included in index bytes. Repeating the verified restore of the same checkpoint
must reproduce the exact index SHA-256. A later object-recovery operation must
compare an independently regenerated index with the frozen original; an adjacent
self-declared hash is not independent authority.

All registry versions are retained in the projection, including disabled, older,
removed and discarded-upload versions. `READY` means `REQUIRED` object bytes;
`STAGED` means `OPTIONAL_STAGED` because metadata is inserted before object PUT;
`PURGED` means `MUST_BE_ABSENT`, preserving the retirement tombstone. `PURGING`
fails as an unfinished destructive operation. The index does not decide presence
or discard old `READY` objects using current time or retention settings.
Unfinished activation/inspection/removal states, management locks and current
reference reservations also fail without a completed index. Historical
`_pluginReferenceWrite` markers alone are not current reservations.

Coverage follows the application's code-owned collections and conservative
known-catalog-ID reference policy. It includes raw BSON DBRefs and supported
serialized snapshot JSON from indicators, drafts, cards and installations;
matching chart references include their parent library. Direct typed dangling
references are retained explicitly. Unrelated freeform text or unknown ObjectId
strings are not classified as plugin references. This does not prove universal
absence of every possible ID, validate future snapshot schemas, or verify object
bytes. Malformed/duplicate required snapshot JSON, unsupported record shapes and
cross-database plugin DBRefs fail the optional projection rather than guessing.
The full database remains preserved by the original checkpoint regardless of
whether this optional projection succeeds.

Zero visible catalog counts alone do not establish the empty flag. The restored
registry and retained management/catalog state must also be empty, with no known
associations or dangling typed references. Even then, a separate S3 inventory
must establish whether the object namespace is empty. An empty registered state
does not import plugins or claim that an object-store backup exists.

The bounds are 1,000 artifacts, the existing 100 MiB per-artifact declared-size
limit, 10,000 rows per selected collection/20,000 total, 32 MiB selected BSON,
10,000 associations, depth 48, one million visited nodes and a 1 MiB index. Limits
fail without truncation. The sidecar contains typed metadata only; log output is
limited to a separate 4 KiB counts/hash summary framed by
`OPENLAP-CHECKPOINT-PLUGIN-INDEX-REPORT-V1` and
`OPENLAP-CHECKPOINT-PLUGIN-INDEX-REPORT-END-V1`. The summary binds the original
report/archive, sidecar SHA/size and retained rehearsal report SHA. Accept it only
with terminal success for the reviewed operation and complete validated framing.
Retain the protected sidecar; do not copy full sidecar or database content into
logs as a retrieval mechanism.

The same disposable checkpoint fixture command tests this mode:

```sh
python3 -B tests/test_plugin_checkpoint_containers.py
```

It uses synthetic BSON/snapshot records, actual dumps and isolated restores,
retained-version and empty cases, deterministic repeated-index comparisons,
SGID output roots and publication-failure cases. It proves no S3 export, encrypted
transfer or combined application recovery; those remain separate operations.
