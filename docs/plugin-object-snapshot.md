# Logical plugin object snapshots

This optional application tool exports plugin objects as regular private files.
It does not copy provider internals, IAM files, user records or credentials.
The encrypted release transporter retains its native age/rclone integrity
protocol. The frozen `--export` path requires writers to both the database and
object store to be paused externally for the entire checkpoint and export.
The separate [online immutable-object cut](plugin-online-backup.md) supports
continued ordinary database writes and later new object keys, with physical
deletion explicitly disabled and the stricter online prerequisites satisfied.

The trusted input is an artifact index produced only after an isolated database
restore has verified the original checkpoint. The caller supplies the SHA-256 of
that index and of the original checkpoint report; the index also binds the
database archive. Export includes every managed object in the dedicated bucket,
including retained versions and objects not present in the registry. Objects
under unsupported keys, inconsistent registry states or changing inventories
prevent publication.

A snapshot is a new private directory containing an exact copy of the trusted
index, relative object body files and a canonical bounded `snapshot.json`
manifest. The manifest is published last. Incomplete folders are never adopted
or overwritten. Limits are 1,000 objects, 100 MiB per object, 2 GiB of bodies and
1 MiB per metadata document. Object key, byte SHA-256, size, content type and SHA
metadata are verified together.
The regular-file transporter omits empty directories. Restore therefore permits
an absent `bodies/` directory only for an authenticated zero-object snapshot;
it never creates or changes a retrieved input directory. Nonempty snapshots
require their exact private body directory and files.

Restore accepts only a fresh fixed local `/storage` volume, initializes the
qualified provider from separately supplied operator identities, and writes
through its loopback S3 API. All snapshot inputs are validated before storage
initialization. An independently regenerated verified database index must have
the same SHA-256 as the original frozen index. The tool checks the complete
inventory and every object after a cold provider restart and a new client.
It never restores into an arbitrary external endpoint or adopts retained state.

An index match establishes the association scope declared by the database index;
it does not establish universal coverage of arbitrary legacy serialized fields.
Export alone does not prove recovery. End-to-end recovery additionally requires
the retrieved and decrypted snapshot, verified database rehearsal, and the
fresh-provider restore result.

The standalone Java entry point is
`com.openlap.plugins.storage.PluginObjectSnapshotApplication` with the same
runtime classpath as the optional gateway. The image provides
`/usr/local/bin/openlap-object-snapshot` as its explicit launcher; the gateway's
default entry point is unchanged. Its explicit arguments are:

```text
--export TRUSTED_INDEX INDEX_SHA256 ORIGINAL_CHECKPOINT_SHA256 NEW_OUTPUT_DIRECTORY
--export-online TRUSTED_INDEX INDEX_SHA256 ORIGINAL_CHECKPOINT_SHA256 NEW_OUTPUT_DIRECTORY
--restore-fresh SNAPSHOT_DIRECTORY MANIFEST_SHA256 INDEX_SHA256 ORIGINAL_CHECKPOINT_SHA256 REGENERATED_INDEX
```

All file paths must be absolute, physical paths. Input metadata and body files
must be private regular files owned by UID 1000. Keep a snapshot immutable while
restoring; a read-only input mount is the intended execution contract. The index
supplied to `--export` and the independently regenerated index supplied to restore
come from the checkpoint tool's explicit verified index mode. Copying the first
index does not substitute for the second database rehearsal. The full index is
preserved byte-for-byte; the Java consumer deliberately does not reimplement its
MongoDB projection rules.

Export receives only the projected application-client configuration and an
explicit `PLUGIN_STORAGE_S3_ENDPOINT`. Restore receives separate projected root
and client configuration; its destination is always the fixed local `/storage`
and `http://127.0.0.1:9000`, regardless of the export endpoint setting. The storage
volume must be fresh, dedicated and externally isolated. Initialization and
restore failures retain partial state for review and never adopt it on retry.
During this isolated restore operation IAM is initialized once and its retained
identity is checked before each provider startup. Normal serving uses the
foundation component's read-only IAM mount.

