# Optional single-instance plugin object storage

This option is under qualification. It is not selected by the application base
and is not a production deployment instruction until the container and recovery
checks below have passed.

The gateway is [Versity v1.11.0](https://github.com/versity/versitygw/releases/tag/v1.11.0),
source commit `e42ae7ab8107201e64e52ee024824e8cab3683b3`. Its
[chart documentation](https://github.com/versity/versitygw/blob/e42ae7ab8107201e64e52ee024824e8cab3683b3/chart/README.md)
supports persistent internal IAM for **one gateway**; that IAM store cannot
coordinate concurrent gateway writers. A single instance provides persistence
across Pod replacement, not high availability or protection against losing its
storage node. Off-node encrypted backups and a rehearsed recovery procedure are
separate requirements.

The Linux amd64 release archive is pinned to SHA-256
`1f075c9dc92fef232f5b3c7465711ddc5e1b062b2b6df4a3bd246a4be5b35b52`.
The official [checksum file](https://github.com/versity/versitygw/releases/download/v1.11.0/checksums.txt)
has SHA-256 `72eb24bf3cdd5c2b0e78003e882f8adc4ae4f12a2ce3c2022c13bae54311c46b`.
Runtime installation must not resolve a floating release or accept an unchecked
binary.

The intended option separates explicit fresh initialization from normal serving.
Normal serving must reject missing, corrupt or changed IAM, bucket policy,
installation identity or credential identity instead of creating an empty
replacement. It must hold an exclusive storage lock and use a single replica
with Recreate deployment. It runs as UID/GID 1000 with a read-only container root,
no Kubernetes identity or RBAC, and a private S3 Service. Existing retained
ownership must never be repaired by adding `fsGroup` or a root initializer.

The bucket belongs to the root account. The application receives a separate
ordinary, nonowner account, with list access to its dedicated bucket and only
GetObject, PutObject and DeleteObject beneath the two plugin prefixes. It must
not be able to create/delete buckets, change ACLs/policy, or administer IAM.

Operator-supplied Secret keys are separate:

| Secret role | Keys |
| --- | --- |
| Storage root | `ROOT_ACCESS_KEY_ID`, `ROOT_SECRET_ACCESS_KEY` |
| Application client | `PLUGIN_STORAGE_S3_ACCESS_KEY`, `PLUGIN_STORAGE_S3_SECRET_KEY` |

Never put their values in images, command arguments, diagnostics, examples or
public Git. Bootstrap and gateway verification may read both projected Secrets;
the backend and application-only readiness probe receive only the client Secret.

`--fsync` is mandatory. In this pinned release it flushes new object data,
inode/xattrs and publication directories before acknowledging PutObject. It does
not establish IAM, bucket-policy, ACL or Delete durability, storage redundancy,
or a transaction with MongoDB. Bootstrap must explicitly flush and verify static
IAM and bucket metadata before publishing its installation marker. The actual
filesystem must support owner access, user xattrs, atomic publication, locks and
directory fsync.

Keep `PLUGIN_DELETION_ENABLED=false` for this option until durable deletion has
been separately established. Logical removal and retained versions remain
available. Deleting the probe's unregistered synthetic object tests API cleanup;
it does not prove durable physical purge after a node or filesystem failure.

The optional resource sets are separate:

- `.k8s/storage/plugin-versity-credentials` declares only the two empty logical
  Secrets. An operator supplies their values through a secure mechanism, such as
  env-file generators with `behavior: merge`. No default credential values exist.
- `.k8s/storage/plugin-versity/volume.yaml` requests a dedicated fresh claim.
  Review storage class, capacity, ownership and retention in the installation.
- `.k8s/maintenance/plugin-versity-bootstrap` initializes only an explicitly
  selected **fresh** claim. Its first-use fsGroup is not permission repair for an
  existing application, backup or previously initialized storage volume. Keep
  the normal gateway stopped until this operation succeeds, then remove the Job.
- `.k8s/storage/plugin-versity` runs the single gateway with its static parent/IAM
  mount read-only and only object/lease subpaths writable. Normal serving has no
  fsGroup or root initializer. It verifies retained state instead of reinitializing.
- `.k8s/maintenance/plugin-versity-probe` uses only the application Secret and an
  explicitly reviewed endpoint. Remove the temporary probe Job after its result.

Kubernetes projects keys through a versioned `..data` directory. Credential
inputs permit only resolved regular files inside their read-only projection;
escaping links fail. Mode 0444 makes those projected inputs readable by UID1000
without changing retained-volume ownership. Retained IAM, installation markers
and object files retain their separate owner-only requirements. Private
directories may inherit SGID from a provisioner; group/other access remains absent.

Image placeholders, bucket/region, existing credential inputs, fresh claim and
network selectors are deliberately unconfigured. Apply instance overrides and
test their synthetic composition without rendering live Secret values. The
gateway has no Kubernetes API identity. The bootstrap needs only loopback; the
normal service should accept only reviewed backend/probe traffic. No ingress or
public bucket is installed.

Qualification must use the actual AWS Java SDK 2.57.11 `S3ArtifactObjectStore`
path: absent-object 404, verified put/get/delete, content type and SHA metadata,
negative permissions, cold restart, read-only IAM, unsafe retained-state rejection
and fixed diagnostics. A readiness probe may use one uniquely content-addressed,
class-free synthetic JAR without registering or executing a plugin.

The existing encrypted release transporter can carry a logical object export as
regular files. It does not create that export or restore a provider. Before this
option is production-ready, a separate typed export/import contract must bind
the exact required keys, bytes and metadata to the same trusted frozen MongoDB
checkpoint, restore into a fresh isolated gateway from explicit operator Secrets
and declarative policy, and verify application associations. Directly archiving
the POSIX tree through the current transporter loses xattrs and is not a tested
recovery procedure.
