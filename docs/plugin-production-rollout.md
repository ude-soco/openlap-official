# Production plugin release runbook

Use this procedure to prepare and review an installation's transition from local
plugin JARs to verified S3 artifacts, or initialize an installation with no
registered plugins. It does not itself provision storage, provide high
availability or enforce a maintenance window. Normal
application installation does not select the optional maintenance components.
Configure those components separately and pin their public source revision and
tested container image digests. Keep application base selection unchanged during
preparation.

This guide defines release gates, not evidence that any installation has passed
them. Keep installation-specific identifiers, paths, manifests, backup locations,
reports and credentials in an access-controlled operator record, outside public
Git, images, issues and PRs. Inject credentials securely; do not put them in
command arguments or diagnostic output.

## 1. Agree the destination and recovery plan

Before scheduling a window, record and approve these operator-provided inputs:

| Input | Required evidence |
| --- | --- |
| S3 destination | Reviewed endpoint, bucket and access boundaries; capacity and a tested object read/write/readback path |
| Availability design | Storage/database failure domains, dependency behavior and an agreed outage/recovery objective; a successful pilot or multiple application replicas does not establish this |
| Checkpoint output | An existing protected writable destination, actual free space, ownership/access and retention; a PVC size request alone is insufficient |
| Independent backup | An off-node failure domain, protected destination, retrieval access, retention and enough capacity for MongoDB plus required plugin objects/source files |
| Restore environment | Separately reviewed isolated replacement storage, compatible MongoDB/runtime versions and a procedure that can verify retrieved backups |
| Window and writer drain | Responsible operator, permitted interruption, actual drain mechanism, other writers/controllers, verification and abort criteria |
| Rollback | Previous immutable application images, exact local source paths/bytes and required runtime classes, compatible database state and a rehearsed restoration plan |

Do not reuse or change ownership of an older backup volume to make a Job run.
Provision private writable access for the maintenance UID in advance, and use a
fresh output directory. Keep existing data/PVC retention and prune/delete
protection under the installation's operational controls. Do not add `fsGroup`
or a permission-repair initializer to retained data volumes.

The supported tooling and its limits are:

| Tool | Supported behavior | Separate operator requirement |
| --- | --- | --- |
| Migration CLI | Inventory, read-only check and explicit artifact apply | Capture/stage source files, review mappings, pause writers and approve changes |
| Reviewed source preparer/stager | Recover/stage only the fixed public artifacts in its reviewed policy | Prove those bytes cover this installation; preserve any other/custom versions |
| Checkpoint runner | Dump one supported live primary database and restore that fresh archive into its own isolated temporary MongoDB | Off-node export, retrieval, restoration of retrieved archives, S3 preservation and availability |
| Retrieved checkpoint rehearsal/index | Verify a retrieved archive in isolated MongoDB and project a deterministic plugin artifact index | Trusted original report hash, independent retrieval and application acceptance |
| Logical object snapshot | Export all managed object bytes/metadata; restore only into a fresh isolated qualified provider using an independently regenerated index | Actual writer drain, trusted checkpoint/index hashes and off-node transport |
| Encrypted release transport/uploader | Encrypt, push and independently retrieve a bounded release set | Approved scoped destination, separate recovery identity custody and actual restore proof |

The optional [single-instance provider](./plugin-storage-versity.md) separates
fresh bootstrap from normal serving. Create a dedicated fresh claim, initialize
it with the gateway stopped, verify the terminal bootstrap result, then remove
that Job before starting the gateway and its application-only probe. Retain the
claim through cleanup. First-use `fsGroup` is confined to the fresh claim; normal
serving never repairs retained state. This provides persistence across Pod
replacement, not high availability or an off-node backup.

Before activation, require the provider/container checks and the combined
database-index, encrypted retrieval and fresh-provider recovery proof described
in the [snapshot guide](./plugin-object-snapshot.md). A fixture that supplies a
handwritten index, a warm cache or the original source volume does not establish
that combined recovery path. Select the exact tested/published image, not a
rebuilt substitute.

## 2. Capture complete sources before replacing pods

Pause plugin catalog mutations. Preserve the bundled and uploaded JARs from
**every existing backend replica before any application pod or image is
replaced**. Include image-only files and all installation-specific plugin versions;
one replica or a workstation directory is not complete source coverage.

