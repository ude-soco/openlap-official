# Opt-in push-only backup uploader

`.k8s/maintenance/plugin-backup-upload` packages the
[encrypted transport CLI](./plugin-release-backup.md) for a reviewed upload from
protected source volumes. It is not selected by the normal application base.
The default action fails before reading configuration or starting clients. The
image exposes upload only through its entrypoint; no private age identity,
database credentials, HTTP server, API token, ServiceAccount or RBAC is supplied.
This component does not activate a backup destination or prove its availability.

## Review the inputs and storage

Select a tested immutable uploader image and public source revision. The image
pins official Python, age and rclone releases and contains only public runtime
code/clients. Its workflow builds without publishing on PRs, tests that exact
image, and exports a checksummed Docker archive for a separate push-only publisher.
Publication loads and tags that archive without rebuilding. Maintenance tags use
`plugin-backup-upload-*`; only main updates the image's edge tag. No tag or image
publication activates this optional Job.

Configure the three operator-owned claims explicitly:

- Mount checkpoint and reviewed source claims read-only at `/checkpoint` and
  `/sources`. Verify UID/GID 1000 already has read/search access. Do not change
  retained ownership, add `fsGroup`, use a root initializer or repair permissions.
- Mount a genuinely **different retained output claim** at `/outputs`. Check its
  actual claim/volume identity, access, capacity and retention independently;
  different mount paths alone do not establish separation. Reusing an input
  claim writable would bypass its read-only mount. The runtime cannot attest PVC
  identity without Kubernetes access.
- Use a fresh output directory for every operation. The core CLI retains local
  ciphertext and a protected receipt there. Its private `.work` is also on this
  output volume and can contain **plaintext tar/readback scratch after failure**.
  Budget roughly three payload copies plus overhead, protect the whole volume,
  and retain it through recovery/handoff. Encryption of remote objects does not
  encrypt this local plaintext scratch at rest.

Review the original checkpoint-report hash, completed checkpoint, full source
coverage, writer drain and recovery plan using the existing guides. The Job does
not query a database or determine catalog coverage. Inputs must remain stable;
the CLI detects source byte/membership changes rather than locking writers.

## Supply one scoped client configuration

An operator supplies an external Secret with exactly the selected
`RCLONE_CONFIG_BASE64` key. The component projects it read-only as
`/run/plugin-backup-config/rclone.conf.b64`. Base64 is **credential material, not
encryption**. Never put the encoded value, underlying INI, share token/password or
Secret contents in public Git, images, commands, chat or logs.

Installations that merge an operator-populated env file can explicitly select
`.k8s/maintenance/plugin-backup-upload-credentials` as a separate input option.
It declares only an empty `openlap-plugin-backup-upload` Secret, with no default
values or workloads. Merge the private `openlap-plugin-backup-upload.env` through
a same-name Secret generator, then point the Job's config volume at that logical
Secret name. Verify generated name references with synthetic inputs. The uploader
does not select this option automatically; installations using an existing
external Secret can keep that workflow. Remove the temporary input resource and
generator with the uploader cleanup, retaining the protected backup outputs.

Prepare the single-line value privately using the installation's secure Secret
handoff. For deployments that use an operator-populated env file, its single key
is `RCLONE_CONFIG_BASE64`; the file name follows the installation's Secret-name
convention. A local encoding step can redirect directly into a fresh private file:

```sh
umask 077
set -C
printf 'RCLONE_CONFIG_BASE64=' > /private/operator/NEW-client.env
base64 < /private/operator/rclone.conf | tr -d '\r\n' >> /private/operator/NEW-client.env
printf '\n' >> /private/operator/NEW-client.env
```

Do not print or paste the result. The provider remains configured entirely in
that private INI. Require independently verified folder-scoped create/list/readback
access or a backup-only account; do not place a full-account credential in the
cluster. Upload-only access cannot verify existence or download/readback. Before
real data, verify the actual service/client combination with synthetic listing,
upload and full readback, including denied access with absent/wrong credentials.
Do not assume an app password or share mode provides the required scope.

