# Plugin artifacts: migration and operation

This is the phase 3 backend implementation for [issue #1](https://github.com/ude-soco/openlap-official/issues/1).
It adds explicit artifact migration and S3 execution. The subsequent
[upload/review/activation workflow](./plugin-upload-workflow.md) is also implemented
on this branch, together with [metadata/version management](./plugin-version-management.md).
Safe deletion and the usage overview remain later phases.
The application defaults to **local** mode; deployment never imports JARs automatically.

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

The commands below run inside `openlap-analyticsframework`, using Java 11.
`MONGODB_PRIMARY_URI` and `OPENLAP_MONGODB_DB` select the primary database; their
development defaults are `mongodb://127.0.0.1:27017` and `openlap_v2`. Explicitly
select the intended database in a deployment job. Supply service credentials
through its existing secure environment, without placing them in command arguments.

Create a new inventory file (existing files are never overwritten):

```bash
./mvnw -q -DskipTests compile exec:java \
  -Dexec.mainClass=com.openlap.plugins.migration.PluginArtifactMigrationApplication \
  '-Dexec.args=--inventory /preserved/plugins.json --source-root /preserved/replica-a --source-root /preserved/replica-b --source-root /preserved/image'
```

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

## Recovery and release gates

Retain the pre-migration database backup, preserved JARs and reviewed manifest.
Back up Mongo metadata and bucket objects as a consistent release set. A missing
or corrupt object must be restored from the verified original; an import must
not overwrite a corrupt existing object automatically. Never remove active cache
files to repair a running backend.

Rollback to an older image requires restoring its exact local binaries at the
recorded paths as well as compatible metadata. After later phases introduce new
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
