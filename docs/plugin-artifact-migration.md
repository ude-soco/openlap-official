# Plugin artifacts: migration and operation

This guide covers explicit artifact migration and S3 execution for existing
plugin catalogs. For uploads, version management, guarded removal/recovery and
usage reporting, see [plugin administration](./plugin-administration.md).
The application defaults to **local** mode; deployment never imports JARs automatically.
For production preparation, follow the [production release runbook](./plugin-production-rollout.md),
including its separate off-node retrieval/restore and availability gates.

## Storage model

MongoDB's primary OpenLAP database holds the `plugin-artifact` collection.
Artifacts use `analytics-<sha256>` or `visualizations-<sha256>` identities and keys
`plugins/<kind>/<sha256>.jar`. Records contain the SHA-256, size, kind, key,
creation time/actor and `STAGED` or `READY` state. A catalog entry references one
artifact through the additive `artifactId` field. Several catalog entries can
share an artifact. Visualization types continue referencing their library.

The registry snapshots a source JAR, verifies its size, checksum and archive,
stores it, then verifies the stored bytes before marking it `READY`. A failed
operation can leave an unattached `STAGED` or `READY` record for retry. It never
deletes catalog records or artifact objects.

Garage v2.5.0 does **not** enforce `If-None-Match: *` on PUT in our protocol test.
The adapter therefore verifies existing bytes and reuses them without PUT; an
existing corrupt object causes an error. For a missing object, only a verified
snapshot matching the content-addressed key can be written. Concurrent imports
of that identity write the same bytes. Readback verification is required before
activation. This provides application-level integrity, not bucket object locking;
keep bucket write credentials restricted to trusted maintainers and backends.

## Runtime configuration

| Environment variable | Default / purpose |
| --- | --- |
| `PLUGIN_STORAGE_MODE` | `local`; explicitly set `s3` after migration |
| `PLUGIN_STORAGE_S3_ENDPOINT` | Required explicit HTTP(S) endpoint in S3 mode; no URL credentials, path, query or fragment |
| `PLUGIN_STORAGE_S3_REGION` | `garage` |
| `PLUGIN_STORAGE_S3_BUCKET` | Required private bucket name |
| `PLUGIN_STORAGE_S3_ACCESS_KEY` | Required; inject securely, never commit |
| `PLUGIN_STORAGE_S3_SECRET_KEY` | Required; inject securely, never commit |
| `PLUGIN_CACHE_DIR` | `${DATA_DIR:-.}/plugin-cache`; exclusive writable directory per backend process |
| `PLUGIN_CACHE_MAX_BYTES` | `1073741824` (1 GiB) |
| `PLUGIN_CACHE_MAX_ENTRIES` | `256` |

The SDK uses explicit static credentials, region and endpoint, path-style S3
access and bounded timeouts. It never discovers AWS credentials from a profile,
instance metadata or Kubernetes credentials. Application startup in local mode
does not create an S3 client or plugin cache.

Each replica downloads to a private temporary cache file, verifies SHA-256, size
and archive structure, then atomically publishes the completed JAR. Concurrent
requests share a download. Each cache directory has an exclusive process lock;
do not mount one cache directory into multiple running backends.

Valid JARs remain available while their classloaders can execute or load lazy
dependencies. The cache rejects new admissions at its byte/entry limits instead
of evicting potentially active code. Increase limits or clear a cache only while
its backend is stopped. A restarted cache removes abandoned download parts and
verifies retained JARs before reuse. It is disposable; S3 remains authoritative.

S3 startup verifies and caches **every installed catalog entry**, including
disabled entries needed by existing indicators, and checks its expected class
entries. Missing references, corrupt/missing objects or insufficient cache space
prevent startup. A complete verified cache can operate through an S3 outage while
the MongoDB registry remains available. A cold cache fails explicitly; it never
falls back to a local JAR with a different identity.

In S3 mode, database initialization skips local plugin discovery, and legacy
create/upload/reload/populate operations return HTTP 409
`PLUGIN_MANAGEMENT_MIGRATION`. Enable/disable and existing indicator execution
remain available. The five legacy delete operations continue returning
`PLUGIN_DELETE_UNAVAILABLE`. Use **Add methods** or **Add library** in the admin
catalogs for the new staged workflow; legacy local mutations stay blocked in S3 mode.

## Preserve and review before rollout