Only after explicit `--upload-report`, the nonroot shell validates the fixed key
as a readable regular file within its projected volume. It rejects encoded input
over 128 KiB, decodes with the native base64 client, rejects empty/decoded input
over 64 KiB, and compares a canonical re-encoding to reject ignored garbage or
noncanonical input. The new scratch directory/file are UID 1000 mode 0700/0600.
Python never reads configuration bytes; rclone receives only the staged path.
No private age identity is mounted or accepted. Configuration scratch is ephemeral
and disappears with the Pod; remove/revoke the temporary Secret separately.

## Configure and run one reviewed operation

Replace the fail-closed argument array with one explicit action, for example:

```yaml
args:
- --upload-report
- --checkpoint
- /checkpoint/REVIEWED-checkpoint
- --checkpoint-report-sha256
- TRUSTED_ORIGINAL_REPORT_SHA256
- --source
- artifacts=/sources/REVIEWED-artifacts
- --recipient
- age1REVIEWED_PUBLIC_RECIPIENT
- --remote
- backup:REVIEWED-directory
- --output
- /outputs/NEW-release
```

Replace placeholders with reviewed inputs. Checkpoint/source paths are confined
to their corresponding read-only mounts; new outputs must be below `/outputs`.
The public recipient is not a private identity. The core CLI's byte/entry/runtime
limits still apply; the Job has a finite deadline, no retry and no TTL. Do not
configure a CLI runtime longer than its reviewed Job deadline.

The default NetworkPolicy denies all ingress/egress. Review an operator override
for cluster DNS and the required HTTPS destination only. Standard NetworkPolicy
does not identify arbitrary Internet host names; use reviewed IP/CNI/proxy controls
appropriate to the installation. An unrestricted port-443 rule is not destination
scoping. No MongoDB, storage-admin or Kubernetes API access is needed.

## Accept the typed receipt report

After the core CLI returns zero and its protected receipt passes strict schema,
original-report-hash and canonical-byte checks, the uploader emits one report of
less than 4 KiB between:

```text
OPENLAP-UPLOAD-RECEIPT-V1
{"receipt":{...typed upload receipt...},"receiptSha256":"...","schemaVersion":1}
OPENLAP-UPLOAD-RECEIPT-END-V1
```

The illustrated middle line is a placeholder, not an importable report. Actual
reports contain only the defined upload status, release/object name, ciphertext/
tar/manifest identities and sizes, original checkpoint-report hash and fixed scope.
They never contain an archive, catalog, source file contents or client config.
The wrapper rejects unknown fields and arbitrary strings before reporting.

Accept an operation only when **both** conditions hold:

1. Independently observe terminal `JobSucceeded` for the exact reviewed Job UID,
   source/image identity and log stream, using authorized operational access.
2. Validate one complete bounded frame, its exact typed schema/canonical encoding,
   receipt SHA-256 and independently retained original checkpoint-report hash.

A footer or healthy application alone is insufficient. A late stdout write/flush
failure exits nonzero even if a complete-looking frame became visible. In that
case the accurate core ciphertext/receipt may already exist on the protected
output claim: this is an outer report failure, distinct from the core CLI's
failure-before-receipt behavior. Retain outputs for review; do not infer terminal
success or automatically re-upload/reuse that directory.

## Reconstruct the local receipt and pull separately

After independently checking terminal Job success and trusted log provenance,
save **only the three canonical report lines** to a private local file. No binary
or plaintext backup bytes pass through logs. Import the metadata locally:

```sh
python3 -B openlap-analyticsframework/scripts/plugin-backup-upload.py \
  --import-report /protected/REVIEWED-upload-report.txt \
  --checkpoint-report-sha256 TRUSTED_ORIGINAL_REPORT_SHA256 \
  --output /protected/NEW-upload-receipt.json
```

