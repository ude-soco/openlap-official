# Online plugin backups

The explicit online mode captures a consistent point from a supported MongoDB
4.4 single-member replica set while ordinary application CRUD and transactions
continue. It uses the pinned MongoDB 4.4.30 runtime and Database Tools 100.10.0.
The existing frozen checkpoint actions and schema v1 remain unchanged.

This uses the native full-instance dump of the supported databases on **one
primary MongoDB instance**, excluding `local`. It includes eligible `admin` and
`config` data,
which can contain authentication material. Encrypt the complete archive before
off-node export. It does not back up a separate MongoDB instance, Learning Locker,
an LRS, external datasets or application binaries. Retain compatible application
and tool image identities separately.

Native Database Tools omit `admin.system.keys` and config collections other than
`chunks`, `collections`, `databases`, `settings`, `shards`, `tags` and `version`.
The source validator permits the expected omitted server bookkeeping
`config.system.sessions` and `config.transactions`; it rejects other config
namespaces instead of silently losing custom data. Replication/session history
and the source replica-set configuration are not a physical server clone. Other
unsupported system collections, views, capped collections, unfinished index
builds, missing `_id` indexes and names/counts outside the bounded format fail.

## Prerequisites and one-time maintenance

The source must be a writable primary with exactly one data-bearing member,
MongoDB 4.4.x and stable FCV 4.4. Supply its exact replica-set name and stable
advertised DNS host/port. Neither mongos nor discovery of another member is
accepted. A single-member replica set provides oplog consistency, not high
availability.

Converting an existing standalone requires a reviewed shutdown/restart and an
election. That is database maintenance with an application availability risk;
the online capture feature does not authorize or perform that production change.
Preserve the existing data PVC and its ownership. Review actual free capacity,
including an explicit oplog size and growth budget; a PVC request does not prove
physical capacity. Never initialize a replacement empty database to hide an
existing-data or replica-set mismatch, and never force `rs.reconfig` on a mismatch.
The optional replica-set component is unselected by the application base.

Physical plugin deletion must remain disabled throughout capture and object
export. Both online commands require **explicit** `PLUGIN_DELETION_ENABLED=false`.
This input is an operator assertion of the running storage policy; the tools do
not change or remotely discover backend settings. Account for other object-store
clients: no actor may overwrite or delete existing content-addressed objects.
Logical plugin removal/restoration may continue under the application's separate
logical-removal setting.

No database DDL, collection rename/drop/create, index build, `$out`, rename-based
map-reduce, authentication/admin schema change or FCV transition is supported
during capture. Normal supported CRUD and transactions may continue. The source
metadata checks and native oplog checks reject detected changes; they do not
replace this operational restriction. The oplog must retain the entire native
dump interval and any required active-transaction history. Rollover, unsupported
operations, a stepdown, a size/deadline breach or a client failure aborts the
attempt.

## Capture, index and export

`--checkpoint-online` accepts the usual fresh `CHECKPOINT_ID`, output mount and
byte budgets, plus these explicit inputs:

| Input | Online requirement |
| --- | --- |
| `MONGODB_PRIMARY_URI` | `mongodb://HOST:PORT/` with an **empty database path**; reviewed auth/TLS options are supported |
| `OPENLAP_MONGODB_DB` | The non-system OpenLAP database to project after full replay |
| `CHECKPOINT_SOURCE_HOST` / `CHECKPOINT_SOURCE_PORT` | Exact advertised single-member host and port |
| `CHECKPOINT_REPLICA_SET` | Exact configured replica-set name |
| `PLUGIN_DELETION_ENABLED` | Literal `false` throughout the capture/export interval |

The tool runs a full `mongodump --oplog --archive --gzip`, with no `--db`, query,
collection or namespace filter. It restores the entire archive into a fresh
isolated loopback database using `mongorestore --oplogReplay`, then fingerprints
all supported restored databases. Replay must also be full-instance: namespace
includes/excludes, renames and database filters cannot be combined with this
mode. No source database or target URI is accepted by the independent rehearsal.

Success retains the same two private filenames, `database.archive.gz` and
`checkpoint.json`, in a new mode 0700 directory. The online report uses exact
schema v2, `captureMode: INSTANCE_WIDE_OPLOG` and status
`INSTANCE_WIDE_OPLOG_REPLAY_VERIFIED`, framed by
`OPENLAP-CHECKPOINT-ONLINE-REPORT-V2` / `...-END-V2`. Its full-instance
`databases` rows are authoritative fingerprints of the isolated full replay;
`collections` must exactly equal the selected OpenLAP database's rows. Source
content is expected to change, so there is no frozen-source equality claim.
Unknown keys, fake freeze fields and partial v2 claims are rejected.

