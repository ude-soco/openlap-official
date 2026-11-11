# Preserve plugins before replacing a backend

OpenLAP's local plugin JARs may include uploads that exist only in a running
backend's filesystem. Before an upgrade or S3 migration, preserve every backend
replica and the primary database. Keep the old pods running until the copies
have been verified and a restore has been rehearsed.

The reusable tool lives in
`.k8s/maintenance/plugin-preservation/capture.py`. It does not start OpenLAP,
change the plugin catalog, replace pods, or select an image for deployment.
It requires Python 3.9+ and a Kubernetes client. Backend containers need only
`/bin/sh` and `cat`; `find`, `tar`, Python and remote checksum utilities are
unnecessary. The database container needs `mongodump` and access to the primary
database. Never place credentials in command arguments or this repository.

## Operator CLI

Use one explicitly selected context or kubeconfig path. Select the namespace,
every backend pod, database pod, expected backend digest and database explicitly.
Use a new directory outside any Git checkout, on protected storage:

```sh
python3 .k8s/maintenance/plugin-preservation/capture.py \
  --context APPROVED_CONTEXT \
  --namespace application-namespace \
  --backend-pod backend-replica-a \
  --backend-pod backend-replica-b \
  --database-pod primary-database-pod \
  --database DATABASE_NAME \
  --expected-backend-digest sha256:REVIEWED_IMAGE_DIGEST \
  --output /protected-backups/NEW_CHECKPOINT
```

Alternatively pass `--kubeconfig APPROVED_PATH` instead of `--context`. The tool
does not enumerate configurations or print credential contents. Container names
default to `web` and `mongo`; the default JAR root is `/opt/app/data/jars`.
Explicit flags support other supported installations.

### Check client/server compatibility first

Before authorizing source Pod access, run a metadata-only check with an explicit
connection. It needs no namespace, Pod names, database, checkpoint or output path:

```sh
python3 .k8s/maintenance/plugin-preservation/capture.py \
  --context APPROVED_CONTEXT --compatibility-only
```

The command runs only `kubectl version -o json`, with a 25-second API timeout,
35-second process limit and 16 KiB response limit. It prints one canonical JSON
object containing `schemaVersion`, `clientVersion`, `serverVersion` and
`supportedMinorSkew`. Only validated version strings are printed; other client
or server metadata and raw errors are withheld. Exit 0 means the observed versions
share a major version and differ by at most one minor version. Valid unsupported
versions produce `supportedMinorSkew: false` and exit 1; missing or malformed
versions, request errors and output failures also exit 1. Require valid complete
JSON **and** successful process/Job completion.