The importer needs no client configuration or network. It checks exact framing,
schema/hash/context and exclusively publishes the original canonical receipt as
mode 0600 under a private existing parent. It does **not** authenticate the log
source or attest Job state. Keep that independent operational evidence with the
receipt. Use its reported receipt hash and original checkpoint-report hash for
the existing local `pull`, keeping the age private identity solely on the operator
host. A verified local pull remains separate from
[restoring the retrieved archive](./plugin-release-checkpoint.md).

After a terminal result, remove the temporary Job and its operation policy, then
remove/revoke the temporary client Secret through the operator process. Preserve
input/output PVCs, original checkpoint/source data, protected receipts, remote
ciphertext and the separately retained local recovery copy. No automatic backup
deletion, rotation, PVC creation or ownership repair is installed.

## Local verification

```sh
python3 -B -m unittest discover -s tests -p test_plugin_backup_upload.py
python3 -B tests/verify_plugin_backup_upload_image.py --image LOCAL_SHA256_IMAGE_ID
```

The exact-image verifier uses allowlisted synthetic read-only mounts, a projected
base64 key, a disposable local rclone alias, UID 1000, a read-only root and no
network. No provider account, operator config/identity or browser profile is used.
# Fresh capture compositions

Two optional public compositions reuse the checkpoint, snapshot and native
uploader runtimes. Neither is selected by the application base.

- `.k8s/maintenance/plugin-recurring-backup` is a **suspended** nightly CronJob,
  fixed to the qualified online replica-set capture mode. Each run captures new
  source data, independently replays/indexes its archive, exports the immutable
  object cut and encrypts/uploads/readbacks that same release. It does not upload
  a previously retained checkpoint. `concurrencyPolicy: Forbid`,
  `restartPolicy: Never` and `backoffLimit: 1` bound overlap/retries. A failed
  attempt gets a new Pod UID and emptyDir; all capture phases run again.
- `.k8s/maintenance/plugin-frozen-backup` is a supervised one-time Job. It uses
  the existing frozen primary-database contracts and emits the existing
  `OPENLAP-UPLOAD-RECEIPT-V1` frame. An actual externally enforced writer freeze
  and its separately verified evidence identifier are mandatory. Defaults are
  unconfigured, with no source, destination approval or freeze evidence. The
  Job does not pause writers or manufacture evidence. It has no retries.

The scope is the production **primary MongoDB instance and plugin S3 objects**.
The separate LearningLocker/LRS database is outside these compositions. A
single-node replica set enables the qualified online oplog procedure; it does
not add storage redundancy or high availability.

Both options execute `capture`, `index` and `export` init containers followed by
the `uploader` container. Source URI/replica-set inputs belong only to capture;
index receives no source selectors or credentials; export receives only the
ordinary S3 client; uploader receives only the scoped native backup profile and
public age recipient. No root S3 identity, encryption private key, Kubernetes
API identity, Pod exec grant or retained PVC is mounted.

Each Pod creates `run-POD_UID` exclusively and private subdirectories beneath a
fresh emptyDir. Later phases mount completed inputs read-only and their separate
output subdirectory writable. `fsGroup: 1000` is restricted to these fresh
emptyDir/Secret volumes; it must never be applied to retained provider, database
or backup data. Private UID1000 directories permit mode 0700 or inherited 02700
with no group/other access. Files remain owner-only, single-link 0600. No stage
adopts previous output or repairs retained ownership.

Nightly capture/upload runs in the cluster independently of the operator's Mac.
Independent off-node recovery remains a separate gate. The optional host
collector/check requires an awake, logged-in Mac, available Docker and a valid
existing Argo CD session. Its disabled templates do not establish active
independent recovery automation. It fails closed on missing/stale evidence or
authentication failure, and must not replace trusted original hashes with a
mutable `latest.json` from the same upload account.

## Activation and instance image selection