1. Pause plugin catalog writes. Back up the primary database and preserve the
   current image's bundled JARs and uploaded JARs from **every running backend
   replica before replacing any application pod**. Retain the original paths,
   replica identity and checksums with these copies.
2. Keep the existing application in local mode during preparation. Run the
   migration utility from this checkout or a separate migration image with access
   to preserved JAR directories and the primary OpenLAP database. It starts no
   HTTP server, seeds no accounts and does not connect to Learning Locker.
3. Inventory, explicitly resolve every missing/conflicting mapping and run the
   read-only preflight. Do not select between different same-filename binaries
   without checking which versions existing catalog entries actually require.
4. Apply the reviewed manifest, repeat verification, and retain the manifest and
   source copies. Only then roll out backends with S3 configuration and independent
   caches. Verify execution and visualization of existing indicators on each
   replica and after a backend restart.

The commands below run inside `analyticsframework`, using Java 17 or newer
(Java 25 LTS is qualified; see the [local installation guide](../README.md#local-installation)).
The migration CLI requires explicit, nonblank `MONGODB_PRIMARY_URI` and
`OPENLAP_MONGODB_DB`; it refuses to select a development database by default.
Supply service credentials through the operator's secure environment, without
placing them in command arguments. Inventory and check need only primary MongoDB
access; do not provide S3 credentials to those operations.

Create a new inventory file (existing files are never overwritten):

```bash
./mvnw -q -DskipTests compile exec:java \
  -Dexec.mainClass=com.openlap.plugins.migration.PluginArtifactMigrationApplication \
  '-Dexec.args=--inventory /preserved/plugins.json --source-root /preserved/replica-a --source-root /preserved/replica-b --source-root /preserved/image'
```

For an operational console without file access, explicitly use `--inventory-report`
instead of `--inventory` to also print the same manifest between
`PLUGIN_INVENTORY_BEGIN` / `PLUGIN_INVENTORY_END` markers. This includes plugin
catalog IDs and recorded paths, never environment settings or database contents
from other collections. Authorize the log audience/retention for that metadata.
The report is capped at 64 KiB. An oversized report action fails before creating
a file; rerun with `--inventory` to write the full inventory privately. There is
no automatic fallback. A successful report still creates a new protected output
file and performs no MongoDB/S3 writes.

The JSON contains `files` with discovered JAR identities and `entries` mapping
the complete analytics/library catalog. Preserve each entry's `kind`, `catalogId`
and `recordedPath`. For copied files whose original location is unavailable,
explicitly set `sourcePath`, `sha256` and `sizeBytes` from the verified source
list. Clear `problem` after reviewing it. Every source must remain within one of
the explicit roots. Conflicting same-filename copies are never chosen automatically.

Run preflight without S3 access or database writes:

```bash
./mvnw -q -DskipTests compile exec:java \
  -Dexec.mainClass=com.openlap.plugins.migration.PluginArtifactMigrationApplication \
  '-Dexec.args=--check /preserved/plugins.json --source-root /preserved/replica-a --source-root /preserved/replica-b --source-root /preserved/image'
```

Apply with the explicit S3 endpoint, bucket, region and credentials injected:

```bash
PLUGIN_STORAGE_MODE=s3 ./mvnw -q -DskipTests compile exec:java \
  -Dexec.mainClass=com.openlap.plugins.migration.PluginArtifactMigrationApplication \
  '-Dexec.args=--apply /preserved/plugins.json --source-root /preserved/replica-a --source-root /preserved/replica-b --source-root /preserved/image'
```

Apply repeats preflight, stores and verifies every required object, and only then
attaches artifact references. It preserves raw Mongo IDs, existing fields,
metadata, enabled states, visualization DBRefs and indicator references. Attachment
uses conditional updates, and final verification detects catalog changes.
An interrupted attachment may leave some references attached; rerun the same
reviewed manifest after resolving the interruption. No automatic mode switch occurs.
Keep plugin writes paused; conflict checks are not a maintenance lock.

Local mode tolerates additive references during transition but checks the exact
recorded local bytes against the referenced digest. A differing replica copy must
be resolved before running this code in local mode. S3 mode requires complete
artifact coverage and performs no local catalog rescan.

## Recover reviewed historical source artifacts

When local runtime binaries are missing, recover known versions from immutable
public history rather than selecting an ignored workstation file by name:

```sh
python3 -B analyticsframework/scripts/prepare-plugin-recovery.py \
  --output /protected/NEW-recovery-bundle
```

Run this command from the repository root. The parent directory must already
exist and contain no symlink ancestors. The helper reads existing local Git
objects only; it never fetches, uploads, restores or executes plugin code. A
shallow checkout without the reviewed historical objects fails explicitly; obtain
the fixed public commit through the operator's normal source process first.

The shipped [recovery policy](./plugin-recovery-artifacts.json) pins commit
`4768ec732c667940e00dfc5a87e0300ed0a7ef75`, paths, Git blob IDs, SHA-256 and sizes
for the historical analytics prototype and nine-chart C3 archives. The helper
checks those identities and bounded ZIP structure, writes two private JARs under
`jars/analytics` and `jars/visualizations`, and publishes `provenance.json` only
after both succeed. Existing outputs are never reused; failures retain partial
files without a successful provenance record. Review the policy before use; a
source policy update is a code change, not a command-line override.

This is source provenance, not automatic catalog mapping or runtime acceptance.
The historical binaries passed local constructor/metadata checks for 13 analytics
classes and nine chart classes against the backend's pinned API dependencies;
that does not establish algorithm execution, rendering, compatibility with a
particular deployed image, or coverage of an installation's database. In particular,
the historical C3 renderers require `com.openlap.template.model.Customization`,
which the pinned visualization template 1.1.0 no longer provides. This backend
includes an original, narrowly scoped String-value compatibility bridge at that
binary name. It preserves the constructor/accessors called by the pinned charts;
chart code still supplies defaults, color formatting and title placement. The
unrecovered original model's other behavior is not claimed. Template dependency
upgrades must check for a competing class with that binary name.

The unchanged historical C3 archive, this bridge and an archive-specific string
adapter pass 28 real generator cases with 462 output assertions across all nine
charts, defaults/customization, grouped/scatter data, Bar sorting/filtering and
text containing quotes, backslashes, line separators and HTML script delimiters.
The adapter escapes private copies of text/customization values before those
legacy generators insert them into JavaScript; original data and visible labels
are preserved. It applies only to the known archive checksum and chart classes;
other providers retain their existing escaping contracts. The original 19-case
baseline without the compatibility bridge fails with the missing-class error.
Repeat the isolated check against a locally built migration image (which packages
the same backend classes/APIs):

```sh
python3 -B analyticsframework/scripts/verify-legacy-c3.py \
  --image REVIEWED_LOCAL_IMAGE_ID
```

Application CI also runs these fixtures against the actual packaged backend JAR
using `--runtime-layout spring-boot`. It extracts the built JAR only inside a
network-isolated, unprivileged container and never starts the application server.
The application publishes that verified image without rebuilding it. The
reusable build workflow enables this gate explicitly for OpenLAP's single-platform
release; callers that omit the option keep the existing build behavior.

The verifier reads only reviewed local public Git objects, validates the historical
JAR hash, and runs synthetic data in a read-only, nonroot container without
networking, services or credentials. It tests generated JavaScript/HTML strings;
it does not open a browser or download chart libraries. Keep per-replica browser,
cold-cache and restart acceptance as rollout gates. An old image without the
bridge remains incompatible even if those same JAR bytes are copied into it. Inventory
the actual catalog, retain its IDs/paths/associations and explicitly map each
entry to the intended verified source. Do not clear registrations or use Add/
replacement uploads to repair missing legacy binaries.

## Dedicated migration image and optional Job

Build the runner independently of the web service:

```sh
docker build -f analyticsframework/Dockerfile.plugin-migration \
  -t openlap-plugin-migration:reviewed analyticsframework
```

Its entrypoint runs only `PluginArtifactMigrationApplication`, with no web server,
account initialization or Learning Locker connection. Arguments are passed as an
array; no shell evaluates source paths. The runner uses umask `077` and suppresses
dependency logging, retaining the CLI's bounded summaries. The dedicated workflow
runs entrypoint and historical-chart checks with read-only permissions. Its
push-only publisher verifies an immutable archive's checksum, source revision and
image configuration identity, then pushes that exact tested image without a
second build. Retain the source revision/build record, then pin
its `@sha256:` identity for an operation. A `plugin-migration-*` maintenance tag
publishes only this runner, without merging the feature or publishing application
images; it does not update the runner's main/edge tag. Creating that tag is an
explicit release step after review. An image build alone authorizes no rollout.

The opt-in `.k8s/maintenance/plugin-migration` Kustomization defines only a Job
and default-deny NetworkPolicy; the normal application base does not reference it.
It grants no Kubernetes API permissions and mounts no API identity. It creates or
deletes no PVCs, accounts or credentials. It is intentionally unconfigured: the
image, action, database and claim placeholders require an operator overlay, and
egress is denied until the operator supplies scoped rules.

Before each action, review the isolated rendered component (never a complete
credential-bearing deployment render) and confirm:

- A new Job name, the reviewed migration image digest, explicit primary database
  and exactly one action. Use no retries and a finite deadline; do not add a TTL
  that could cause a desired-state controller to recreate an operation.
- Separate operator-owned input/output claims. Their names must differ; mounting
  the same claim writable at `/outputs` would bypass the read-only input mount.
  Provision permissions for UID/GID 1000 in advance, with private directories;
  do not repair permissions or mount running application filesystems in the Job.
  The base deliberately omits `fsGroup`, which can change existing volume metadata
  during setup even when the container's input mount is read-only.
- Sources staged read-only under `/inputs/jars`, with the reviewed manifest at
  `/inputs/manifest.json` for check/apply. Preserve these exact paths throughout
  all actions. Inventory writes a fresh `/outputs/INVENTORY_NAME.json` using
  exclusive creation, so an existing output is an error.
- Only required primary-DB credential key references for inventory/check. For
  apply, explicitly add `PLUGIN_STORAGE_MODE=s3` and reviewed endpoint, region,
  bucket and S3 credential key references. Use no broad `envFrom` or debug/wire
  logging. The operator supplies secret values outside source control and chat.
- Egress limited to the installation's DNS and primary MongoDB destinations;
  add the reviewed S3 destination only for apply. No inbound access is needed.

Patch the Job's argument array for the selected action:

```yaml
# Inventory (primary DB read only; persists a new operator-reviewable manifest)
args: [--inventory, /outputs/NEW-inventory.json, --source-root, /inputs/jars]
# Check (primary DB read only; requires the reviewed input manifest)
args: [--check, /inputs/manifest.json, --source-root, /inputs/jars]
# Apply (explicitly approved MongoDB/S3 writes)
args: [--apply, /inputs/manifest.json, --source-root, /inputs/jars]
```

Stage files using a trusted operator host or a separately reviewed, digest-pinned
input image that copies only approved regular files into an empty staging volume.
The migration base contains no downloader or staging shell. Never use live Pod
exec, a writable backend mount, or an arbitrary workstation JAR as a staging path.
Retain the unedited inventory, review each mapping, and provide the reviewed copy
read-only for check/apply. Successful inventory is not approval to apply it.

Freeze catalog writes across **all old backend replicas** from inventory review
until the S3 rollout and acceptance complete. The CLI detects conflicts but does
not enforce a distributed maintenance lock; legacy whole-document saves can drop
additive references after migration. Verify the operator's actual freeze mechanism
before applying; an acknowledgement variable is insufficient. Preserve a
write-paused release checkpoint and rehearse restore before changing references.
The optional [database checkpoint runner](./plugin-release-checkpoint.md) provides
direct-source backup and isolated restore verification without Pod exec. Its
external writer-freeze, S3-object and off-node retention gates remain explicit.
The local [encrypted backup transport](./plugin-release-backup.md) supports age/rclone
upload, independent readback and private recovery; database restore remains a separate gate.

After every terminal result, remove the Job and operation-specific network access
through the normal operational process. Retain input/output claims, source
artifacts, the reviewed manifest and backups. Check the operation's bounded result;
never infer catalog coverage or successful rollout from a Job being created.

## Preflight with reproducible historical inputs

When the runtime JARs are missing and the reviewed recovery policy is appropriate,
`.k8s/maintenance/plugin-recovery-preflight` stages the two pinned public archives
and runs the existing read-only `--check` action. It is an optional maintenance
component; normal application installation does not select it.

Build and test the source-only input image using the application-owned staging
script and `Dockerfile.plugin-inputs`, then publish the exact tested image using
the `plugin-inputs-*` maintenance tag workflow. Record its immutable digest.
Neither the source image nor the public repository may contain an installation's
catalog IDs, recorded paths, reviewed manifest or credential values. Supply the
reviewed manifest privately as an operator-owned ConfigMap and record its exact
SHA-256. Retain the original inventory and source provenance independently.

The source-only init container receives the manifest as a read-only regular-file
`subPath` mount. It verifies the approved manifest digest and fixed public JAR
identities, creates `/staging/input` exclusively with private permissions, and
copies only those reviewed inputs. Existing destinations, symlinks, unsafe
filesystem paths and incomplete or altered copies fail. It publishes completion provenance
last. The `--verify` action checks a completed input directory without writing.

The checker mounts that same fresh `emptyDir` through `subPath: input`, read-only
at `/inputs`, after initialization succeeds. Thus each manifest's logical source
paths remain `/inputs/jars/...` without relying on volume ownership changes. Both
containers run as UID/GID 1000 with read-only root filesystems, dropped
capabilities and no API token. There is no root initializer, `fsGroup`, retained
volume mount or permission repair. Temporary copies disappear with the Job;
the verified public source bundle/image and private manifest must remain retained
outside it for repeat checks and any later approved apply operation.

Before selecting the component, configure and review:

- The tested input image and migration image, both by immutable digest.
- Exactly one private manifest ConfigMap reference and its reviewed file hash.
  Mount `manifest.json` using the defined `subPath`; projected directory symlinks
  are deliberately not accepted by the stager.
- Explicit primary MongoDB URI/database in the checker only. Supply no S3
  credentials, application `envFrom`, API identity or execution grants.
- DNS and primary MongoDB egress only, no inbound access, one attempt and a finite
  deadline. A Pod-level policy applies to both containers; only the checker is
  configured to contact MongoDB. Use a database read-only principal when available.
  On an unauthenticated database, reviewed CLI behavior is read-only but the
  network capability itself can permit writes; review that operational access.
- Fresh operation names, appropriate image-pull references and temporary policy
  ordering. Keep controller-specific ordering and protection in the environment
  overlay, rather than making the reusable component depend on a GitOps controller.

Preflight re-queries the complete current catalog, preserving IDs and recorded
paths while checking source containment, archive structure, sizes, SHA-256 and
every required class entry. Success proves those checks against that catalog at
that moment; it does not execute plugins, establish historical byte equivalence,
verify rendering or enforce a writer freeze. Remove the temporary Job, manifest
ConfigMap and operation policy after any terminal result. Keep the reviewed
manifest, source provenance, original inventory and backups in protected storage.

Do not convert this preflight into an apply by changing its arguments alone.
Apply additionally needs the verified writer freeze and release checkpoint below,
reviewed S3 access and a separately reviewed operation. The same image digests,
manifest bytes and logical source paths can be staged again for that operation.
The separate `.k8s/maintenance/plugin-recovery-migration` component provides that
staging layout with a default-denied action and a distinct Pod/policy selector.
Select `--apply /inputs/manifest.json --source-root /inputs/jars` only after the
freeze/checkpoint gates pass, then configure the exact S3 destination and scoped
client Secret key references plus its reviewed ingress/egress permissions. It
mounts no retained backup volume and supplies no S3 access by default.

## Recovery and release gates

Retain the pre-migration database backup, preserved JARs and reviewed manifest.
Back up Mongo metadata and bucket objects as a consistent release set. A missing
or corrupt object must be restored from the verified original; an import must
not overwrite a corrupt existing object automatically. Never remove active cache
files to repair a running backend.

Rollback to an older image requires restoring its exact local binaries at the
recorded paths, compatible template/bridge classes and compatible metadata. After later phases introduce new
S3-only versions, an old image cannot execute those versions using local paths
alone; rehearse a rollback with both old and new artifacts before production.

The edge Garage pilot has passed persistence/access checks. This backend code and
the migration have **not** been deployed to edge or production. Live application
rollout requires the preserved inventory and replica/restart acceptance above.
Production also requires an agreed availability design, an off-node backup target
and a successful restore rehearsal.

## Verification

Run ordinary backend regressions with `./mvnw test`.
The opt-in real-service harness requires Docker and AWS CLI v2:

```bash
python3 scripts/test-plugin-artifacts.py
```

It starts digest-pinned, disposable Garage and MongoDB containers on loopback
ports, generates test credentials in memory and removes its containers afterward.
It reads no deployment environment files, AWS profiles or Kubernetes credentials.
The Maven `plugin-artifact-it` profile fails if its test services are absent.
Tests cover migration parity/idempotency, conflicting sources, concurrent imports,
partial failures and retries, corrupt objects, and independent cold backend caches
loading real analytics and visualization classes after their source JAR is removed.