Only hashes, byte/object counts and fixed status fields are printed. Consume
`FRESH_LOCAL_PLUGIN_OBJECT_RESTORE_VERIFIED` as the final success result; the
fresh provider's initialization status alone does not report restored data.
The manifest itself always records `recoveryVerified: false`; the separate
restore result binds its hash and the matched index and checkpoint/archive hashes.

## Optional export Job

`.k8s/maintenance/plugin-object-snapshot-export` packages only export, with a
deny-all NetworkPolicy. It is not included by the application base. Its image,
endpoint, bucket, region, claims and action are deliberately unconfigured. Pin
the exact image that passed the gateway and snapshot checks; override the
container arguments explicitly:

```yaml
command: [/usr/local/bin/openlap-object-snapshot]
args:
- --export
- /inputs/REVIEWED-index-run/artifact-index.json
- TRUSTED_ARTIFACT_INDEX_SHA256
- TRUSTED_ORIGINAL_CHECKPOINT_REPORT_SHA256
- /outputs/NEW-snapshot
```

The command override is required because the image's normal entry point serves
the gateway. The default `--configure-export` fails during argument validation.
Set `PLUGIN_STORAGE_S3_ENDPOINT`, `PLUGIN_STORAGE_S3_BUCKET` and
`PLUGIN_STORAGE_S3_REGION` to reviewed nonsecret instance selections. The only
credential input is the application-client Secret. No root identity, MongoDB
configuration, Kubernetes API identity or RBAC is supplied. Its existing verified
index claim is read-only at `/inputs`; a genuinely different claim and backing
volume is writable at `/outputs`. No `fsGroup` or ownership repair is performed.

The Job has no retries and a 1,200-second overall deadline. SDK calls have a
15-second API deadline; the standalone launcher has no whole-export timeout.
The Job deadline can interrupt a large or slow export. Treat any failed or timed
out Job as incomplete, protect its private output, and use a new output folder
for an authorized retry. Require both terminal Job success and the
`PLUGIN_OBJECT_SNAPSHOT_EXPORTED` result binding the trusted index hash and
completed manifest hash. Export always reports `recoveryVerified: false`.

Override egress only for the reviewed S3 Service and necessary DNS, and permit
that Job in the gateway's ingress policy. It needs no MongoDB, Kubernetes API or
external backup access. Apply the NetworkPolicy before starting the Job; the
public resource supplies no environment-specific ordering annotations. Remove
the temporary Job and policy after retaining its result and trusted hashes.

## Frozen release volume flow

This is a composition contract for a reviewed maintenance window, not approval
to pause production. Use three separately identified retained volumes:

| Role | Contents and public option |
| --- | --- |
| A | Existing protected preservation/output volume; retain its earlier data |
| B | Fresh dedicated provider volume from `.k8s/storage/plugin-versity/volume.yaml` |
| C | Fresh checkpoint/snapshot workspace from `.k8s/maintenance/plugin-checkpoint-output` |

The C option declares only the separately named `openlap-plugin-checkpoint-output`
claim, with a 5 GiB default request. It does not initialize, adopt or own A or B.
Review the storage class, actual free space, quota and retention before selection.
Requested capacity is not a backup capacity check: checkpoint archives can be
up to 1 GiB, snapshot bodies up to 2 GiB, and the encrypted uploader needs roughly
three selected payload copies plus overhead and existing retained data on A.
Set transport budgets from the actual release size and available output space.
Do not infer that an existing 2 GiB preservation claim can hold every allowed
payload. Apply retention and ordering annotations only in the delivery overlay.

1. Initialize fresh B with the separate fresh-bootstrap Job while the normal
   gateway is stopped. After terminal bootstrap success, remove that Job and run
   the single gateway with its normal read-only IAM mounts. Verify the app-only
   probe and a cold restart before the release capture. Keep physical plugin
   deletion disabled (`PLUGIN_DELETION_ENABLED=false`). This is a fresh-storage
   installation; an existing nonempty local plugin installation additionally
   needs the separately verified artifact migration procedure.
