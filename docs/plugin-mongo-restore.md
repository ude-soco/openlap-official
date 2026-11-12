# Restore a frozen MongoDB checkpoint to a fresh volume

`--restore-fresh-volume` restores one authenticated frozen schema-v1 checkpoint
into the root of a separately mounted persistent volume. It preserves the
verified database files after a clean shutdown, cold restart, complete comparison
and second clean shutdown. It accepts no remote restore-target URI and requires
no source database, S3 credential or Kubernetes API identity.

This action supports MongoDB **4.4.x with FCV 4.4**, using the existing pinned
**MongoDB 4.4.30 / Database Tools 100.10.0** checkpoint image. A schema-v2 online
archive is rejected. A frozen v1 archive contains one non-system database: it does
not preserve other databases, MongoDB users stored elsewhere, replica-set `local`
configuration, S3 objects or Learning Locker. Account for those separately before
choosing this mode. Use the same qualified application MongoDB image after
restoration; qualify its cold start against the retained files locally before a
live maintenance window.

## Prerequisites

Enforce and independently verify a writer pause before taking the fresh frozen
checkpoint, and keep application writers paused through restoration and
acceptance. Include other application instances, controllers and implicit
writers in that assessment. The evidence identifier below records the operator's
verification; the tool does not stop or remotely discover writers.

Keep the old database claim and volume protected and intact. Create a distinct,
correctly named target claim with adequate verified capacity. Do not create or
start its application MongoDB Deployment until the restore Job has succeeded.
`ReadWriteOnce` does not prevent another Pod on the same node from mounting the
volume. Deployment configuration and the maintenance sequence must prevent that
race; MongoDB's data-directory lock is an additional safeguard.

Retrieve the checkpoint through the approved backup mechanism and verify its
independently retained original report SHA-256. Mount the retrieved report and
archive read-only. Provision a separate protected receipt volume and a completely
empty target volume, both already writable by UID/GID 1000. The tool does not
change retained ownership or permissions, erase existing contents, create claims
or repair filesystems. A claim containing even a hidden file or filesystem
metadata directory is not accepted as empty.

The target and receipt paths must be explicit writable Linux mounts, with
underlying roots disjoint from each other and from both input files. Same-device
bind mounts are checked for equal or overlapping parent/subdirectory roots.
Reviewed persistent filesystem types are ext2/3/4, XFS, Btrfs, ZFS, NFS/NFS4 and
Ceph; memory filesystems and container scratch are rejected. These checks do not
establish a storage provider's failure domain, off-node retention or physical
capacity: retain those operational facts with the deployment record.

## Inputs and retained files

Use the exact immutable checkpoint image qualified by its CI workflow. Inputs are
nonsecret references and integrity hashes; no credential setup is needed.

| Input | Required value |
| --- | --- |
| Action | `--restore-fresh-volume` |
| `CHECKPOINT_ID` | Fresh result identifier; never reuse a result directory |
| `CHECKPOINT_TARGET_TOKEN` | Explicit operator identifier bound to the recorded target claim |
| `CHECKPOINT_FREEZE_EVIDENCE` | Reference to the separately verified current writer pause |
| `CHECKPOINT_EXPECTED_REPORT_SHA256` | Independently trusted original report SHA-256 |
| `CHECKPOINT_REPORT_PATH` | Original `.json` file under read-only `/inputs` |
| `CHECKPOINT_ARCHIVE_PATH` | Original `.gz` archive under read-only `/inputs` |
| `CHECKPOINT_OUTPUT_ROOT` | Fixed `/outputs` for this action |
| `CHECKPOINT_MAX_ARCHIVE_MIB` | `256` by default; allowed 1–1024 |
| `CHECKPOINT_MAX_EXPANDED_MIB` | `1024` by default; allowed 1–1024 |
| `CHECKPOINT_MAX_RESTORE_MIB` | `1024` by default; allowed 1–1024 |

The target is fixed at `/target`. Its root becomes MongoDB's dbPath directly,
matching the application's normal PVC-root mount at `/data/db`. Do not mount a
parent directory or add an unreviewed `subPath` at cutover. The target token
identifies the operator's plan; it does not independently establish which claim
was mounted. Retain the exact Job, input/target/output claim identities, image
digest, original integrity record and terminal result together.

Before touching the target, the runner authenticates a bounded private report
snapshot, exact original schema, archive hash/size and full bounded gzip stream.
It exclusively creates `/target/.openlap-mongo-restore-attempt` and retains that
marker on every later outcome. MongoDB binds only loopback, disables TTL
processing during verification, and uses no replica-set configuration. Native
restore applies the full one-database archive without namespace remapping.

