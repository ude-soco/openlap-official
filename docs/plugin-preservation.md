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

For each named pod, the client retrieves only its UID, node, container image,
readiness and restart count. There is no namespace-wide Pod list. A shell-builtin
inventory includes nested and hidden directories, rejects symlinks, limits depth,
and sends NUL-delimited filenames without evaluating them as commands.

Each JAR is copied and hashed locally. A second complete read verifies that the
source still has the same bytes and size. Directory inventories are compared
again. The database is streamed into a gzip archive and its complete compressed
stream is checked. Finally, source pod identities, images and restart counts must
match the initial snapshot before `preservation.json` is atomically published.

Directories are private (0700), files are private (0600), and existing destinations
or partial files are never overwritten. Failure retains partial data but publishes
no successful inventory. Read the manifest only as evidence of a completed run;
the presence of individual copied files alone is insufficient.

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
source changes, restart detection, archive truncation, size limits, exclusive
publication, binary streaming, redacted errors and actual named-Pod client reads.
Container-level verification should also use the intended legacy base image and
the maintenance image's pinned client. An exact released image may require the
operator's registry access; a base-image reproduction does not prove the underlying
error from a live run whose raw diagnostic was not retained.