This follows the [Kubernetes kubectl skew policy](https://kubernetes.io/releases/version-skew-policy/#kubectl).
It does not prove source permissions, Pod readiness, release lifecycle/security
support or database compatibility. One load-balanced API response does not attest
every API server in a mixed-version control plane; operators must establish that
the client is within policy for all servers it can reach. The pinned client is
1.35.10, so its observed skew range is 1.34–1.36. There is no automatic
client-version selection or unreviewed download. A different client requires
reviewed version/checksum pins and rerunning the protocol tests.

The exact client pins were resolved on 2026-11-10 from the official
[`stable-1.35.txt`](https://dl.k8s.io/release/stable-1.35.txt) release pointer.
Runtime downloads use only `v1.35.10`, never that floating pointer:

| Linux architecture | Official SHA-256 |
| --- | --- |
| amd64 | [`c49a28f1f4efc4d475ed05f47f2ce8e563bf7bef69ed77fe1b924ea6d83b6327`](https://dl.k8s.io/release/v1.35.10/bin/linux/amd64/kubectl.sha256) |
| arm64 | [`283f1be6a46b3695b625e25030106b8ffe18bd0d3a900f5b65c259ca407f04f5`](https://dl.k8s.io/release/v1.35.10/bin/linux/arm64/kubectl.sha256) |

A configured capture repeats the same gate before its first Pod GET, exec or
backup directory creation. It records the observed versions in the completed
manifest. Invalid or unsupported versions stop capture. Missing capture inputs
still fail before any API request.

For an in-cluster check, the separate opt-in Kustomization is
`.k8s/maintenance/plugin-preservation-compatibility`. It reuses the same code and
pinned client preparation, but has **no PVC, fsGroup, Pod Role/Binding or database
inputs**. Its ServiceAccount has only the cluster's existing default discovery
access; a denied `/version` request fails closed without adding permissions.
Only its main container receives the short-lived projected identity. Its temporary
client configuration contains token/CA file paths, never token values. The Job
has a 180-second deadline and no retries or TTL. Review API/download egress and DNS
selectors for the installation; allowed HTTPS ports do not restrict destination
hosts. Keep the ConfigMap, ServiceAccount and network policy available before the
Job, verify the terminal result, then remove all four resources. Neither component
is included in the application base.
Run compatibility and capture sequentially, cleaning up the compatibility
resources before configuring capture. Both reuse the same generated code
ConfigMap identity; do not combine the two sibling Kustomizations in one build
or remove that ConfigMap while a capture still needs it.

Do not turn the capture Job into a version probe by changing its arguments: its
backup mount and fsGroup can affect retained volume permissions before Python
starts. The compatibility Job uses only temporary volumes, code and its identity.
The original CLI paths remain thin launchers; the shared implementation and
ConfigMap generator live in `.k8s/maintenance/plugin-preservation-code`.

For each named pod, the client retrieves only its UID, node, container image,
readiness and restart count. There is no namespace-wide Pod list. A shell-builtin
inventory includes nested and hidden directories, rejects symlinks, limits depth,
and requires read and search permission on every traversed directory. It sends
NUL-delimited filenames without evaluating them as commands. Every inventory
starts with `OPENLAP-JAR-INVENTORY-V1` and ends with
`OPENLAP-JAR-INVENTORY-END-V1`, each followed by NUL. Filename records between
these markers start with `./`, so they cannot be mistaken for framing. Missing or
truncated framing is rejected, and every shell output write and recursive walk
must succeed before the completion marker is sent.

Each JAR is copied and hashed locally. A second complete read verifies that the
source still has the same bytes and size. Directory inventories are compared
again. The database is streamed into a gzip archive and its complete compressed
stream is checked. Finally, source pod identities, images and restart counts must
match the initial snapshot before a report is atomically published.

An inspected directory may legitimately be empty, for example when a CI image
contains only tracked placeholder directories and JAR binaries are ignored by Git.
An empty inventory requires both framing records; no output is a failure.
Unreadable or unsearchable directories fail instead of appearing empty.
Empty roots do not prevent the database or another replica's files from being
backed up. Each source inventory and its JAR count is recorded. If any root is
empty, the tool publishes `capture-review.json` with `SOURCE_REVIEW_REQUIRED`,
returns exit code 2, and does **not** publish `preservation.json`. A Kubernetes Job
therefore reports failure even though the database archive may be verified; read
the bounded log and retained report. This is a source/catalog review gate, not a
transport failure. Do not migrate until every catalog reference has a verified
source. The tool never assesses catalog coverage, even for non-empty roots.

Admin catalog counts describe MongoDB registrations, not filesystem availability
or successful class loading. Registered methods and libraries can remain visible
after their binaries become unavailable. An empty source report must therefore
be reconciled with the actual catalog, effective plugin directories, access
permissions and trusted binary sources. A dashboard count alone does not establish
source coverage. Docker builds deliberately exclude workstation JARs; the application
does not generate replacement binaries. Do not restore arbitrary local JARs or
rewrite registrations to make a migration check pass.

Directories are private (0700), files are private (0600), and existing destinations
or partial files are never overwritten. Failure retains partial data but publishes
no successful inventory. Read the manifest only as evidence of a completed run;
the presence of individual copied files alone is insufficient.
Final diagnostics must flush before publication. If removing the report's partial
link fails after publication, the newly completed report is rolled back and its
partial file remains available for review.

The total retained data limit is 1800 MiB, including the database archive. Each
JAR is limited to 256 MiB. These conservative bounds fit the optional 2 GiB volume;
larger installations require a reviewed storage and limit change.

## Optional Kubernetes operation

The maintenance Kustomization is opt-in and is not referenced by the application
base. An operator overlay must set its namespace, storage class and exact source
Pod names in the Role. The Job requires these inputs:

| Environment variable | Value |
| --- | --- |
| `BACKEND_PODS` | Comma-separated, reviewed backend pod names |
| `DATABASE_POD` | Reviewed primary database pod name |
| `DATABASE_NAME` | Explicit primary database name |
| `EXPECTED_BACKEND_DIGEST` | Reviewed `sha256:…` backend image identity |
| `CHECKPOINT_ID` | New checkpoint directory name under `/backup` |

Provision a **fresh, dedicated preservation claim** for this component. Never
retarget its backup mount at an existing application volume or historical backup
PVC. The Job sets `fsGroup: 1000` with `fsGroupChangePolicy: OnRootMismatch`; this
can still change volume ownership/permissions when the root does not match and is
not permission repair for retained backups. Keep the claim dedicated after its
first use, retain it during cleanup, and use a fresh checkpoint directory for any
later reviewed run. Verify access before a later run rather than changing retained
volume permissions to make the Job succeed.

Empty inputs fail before API requests or backup writes. The Role's placeholder
names must be replaced with exactly the same targets as the Job. Never remove
`resourceNames` or replace it with an empty list: that would allow every Pod name.
Pod GET and container-exec GET/create are the only grants. Exec can run arbitrary
commands inside the selected containers; operators must review this capability
and the checkpoint destination before enabling it.

The Job runs for at most 600 seconds with no retries, as an unprivileged user with
a read-only root. Its init container downloads and verifies a pinned official
client without receiving an API identity. Only the capture container receives a
short-lived projected token; client configuration contains file paths, not token
values. No existing application or storage credentials are mounted. HTTPS/API
egress is port-limited (443/6443), with cluster DNS; there is no ingress or Service.
Operators must confirm these endpoints and network constraints for their cluster.

The base manifests work without Argo CD. Argo-specific sequencing and deletion
protection belong in the operator overlay. With delayed volume binding, put the
PVC in the same sync wave as its consumer Job. The code ConfigMap, identity,
Role/Binding and network policy must be available before capture starts. Waiting
for a delayed-binding PVC in an earlier wave prevents the Job from being created.

Apply the reviewed, scoped operation through the installation's normal operational
process. Verify volume binding, Job completion and the bounded success log. Remove
the Job and its Pod, RoleBinding, Role, ServiceAccount, code ConfigMap and network
policy immediately afterward, including on failure. Retain the PVC and all data.
A completed Job or its deadline does not revoke its RoleBinding. No Job TTL is
set, avoiding automatic recreation by a desired-state controller.

## Read completed preservation metadata without backup content

After capture is terminal and its temporary access is removed, the separate
`.k8s/maintenance/plugin-preservation-report` component can validate the completed
manifest on the retained claim. It never opens the database archive or JAR files,
contacts a database, or receives a Kubernetes API identity. It emits only bounded
manifest metadata, including the manifest SHA-256/size, recorded source identities,
JAR counts/file metadata and recorded database archive SHA-256/size.

The standalone reader also works outside Kubernetes:

```sh
python3 -B .k8s/maintenance/plugin-preservation-report/report.py \
  --backup-root /protected-backups --checkpoint-id REVIEWED_CHECKPOINT
```

Use the **original physical backup-root path** used by capture. Manifest paths
must match that root and checkpoint exactly; a relocated copy is not accepted.
Every path ancestor must be physical, not a symlink. The checkpoint directory
must be owned by the current UID and mode 0700 or 0500, optionally with SGID
(02700 or 02500). Linux propagates SGID from an fsGroup-prepared preservation
claim to a newly created private checkpoint directory; it grants no group/other
access. Setuid, sticky and all group/other permissions remain unsupported. The completed report must
be a regular single-link file owned by that UID and mode 0600 or 0400. Exactly one
of `preservation.json` or `capture-review.json` must exist, with no adjacent partial
report. Ambiguous, partial, changing, malformed or oversized input fails closed.
The reader checks the producer's exact current schema, types, paths, hashes,
source/file counts and status relationships before printing any report.

For Kubernetes, configure `CHECKPOINT_ID` explicitly and replace
`configure-reviewed-preservation-volume` with the **existing, already-owned**
preservation claim. The component creates no PVC and mounts the claim read-only
at `/backup`. Verify UID/GID 1000 can read/search the checkpoint beforehand; do
not add `fsGroup`, a root initializer, ownership repair or another writable mount
of the same claim. The component has a separate generated code ConfigMap, no
ServiceAccount/Role/Binding/Secret, no token, a read-only root, no capabilities,
deny-all ingress/egress, a 120-second deadline and no retries or TTL. Keep its code
and policy available before the Job. It is not selected by the application base.

The report is one canonical JSON line framed by
`OPENLAP-PRESERVATION-METADATA-V1` and
`OPENLAP-PRESERVATION-METADATA-END-V1`, each on its own line. Input is limited to
1 MiB and framed output to 64 KiB; excessive output fails instead of truncating.
Accept it only with independently observed terminal Job success for the exact
reviewed Job/code/image/claim and a complete valid frame. Output write or flush
failure exits nonzero even if a complete-looking footer reached the log.

Reader success means `PRESERVATION_MANIFEST_METADATA_VALIDATED`. A valid
`SOURCE_REVIEW_REQUIRED` capture report also makes the **reader** exit zero; it
does not make that capture migration-ready. All four flags remain explicitly
false: `backupBytesVerified`, `catalogCoverageVerified`, `consistencyVerified`
and `restoreVerified`. Archive/JAR hashes and sizes are **recorded manifest
values**, not new byte verification. The producer report does not record the
database name; retain the separately reviewed capture inputs. Writer pause,
catalog/source reconciliation, off-node custody and isolated restore are still
separate requirements. Remove the reader Job/Pod, code ConfigMap and policy after
any terminal result, retaining the claim and every report/data file.

Credential-free verification:

```sh
python3 -B -m unittest discover -s tests -p test_plugin_preservation_report.py
python3 -B tests/verify_plugin_preservation_report_containers.py
```

The container verifier copies only allowlisted public sources and synthetic
fixtures. It runs the exact pinned image as UID 1000 with a read-only root and no
network/capabilities, then reads a genuinely read-only synthetic volume created
by the real capture producer below a private SGID parent. A scoped
fixture initializer prepares only that disposable volume's ownership; the reader
and installable component contain no initializer or ownership mutation. Producer
fixtures create only synthetic JAR/gzip data; the reader still opens only report
metadata. Optional `--schema-validator PATH`
runs a trusted local kubeconform against the public render using strict Kubernetes
1.35 schemas; the verifier never loads a live configuration or renders an operator
overlay.

## Failure diagnosis and recovery

Errors identify the failed step: pod identity, JAR inventory, copy, source
verification or database backup. Fixed categories distinguish permission denial,
authentication, timeout, certificate checks, missing commands and unsafe sources.
Raw server/container output is withheld. Do not disable certificate checks, widen
permissions, replace source pods, or repeatedly launch diagnostic workloads in a
live installation. Reproduce a failure locally or obtain a sanitized operational
diagnostic before another reviewed run.

Use a new checkpoint and Job revision for a retry; keep the earlier partial data.
Never repurpose a previous successful checkpoint. An online capture establishes
transfer/source integrity; it is not a transactionally consistent database backup.
Before migration, pause catalog writes, take a consistent release checkpoint,
rehearse restoring the database and JARs, and retain an off-node backup. Cluster-local
storage alone does not protect against node loss.

## Local verification

```sh
python3 -B -m unittest discover -s tests -p test_plugin_preservation.py
python3 -B tests/verify_plugin_preservation_containers.py
```

The second command requires Docker and uses pinned official container images.
Only allowlisted code and synthetic files are mounted. The tests use synthetic
data and a loopback-only API fixture, never a live
configuration. They exercise shell-only inventories, symlink/path rejection,
non-root directory access failures, failed inventory writes, missing/truncated
framing, source changes, restart detection, archive truncation, size limits,
exclusive publication, post-link cleanup rollback, late diagnostic flush failures,
binary streaming, redacted errors and actual named-Pod client reads. Directory
permission fixtures require an unprivileged user and
are skipped when the local suite runs as root; the container checks use UID 1000.
Container-level verification should also use the intended legacy base image and
the maintenance image's pinned client. An exact released image may require the
operator's registry access; a base-image reproduction does not prove the underlying
error from a live run whose raw diagnostic was not retained.
If direct client downloads are unavailable inside Docker, pass
`--kubectl /protected-tools/OFFICIAL_LINUX_CLIENT` to the container verifier. It
checks the native architecture's existing reviewed SHA before staging that file,
rechecks it through the same installer inside the maintenance image, and runs the
maintenance suite with `--network=none` and `--pull=never`. The two pinned images
must already be available locally; the flag never selects or downloads a different
client version.