2. Start an approved maintenance window and drain **all database and S3 writers**.
   Capture the frozen checkpoint into a new folder on C. Only this first capture
   on a genuinely new, empty C may use an instance patch with `fsGroup: 1000`
   and `fsGroupChangePolicy: OnRootMismatch` to make its provisioned root writable.
   Never apply that patch to retained A, initialized B or a previously used C.
   Verify terminal capture success and retain the original checkpoint-report
   SHA-256 independently. Remove the first-use capture Job after verification;
   subsequent readers and exporters have no `fsGroup`.
3. Select the existing checkpoint-rehearsal Job's explicit
   `--index-plugin-artifacts` mode: read C at `/inputs` **read-only**, and write
   a new verified index folder on A at `/outputs`. Bind the independently trusted
   original report SHA and require the successful isolated restore, all-collection
   fingerprint comparison and final index result before export. Preserve the
   index SHA independently. Remove the temporary rehearsal Job and policy.
4. Run the export Job with **A read-only → C writable**, using that exact index
   and original report hash, and a new snapshot folder beside the checkpoint.
   Keep all writers drained. An empty registered-plugin index is a bounded
   database projection, not proof that the S3 bucket is empty: the exporter must
   still list the bucket and verify every managed object. Require the terminal
   result even when the actual object count is zero. Retain its manifest hash
   and remove the export Job and policy.
5. Run the [push-only encrypted uploader](./plugin-backup-upload-job.md) with
   C mounted read-only as both checkpoint and snapshot source, and **A writable**
   as a genuinely separate encrypted-output volume. Supply only the scoped
   backup-client Secret and reviewed public age recipient. Permit only the
   required backup HTTPS endpoint and DNS. Retain the typed upload receipt and
   its hash after terminal success, then remove the temporary Job, policy and
   credential selection. Retain A, B and C; never run volume cleanup as part of
   temporary Job cleanup.
6. Retrieve and decrypt the encrypted release on the operator host using the
   independently trusted receipt and original report hashes. Keep the private
   age identity outside the cluster and cloud destination. Rehearse the retrieved
   database into a new isolated database and regenerate the index independently;
   its complete bytes and SHA must match the original frozen index. Restore the
   retrieved snapshot into a fresh isolated provider with separately supplied
   operator identities. Require `FRESH_LOCAL_PLUGIN_OBJECT_RESTORE_VERIFIED`,
   matched checkpoint/archive/index/manifest hashes, exact inventory and cold
   client readback before claiming recovery. Transport readback alone is not
   this gate. This proof runs locally; no live restore Job is required.
7. Resume writers only through the separately reviewed application cutover or
   rollback procedure. Keep the frozen database and object snapshot paired;
   neither an empty UI count nor a successful provider bootstrap substitutes
   for the completed backup and recovery evidence.

Validate only public manifests and a generated credential-free A/C composition
with the normal Kustomize loader:

```sh
python3 -B tests/verify_plugin_snapshot_resources.py --schema-validator /trusted/bin/kubeconform
```

This check requires `kubectl`, PyYAML 6.0.2 and the explicitly supplied validator;
the validator checks strict Kubernetes 1.35 schemas. Omitting the validator runs
the same semantic checks without schema validation. No cluster context, live
overlay, Secret values or operator configuration is read.

The generated fixture verifier is:

```sh
python3 -B tests/verify_plugin_object_snapshot_containers.py --image sha256:EXACT_LOCAL_GATEWAY_IMAGE_ID
```

It tests the empty case, older/removed READY versions, present and absent STAGED
objects, absent PURGED history, source orphans, changed bytes/index mismatch,
validation before storage writes, fresh-only restore and cold client readback.
These are generated index consumer fixtures. They do not replace a combined
test using an actual verified database index and retrieved/decrypted snapshot.
The default verifier tests the packaged image class. The explicit development
flag `--compile-snapshot-source` instead compiles that class into scratch against
a foundation image; that mode is reported separately and is not final image
qualification. Continuous integration builds the runtime and uses the default.
The gateway workflow runs both provider and snapshot qualification against the
same loaded image ID before saving that exact tested image for publication.
The publication job verifies and loads that archive without rebuilding it.