The original report comparison covers the exact supported namespace set, counts,
ordered BSON IDs and content, index definitions and collection options. New
collection UUIDs are expected. The existing code-owned artifact projector also
preserves and verifies catalog/artifact associations without executing JAR code.
The first successful comparison is followed by `fsync`, a verified clean child
exit, a fresh server process on the retained dbPath and the same full comparison.
Index projection must leave that database unchanged. A second `fsync` and clean
exit, plus a final disk-budget check, precede publication.

Success retains MongoDB files and the attempt marker on `/target`, and publishes
only these files under `/outputs/CHECKPOINT_ID`, with private permissions:

- `artifact-index.json`, regenerated from the completely verified database;
- `restore.json`, a bounded receipt published last, binding the original report,
  archive and artifact-index hashes, target token, runtime and verification flags.

The receipt has status `FRESH_PERSISTENT_DATABASE_RESTORE_VERIFIED` and is printed
between `OPENLAP-PERSISTENT-MONGO-RESTORE-REPORT-V1` and
`OPENLAP-PERSISTENT-MONGO-RESTORE-REPORT-END-V1`. Require successful terminal Job
status and complete framing as well as the retained receipt. Raw records and
client diagnostics are not printed. The receipt explicitly does not attest
external writer enforcement, replica-set configuration, object storage,
application acceptance or resumed traffic.

## Kubernetes operation and cutover

The opt-in `.k8s/maintenance/plugin-mongo-restore` component is unselected by the
application base. It supplies a default-deny Job and NetworkPolicy, no API token
or execution grants, no automatic retries, and bounded CPU/memory/scratch/time.
Its image, action, integrity inputs and three existing claim names must be
configured explicitly. Select the qualified immutable checkpoint image and the
explicit restore action. Keep inputs read-only and do not add `envFrom` imports.
Establish and verify the deny-all policy before starting the Job; another additive
policy must not grant this Pod external networking. Argo-specific ordering and
claim prune/delete protection belong to the installation's deployment layer.

After successful restoration, remove the temporary Job/policy while retaining the
three volumes. Switch the application MongoDB Deployment to the new target claim
with the same qualified MongoDB version and its normal database-root mount. Do
not resume backend writers yet. For a single-member replica set, initialize the
fresh restored instance with the existing set name and intended new advertised
DNS through the supported replica-set component. Do not copy or forcibly rewrite
the old member's `local` configuration. Update backend DNS, backup source settings
and network selectors together. Validate retained records, plugin associations,
S3 coverage, application startup and scheduled backup/recovery before resuming
writers.

Failure never clears or repairs the target, and never produces a completed
acceptance receipt. Partial target files and the generic stage failure remain
available for review; private scratch and raw client diagnostics are discarded.
Every subsequent attempt against a partial or completed target is refused, even
with a new result identifier. Use a distinct newly provisioned target for a new
attempt. Do not delete markers or reuse a failed target to make a retry pass.
Before new writes, rollback can return to the retained original instance. After
new writes, reconcile or recover the newer data before returning to an older
volume.

Qualify the exact image and persisted files locally with synthetic data:

```sh
python3 -B tests/test_plugin_mongo_restore_containers.py
```

The image CI also runs this fixture against the exact loaded candidate before
publication. It exercises actual frozen capture, trusted-input and mount fences,
partial-target/retry refusal, publication/shutdown failures, catalog/DBRef and
index preservation, and cold starts from retained files. These disposable tests
use no live system, operator configuration, cloud credentials or published ports.

## Replica-set DNS rename qualification

The focused positive fixture also covers recovery from an existing single-member
replica set, rather than only a standalone source:

```sh
python3 -B tests/verify_plugin_mongo_rename_roundtrip.py --image SHA256_OF_LOADED_CHECKPOINT_IMAGE
```

It uses the pinned official MongoDB 4.4.29 image with FCV 4.4 for the source and
application-compatible target, and an explicitly selected immutable checkpoint
image. Both images must already be loaded locally; this fixture never pulls or
rebuilds them. Synthetic catalog entries, BSON IDs/DBRefs, collection options and
indexes are frozen at the original advertised DNS. The authenticated v1 archive is
restored to a fresh persistent volume, then initialized at a different DNS using
the same replica-set name and the public initializer. The original local replica
configuration is not copied.

The fixture restarts that restored member from the same volume and checks that
its durable configuration remains unchanged (the election term may advance).
Before any new write, a fresh frozen checkpoint of the adopted target must match
the original database/FCV and every collection's count, ordered BSON ID/content,
index and options fingerprints. It then issues a journaled majority write to an
existing synthetic collection. A fresh online v2 capture and an independent
full-oplog replay/index check cover the post-rename database, including the new
write. Frozen and online reports have different checkpoint bindings; their index
hashes must not be treated as interchangeable.

All containers, DNS aliases and volumes are disposable and owned by the fixture;
no ports are published. This establishes the MongoDB lifecycle composition only.
It does not test a deployed Kubernetes endpoint controller, operational network
policies, encryption/off-node custody, S3 storage, application execution or a live
maintenance window. Those remain separate acceptance gates.