Use an authorized operational capture or image-extraction mechanism. The migration
CLI inventories files already available under explicit source roots; it does not
collect running Pod filesystems. The source stager does not download arbitrary
plugins or discover missing versions. Do not improvise Pod exec or mount a running
backend filesystem writable into a maintenance Job. If trustworthy capture is
unavailable, stop before replacing pods and establish a reviewed capture mechanism.

Retain each copy's original recorded path, replica/image identity, size, SHA-256
and provenance. Verify copies are complete and readable. An empty file listing
does not prove that a missing catalog binary never existed. Resolve every missing
or conflicting source, including different binaries with the same filename.
Retain the exact previous image/runtime dependencies needed for rollback.

For an installation reporting no plugins, reconcile all replicas' source roots
with the actual database catalogs and independently verified checkpoint index.
Empty directories alone are insufficient. An empty registered snapshot requires
no factory imports or copied entries from another environment; preserve the
whole database, including users and homepage content. If new registrations appear
before the writer drain, repeat coverage review before replacing any old Pod.

Known public history can supply reviewed source bytes through the
[recovery procedure](./plugin-artifact-migration.md#recover-reviewed-historical-source-artifacts).
Its provenance checks do not establish catalog equivalence, cover custom plugins
or prove compatibility with a deployed backend. Names and class-entry matches
alone are insufficient evidence to substitute one version for another.

## 3. Inventory, review mappings and run read-only preflight

Keep the application in local mode during preparation. Use the dedicated
[migration runner](./plugin-artifact-migration.md#dedicated-migration-image-and-optional-job),
with an explicit primary database and read-only staged sources. Supply no S3
credentials to inventory/check. Restrict access to the required database/DNS
destinations; the CLI's read-only behavior does not turn unrestricted database
network access into a read-only capability.

The supported argument arrays are:

```yaml
args: [--inventory, /outputs/NEW-inventory.json, --source-root, /inputs/jars]
args: [--check, /inputs/manifest.json, --source-root, /inputs/jars]
```

These are alternatives, one action per invocation. Additional preserved
directories can be supplied with repeated `--source-root` arguments. Inventory
creates a new JSON file exclusively. `--inventory-report FILE` additionally
prints that same inventory between complete markers, for an explicitly authorized
log audience; its 64 KiB limit fails before file creation and has no automatic
fallback. Inventory success is not source coverage or permission to apply.

Retain the original inventory unchanged. Review a separate candidate manifest,
preserving every entry's `kind`, `catalogId` and `recordedPath`; resolve its
`sourcePath`, `sha256`, `sizeBytes` and any reported problem explicitly. Keep all
sources within approved roots and retain the reviewed manifest hash. Cover the
complete installed analytics/library catalog, including disabled entries required
by saved work, and every associated visualization class. Do not clear/recreate
registrations or use Add/replacement uploads to repair legacy source mappings.

Preflight re-queries the current catalog and verifies coverage, archive structure,
source containment, byte identities and required class entries. It does not
execute analytics/charts, prove historical equivalence, preserve MongoDB or lock
writers. Use the opt-in
[reproducible-input preflight](./plugin-artifact-migration.md#preflight-with-reproducible-historical-inputs)
only when its fixed source policy covers the reviewed mapping. Its ephemeral
copies are reproducible inputs, not retained backups.

## 4. Drain writers and take the release checkpoint

Enforce the agreed write pause and verify it in the running system. Account for
all old backend replicas, in-flight requests, background workers, direct clients
and controllers that could recreate writers. Record the observed drain; an
acknowledgement string or zero desired replicas alone is insufficient. Keep old
writers stopped through migration and resume only compatible backends under the
reviewed rollout plan. Restrict plugin mutations until acceptance completes.

Run the opt-in [database checkpoint](./plugin-release-checkpoint.md) against the
explicit supported source using its explicit `--checkpoint` action. Capture
requires MongoDB 4.4/FCV 4.4 and matching source host/port, and restores only to its
own fresh, attested loopback target. Review its archive/expanded/restore budgets,
actual output/scratch space and finite deadlines before the window. Unsupported
database structures or exceeded budgets are blockers, not reasons to skip checks.

Require successful source-before/after comparison, full gzip/SHA verification,
isolated restore comparison and complete success report framing. Retain both the
original `database.archive.gz` and `checkpoint.json` with their release identity.
A partial output or a created Job is not a successful checkpoint. The runner
does not enforce the write pause and does not back up plugin objects or other
databases; identify and preserve every additional dependency separately.

## 5. Prove off-node recovery before apply

Transfer the exact checkpoint archive/report, source bundle, inventory, reviewed
manifest and image identities to the approved independent destination. Include
the required plugin objects and registry metadata as a consistent release set
when S3-managed versions already exist. Preserve the original bytes and access
controls; a local claim and an upload acknowledgement do not prove recovery.

Require evidence of all of the following:

1. Independently retrieve the retained copies through the intended recovery
   access path, without reading the original local output as a substitute.
2. Check the retrieved archive's size and SHA-256 against the trusted original
   report, validate the complete bounded gzip stream, and verify source/object
   hashes against the retained manifest/provenance.
3. Restore the **retrieved** database archive into fresh isolated storage using a
   compatible runtime and a separately reviewed procedure. Attest that the target
   is disposable and cannot be the source/live database. Supply no live restore
   target or application writers. Fail closed on target, format or budget errors.
4. Compare the restored database's namespace names, counts, document-ID/content
   hashes, indexes and options with the trusted checkpoint report. Source
   collection UUID identity is checked around the dump; restore does not promise
   to preserve those UUIDs.
   Verify the exact required plugin objects/source bytes are also retrievable,
   and record restoration time and any limits relevant to the recovery objective.

Use the supported [encrypted release transporter](./plugin-release-backup.md),
or the opt-in [push-only uploader](./plugin-backup-upload-job.md), for this step.
Keep the private age identity solely on the operator host, with a separately
retained recovery copy. The cluster uploader receives only its folder-scoped
client configuration and public recipient. Import its bounded typed receipt only
after independently observing terminal success for the exact reviewed Job and
log source. A receipt or upload readback alone is not a successful restore.

Choose the recovery gate for the actual frozen state:

- For a wholly local legacy catalog, first prove independent retrieval and
  `--rehearse-archive` restoration of the complete MongoDB checkpoint plus exact
  retained local source coverage. Legacy catalog rows without artifact references
  correctly make an artifact index unready for S3 export; do not bypass that
  result. After migration, take a new consistent checkpoint and pass the complete
  S3 recovery gate below before releasing writers.
- For an already S3-managed or verified empty registered snapshot, project the
  frozen checkpoint with `--index-plugin-artifacts`, then export against that
  exact index and original checkpoint-report hash. Include snapshot, copied index
  and checkpoint archive/report in one encrypted release. An empty catalog still
  requires export: source orphans may make its bucket snapshot nonempty. Do not
  replace the database index with an assumed empty document.
- Mixed legacy and S3 state needs a separately proven complete preservation path.
  The current snapshot consumer requires a fully resolved, legacy-free index.
  Stop if that condition prevents complete preservation; do not discard legacy
  rows, ignore managed objects or treat a local-only backup as complete.

For the S3 recovery gate, pull through the independent client, verify/decrypt the exact retained
ciphertext, and use only those retrieved files for a fresh
`--index-plugin-artifacts` rehearsal. Require byte-identical regenerated index
SHA-256, full database fingerprints and `readyForS3Export` before
`--restore-fresh`. Supply separately prepared destination identities; the
destination must be isolated fresh storage, never the live endpoint. Require
the final object restore result and complete cold inventory/metadata checks,
including retained versions and source orphans. Both zero-object and populated
recovery must work without source MongoDB, original object volumes or caches.

Use distinct input/output claims per operation. One supported layout uses a
retained operator output claim A and a separately provisioned checkpoint/export
claim C for the S3-ready case: capture to C, project C read-only into A, export the index from A
read-only into a new directory on C, then upload checkpoint and snapshot from C
read-only with ciphertext/receipt/scratch on A. The uploader's writable output
must be genuinely distinct from every input backing volume. First-use writable
access on C must be prepared without also mounting or changing retained A. Review
claim topology before its first consumer: local volumes used together must be
schedulable on a common node. Constrain fresh C's first consumer to A's verified
placement when required; a shared namespace or different PVC names does not
establish compatible topology. Do not attach A to a first-use `fsGroup` Pod merely
to influence scheduling. Review
actual free space: A needs roughly three selected payload copies plus retained
data, not merely a nominal PVC request. No later operation adds `fsGroup` to
repair retained inputs. Local operator-owned retrieved files may be copied into
fresh UID-1000 recovery staging; preserve their original bytes and permissions.

Do not invent a live-target `--restore` mode. The checkpoint runner's internal
roundtrip alone does not satisfy off-node recovery. If independent retrieval or
fresh restoration is unavailable or fails, keep apply blocked and follow the
agreed abort/resume procedure.

## 6. Approve apply and verify the attachment

Before apply, reconfirm the writer drain, checkpoint/off-node recovery evidence,
complete current catalog coverage, immutable image pins, reviewed manifest hash,
S3 destination/access and abort/rollback plan. Run read-only check again against
the final catalog and staged bytes. Any source/catalog change requires review;
do not silently regenerate a mapping during the window.

Apply is a separately reviewed operation with explicit S3 configuration and
scoped credential key references:

```yaml
args: [--apply, /inputs/manifest.json, --source-root, /inputs/jars]
```

For a reconciled empty installation, verified source coverage plus the frozen
index's `emptyRegisteredPluginSnapshot` permits a fresh S3 configuration without
inventing a migration manifest or importing defaults. Recheck this condition
under the writer drain. A nonempty or unresolved index returns to the complete
mapping/migration procedure above; it must not be cleared to fit the empty case.

The opt-in migration component requires `PLUGIN_STORAGE_MODE=s3`, primary MongoDB
access and reviewed S3 egress. It repeats preflight, stores and reads back verified
objects, then conditionally attaches artifact references. Compare catalog
IDs/recorded paths and source coverage against the retained inventory. Compare
metadata, enabled states, chart/library associations and saved-work references
against the checkpoint or a separately retained pre-change baseline; the inventory
does not contain all of those fields. Apply never switches application mode or
deletes catalog entries/objects.

An interruption can leave objects or some references attached. Keep writers
paused, establish the outcome, and use the same reviewed manifest for a separately
reviewed idempotent retry. Do not reset the catalog, overwrite a corrupt object,
or infer rollback from a failed command. Restore is its own approved operation.

## 7. Roll out and accept every backend

Roll out only reviewed compatible images with explicit S3 mode and a private
cache per backend process. Startup checks installed entries, including disabled
versions; cold caches need authoritative objects and sufficient capacity. A
verified warm cache can mask an object-store outage, so it is not cold-start
evidence. Do not share a cache directory between running processes or remove
cache files while their classloaders may execute.

Record acceptance for **each replica**, with enough routing evidence to identify
which replica handled the request:

- Complete catalog/version coverage, preserved associations and expected enabled
  states; existing indicators and supported retained versions still work.
- Real analytics execution, a nonempty table preview from known matching data,
  and actual browser chart rendering/customization with the required script
  assets. An empty filtered result is distinct from a request/plugin failure.
- Independent cold-cache download/integrity checks and successful execution,
  followed by a backend restart and repeat acceptance.
- Expected save/draft/card/reference behavior, recovery behavior and the agreed
  availability/outage checks. Generated HTML/JavaScript assertions and a passing
  maintenance image do not establish application/browser compatibility.

Establish and verify ongoing backups of the migrated MongoDB/S3 state as a
consistent release set. The pre-migration checkpoint remains a rollback point,
not a current-state backup after new application writes.

If acceptance fails, restrict mutations and follow the reviewed recovery plan.
Older images require exact local bytes/paths, compatible runtime classes and
metadata; they may not execute later S3-only versions. Do not assume an image-tag
rollback alone is sufficient.

## 8. Keep deletion gated and clean up operation resources

Keep `PLUGIN_DELETION_ENABLED=false` until every writer of indicators, drafts,
cards and installation reviews runs the guarded S3 implementation. Removal is a
separate approval after runtime/recovery acceptance. Review
[removal and retention](./plugin-removal-and-retention.md#deployment-gate), keep
retention configuration consistent across replicas, and use its authoritative
reference review rather than dashboard usage counts. Application recovery-window
settings do not define backup retention.

For the single-instance Versity option, keep physical deletion disabled even
after all application writers are upgraded: current qualification establishes
PutObject durability, not durable physical DeleteObject under filesystem/node
failure. With `PLUGIN_DELETION_ENABLED=false`, the current application also
disables logical removal and restore. Uploads and version management remain
available, and existing versions are retained. Document this initial-release
limit separately from application reference checks; do not enable the flag to
bypass the provider durability requirement.

After each terminal maintenance result, remove temporary Jobs, private manifest
ConfigMaps and operation-specific network access through the normal deployment
process. Avoid TTL/retry settings that could recreate a desired operation.
Preserve data/PVCs, original inventories, reviewed mappings, source artifacts,
checkpoint archives/reports, independently retained copies and required S3
objects through the agreed recovery period. Confirm the temporary workload is
absent and retained data remains available. Cleanup does not authorize catalog,
binary, backup or volume deletion.