`captureStartedAt` and `captureCompletedAt` are fixed millisecond UTC source-clock
observations around the dump. Use the earlier `captureStartedAt` as the
conservative freshness bound, backed by the independently retained original
report hash and trusted collector timeline. Re-upload time cannot establish data
freshness. `sourceOplogBefore` and `sourceOplogAfter` are surrounding observations,
not fabricated exact archive boundaries. `NATIVE_MONGODUMP_COMPLETE_RANGE` names
the native tool's complete-range validation.

Independently replay a retained/retrieved copy with `--rehearse-online-archive`,
or use `--index-online-plugin-artifacts` to produce the normal strict artifact
index after that full replay. Input paths, trusted original report hash, read-only
mount requirements, budgets and fresh-only output rules match the frozen
rehearsal. The artifact-index schema and projector are unchanged: only OpenLAP's
selected restored database is projected, and the index binds the exact online
report and archive hashes.

Active management locks, artifact/catalog pins and unsupported transitional
installation/removal states remain failures. **Retry the entire capture with
fresh output after the operation finishes.** Never erase reservations from the
source or edit a restored snapshot to make the index pass. An unsuccessful
attempt must not produce a successful upload/acceptance receipt. A fresh Pod and
fresh scratch directory are required for any automatic Job retry.

After a successful index, run the packaged snapshot launcher:

```text
--export-online TRUSTED_INDEX INDEX_SHA256 ORIGINAL_CHECKPOINT_SHA256 NEW_OUTPUT_DIRECTORY
```

The exporter takes one bounded inventory cut from the dedicated bucket, including
source orphans. Every READY key in the database index must be present; STAGED keys
may be present or absent and PURGED keys must be absent. Every cut object is
exported and checked twice for exact bytes, size, content type and SHA metadata.
Repeated inventories must still contain all cut keys with the same sizes.
Later **new keys** are permitted but excluded from this snapshot; existing-key
removal, replacement or corruption fails verification. The cut is after the
database recovery point and can therefore include additional safe orphans.

The canonical manifest uses schema v2 and format
`OPENLAP_PLUGIN_OBJECT_SNAPSHOT_IMMUTABLE_CUT_V1`, with exact
`objectSelectionPolicy: IMMUTABLE_KEYS_AT_EXPORT_CUT` and
`physicalDeletionDisabled: true`. It continues to bind the original checkpoint,
archive and index hashes and records `recoveryVerified: false`. Frozen `--export`
retains schema v1 and still rejects every inventory change.

## Encrypted recovery and qualification

Native age/rclone transport validates both checkpoint schemas and preserves its
existing integrity receipt format. Store the independently trusted original
report, index, manifest and upload-receipt hashes with the producer's immutable
Job/image identity. Do not trust a mutable remote `latest` record as this root.

Recovery downloads and decrypts into new private operator-owned files, preserves
those inputs, and stages fresh UID 1000 copies for the tools. A **new full
oplog replay** regenerates the OpenLAP index; its exact bytes/hash must match the
pre-transport index. `--restore-fresh` accepts the authenticated v2 manifest only
after complete input and association validation, restores only into a fresh
isolated local provider volume, and checks all objects after a cold restart.
Never replay this full archive into an existing/live primary as a verification
step. A real replacement-primary cutover needs its own reviewed maintenance plan.

`tests/verify_plugin_combined_recovery.py --online` builds only allowlisted public
sources and uses generated data. It qualifies nonempty and empty plugin catalogs,
cross-database transactions during actual capture, retained data across a
standalone-to-replica-set restart, strict negative inputs/fences, concurrent new
object keys, native encrypted push/pull after deleting source containers and
volumes, independent retrieved reindexing, and separate cold MongoDB/object
association readback. Generated class-free JARs are never executed. This proves
the tested synthetic recovery path; it is not production application or chart
execution, external custody or a zero-downtime database conversion claim.

The native MongoDB behavior is pinned to the
[100.10.0 dump source](https://github.com/mongodb/mongo-tools/blob/100.10.0/mongodump/mongodump.go),
[oplog capture](https://github.com/mongodb/mongo-tools/blob/100.10.0/mongodump/oplog_dump.go),
[restore validation](https://github.com/mongodb/mongo-tools/blob/100.10.0/mongorestore/mongorestore.go),
[replay implementation](https://github.com/mongodb/mongo-tools/blob/100.10.0/mongorestore/oplog.go),
[namespace policy](https://github.com/mongodb/mongo-tools/blob/100.10.0/mongodump/prepare.go)
and [config collection policy](https://github.com/mongodb/mongo-tools/blob/100.10.0/common/dumprestore/config.go).
The one-time restart follows the versioned
[MongoDB 4.4 conversion guidance](https://github.com/mongodb/docs/blob/v4.4/source/tutorial/convert-standalone-to-replica-set.txt).