Before selecting an option, qualify its exact runtime images and whole
composition on isolated storage. Configure one reviewed source URI with the
correct contract: frozen capture requires the explicit selected database path;
online capture requires the empty path and explicit replica-set identity.
Neither wrapper silently converts one URI contract into the other. Enforce
physical deletion disabled across all writers before online object export.

Supply `BACKUP_DESTINATION_APPROVED=true` and the approved UTC
`BACKUP_DESTINATION_VALID_UNTIL` only after verifying recurring-use permission,
account scope, quota and actual access. The default recurring validity margin is
seven days; the supervised one-time default is one hour. These are activation
checks, not proof that a provider will honor credentials until that time. Native
authenticated upload and readback remain mandatory. An expiring upload share
must not be treated as an ongoing backup destination. Operator-owned credential
preparation remains a separate private handoff; never put values in an overlay
literal, command argument, public source or operational record.

Keep a running provider's existing qualified image when only introducing the
new export tool. A global Kustomize `images` rule for the provider repository
also rewrites export Job/CronJob references, even when those explicitly name a
new digest. Replace that instance-wide rule with a targeted image patch for the
existing storage Deployment, preserving its current Pod template. Pin the export
init container separately to its newly qualified helper image. Compare the
synthetic full composition to prove the serving provider, PVC identity and
unrelated application settings remain unchanged. Do not render real Secret
values for this check.

The public NetworkPolicies deny all ingress/egress. Instance overrides must
allow only the reviewed primary MongoDB, S3 Service, necessary DNS and approved
off-node HTTPS endpoint. The serving S3 ingress policy needs the specific backup
Pod selector as well as its existing backend selector. Establish these rules
before starting a supervised Job or unsuspending the CronJob. A backup profile
or unauthenticated MongoDB network path may confer broader capability if
misused; deploying the qualified immutable programs and scoped policies is part
of the instance review.

## Default storage and runtime bounds

Defaults use a 256 MiB aggregate transport payload, at most 2,048 source
entries, a 16 MiB compressed database archive, 64 MiB expanded stream and 512 MiB
isolated replay disk budget. The source exporter receives a lower count/byte
ceiling derived from the actual archive/report/index sizes, reserving a complete
1 MiB snapshot manifest. It rejects an oversized complete cut **before** body
downloads; it never truncates a snapshot to make it fit.

The shared workspace peak includes original payload, tar, encrypted output and
encrypted readback, plus transport per-file/manifest/age overhead and auxiliary
metadata. For payload bound `P` and source-entry bound `F`, the checked byte
budget is:

```text
4*P + 3*((F+4)*2048 + 1 MiB) + 2*(4 MiB) + 4 MiB
```

The default is about 1,051 MiB, below the 1,280 MiB workspace. A separate
768 MiB scratch emptyDir covers replay disk, two archive copies and 32 MiB
auxiliary reserve; the default checked bound is 576 MiB. The Pod's effective
2,304 MiB ephemeral-storage limit covers both emptyDirs plus logs. Capacity
requests are not proof of free node storage: capture checks actual available
workspace space and the native runners check archive/replay space. Review all
limits together when changing a payload/file/archive/replay budget.

Online Job deadlines are one hour with at most one fresh-Pod retry; supervised
frozen Jobs are bounded to thirty minutes with no retry. Individual capture and
index calls retain their 540-second process limits, export is bounded to 1,200
seconds and native transfer to its configured timeout. A proposed ten-minute
maintenance window still requires qualification against the actual small
release profile; these maximum deadlines are not a completion-time promise.

Capture/index logs contain only their existing bounded native metadata frames;
export emits its native hash/count result. Online upload emits the new bounded
`OPENLAP-RECURRING-BACKUP-V1` record, binding Pod UID, original checkpoint/index/
snapshot hashes, conservative capture time and canonical upload receipt. It
explicitly reports `recoveryVerified: false`. Accept it only after the original
Pod/Job has terminal success and its ownership and qualified runtime identities
have been verified. Independent native retrieval, full replay/index comparison
and fresh S3 cold restore must then pass before claiming recovery acceptance.
