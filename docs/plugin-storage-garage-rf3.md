# Optional fresh Garage RF3 storage

`.k8s/components/garage-rf3` is an opt-in, namespace-scoped storage option. It
installs three Garage 2.5.0 processes, retained per-pod claims, internal services,
NetworkPolicies, a two-ready-pod disruption budget and a finite bootstrap Job. The application base does not select
it. Its image, action, credential references, StorageClass and required settings
are intentionally unconfigured. Selecting this option does not migrate plugins,
change backend configuration or establish production readiness.

This option creates a **new** RF3 installation. Never select edge RF1 claims,
metadata, credentials or cluster layout. Garage documents RF1 as test-only and
changing an existing replication factor as dangerous and unsupported. Use a
separate reviewed artifact import after the new installation passes acceptance.

## Gates before selecting an environment

- Confirm three eligible Linux amd64 workers with distinct, correct
  `kubernetes.io/hostname` labels, adequate schedulable resources and an understood
  physical/storage failure topology. Required pod anti-affinity leaves pods
  Pending rather than colocating them. Three pod names, a local Docker test or
  three virtual workers do not establish three independent physical failure
  domains. Do not invent geographic zones for workers at the same site.
- Select an **existing** StorageClass, three new dedicated claims and actual
  per-node usable space. The templates request 2 GiB as a placeholder; the
  configured equal `capacityBytes` must fit the smallest usable data allocation
  with room for metadata, snapshots and filesystem overhead. Requests and Garage
  layout capacities do not enforce filesystem quotas. Confirm filesystem,
  binding, fsGroup support and capacity monitoring. Claims retain on StatefulSet
  scale/delete; protect claims/PVs from environment-specific pruning and deletion.
- The runner writes only its owned `/data/garage` directory. A filesystem's
  `lost+found` is left untouched. Other unexpected root entries, unmarked old
  data, changed installation settings or missing/corrupt retained identity files
  fail closed. Pod fsGroup is suitable only for the new dedicated claims; it
  must not be used to repair ownership on retained backups or unrelated data.
- Confirm namespace resource permissions, image access, DNS and an enforcing
  CNI. NetworkPolicies are additive: other policies must not grant broader
  access. Establish policies before starting storage/bootstrap. The provided DNS
  rule assumes DNS pods in `kube-system`; review NodeLocal DNS or other layouts.
- Review internal transport trust. Garage's S3/admin endpoints here use internal
  HTTP and are not exposed by ingress/NodePort. NetworkPolicy does not encrypt
  traffic. If the environment requires TLS, supply a separately reviewed upstream
  TLS termination design before selecting this option.
- Retain independently recoverable MongoDB metadata, all required plugin objects,
  installation records and operator key recovery access. RF3 replication is not
  backup, retention or protection against authorized deletion/corruption. A full
  off-node recovery rehearsal remains a production gate.

## Build and required inputs

Build `openlap-analyticsframework/Dockerfile.garage-rf3` from the module directory.
It combines the pinned official Garage image with a pinned official Python base;
no package installation or external discovery happens at runtime. Use the
immutable image published through the `garage-rf3-*` workflow after its regressions
pass. Both the StatefulSet and each operation Job require that reviewed digest.
The reference publication and scheduling defaults target Linux amd64. The image
build verifies Garage's ELF architecture. A different architecture needs its own
exact-image regression/publication and a reviewed scheduling change.

Patch the optional component's `settings.json` through the installation's own
Kustomize inputs. Set every required field deliberately:

| Field | Contract |
| --- | --- |
| `installationId` | Fresh unique public identifier, 16–64 lowercase letters/digits/hyphens; retain it permanently |
| `statefulSetName`, `rpcServiceName`, `namespace` | Exact final rendered names/namespace, including any prefixes |
| `clusterDomain` | Actual Kubernetes service DNS suffix, normally `cluster.local` |
| `bucket`, `region` | Intended private bucket and matching S3 region |
| `capacityBytes` | Positive reviewed per-node data capacity, at least 1 MiB and at most 8 TiB |
| `zones` | Three actual logical failure-zone labels, in StatefulSet ordinal order; repeated labels are allowed |
| `expectedNodeIds` | Empty for the single fresh initialization; exactly three retained full IDs for normal operation |
| `expectedBucketId` | Empty for fresh initialization; exact original bucket ID from the trusted completed report for normal operation |

The configuration generator hashes content into its name. Peer pinning therefore
changes the StatefulSet pod template. The explicit `OnDelete` update strategy
requires the operator's controlled pod replacement described below; it never
relies on feature-dependent initial rolling-update readiness behavior.
The on-disk installation fingerprint excludes the two post-setup
identity pins `expectedNodeIds` and `expectedBucketId`; changing bucket, region, capacity, zones, namespace or naming
on retained data is not silently adopted.

An operator provisions separate Secrets outside application source and chat:

| Reference placeholder | Required keys |
| --- | --- |
| `configure-garage-rf3-node-secrets` | `rpc-secret` (64 lowercase hexadecimal characters), `admin-token` |
| `configure-garage-rf3-client-key` | `access-key-id`, `secret-access-key` |

Use fresh, strong operator-generated credentials. Tokens/secrets must be
16–512 printable non-space ASCII characters; access IDs must be 16–128 ASCII
letters/digits/underscore/dot/hyphen. The bootstrap imports the operator's existing
key; API responses stay in process. Backends receive only the
bucket key, not the admin token or RPC secret. The imported application key may
read/write the one private bucket, cannot create buckets and has no ownership
permission. Application-level deletion/retention guards remain separate.

Only the designated containers see their projected credential files. The server
copies its RPC/admin values into sealed anonymous Linux RAM files with mode 0600
and passes only the two inherited descriptor paths to Garage. No named credential
copy is written to a filesystem. Descriptor handles close when the processes exit.
It does not disable Garage's permission
check, pass secrets in argv or inherit ambient Garage credential overrides.
The bootstrap reads credentials in process, rejects redirects and prints neither
headers, response bodies, secret values nor raw errors. No service-account token,
Kubernetes client, Role, CRD, Consul or `[kubernetes_discovery]` is used.

## One fresh initialization, then pin identities

1. Configure the three fresh claims, settings, credential references and image.
   Set server args to `serve --config /config/settings.json --secrets /secrets`.
   Start all three processes with the policies in place. Parallel startup and
   the headless service's `publishNotReadyAddresses` permit initial peer access.
   Initial readiness intentionally remains false while peer IDs are unpinned.
2. Run one fresh Job with args
   `initialize --config /config/settings.json --secrets /secrets --output /outputs/initial`.
   Do not wait for initial StatefulSet readiness before creating this Job, and
   do not put it behind a health-gated later Argo wave. The bounded Job waits for
   the three local admin endpoints. Only one bootstrap writer may run.
3. The runner verifies local identities/hostnames/version, fresh version-0 layouts
   and absence of foreign membership. It records and frames a bounded
   `GARAGE_RF3_INSTALLATION_INTENT` with its SHA-256 **before any mutation**.
   This is preparation evidence, not successful setup. Keep its canonical JSON
   (including the final newline) and hash in a trusted operator record.
4. It connects the intended IDs, checks every node is still unconfigured, stages
   the exact roles on node zero and applies version 1 exactly once. Replicated
   bucket/key tables are unreadable before an RF3 layout; their errors are never
   interpreted as empty tables. After layout convergence it requires both tables
   empty, imports the preprovisioned key, creates the private bucket and verifies
   precise grants. It prints `GARAGE_RF3_CONFIGURATION_VERIFIED` only at the end.
5. Accept complete framed reports plus a successful terminal Job. Preserve the
   trusted intent and completed report, each with its hash, outside this pod before removing it: `/outputs` is a
   private ephemeral result, not a backup. Logs contain bounded installation
   metadata and hashes; review their audience and retention. No JAR/database
   bytes or credentials travel in logs.
6. Set `expectedNodeIds` to the three exact IDs from the retained intent, in
   ordinal order, and `expectedBucketId` to the exact bucket ID from the trusted
   completed report, retaining all other settings. Apply the new hashed
   configuration, then replace one exact StatefulSet pod at a time, starting with
   ordinal two. Wait for the old process to terminate and its replacement to
   become Ready with the original ID before replacing the next pod. Retain all
   PVCs. This is an explicit operator action: `OnDelete` never automatically
   restarts pods, and initial readiness must not be a prerequisite for starting
   this replacement sequence. Each replacement receives the other nodes' full IDs and stable
   DNS addresses in `bootstrap_peers`. Garage's saved peer list alone records IP
   addresses and does not suffice when every pod gets a new IP.
7. Use a **new** verification Job with args
   `verify --config /config/settings.json --secrets /secrets --output /outputs/verify --intent /inputs/intent.json --intent-sha256 TRUSTED_HASH`.
   Replace the read-only intent emptyDir with an operator-provided ConfigMap
   containing the exact trusted `intent.json`. A changed Job pod template is
   immutable: retain the result, then remove the completed Job or select a fresh
   name before changing its configuration/action. No Argo hook is required.
8. Verify full cold recovery after all three pod IPs change while PVCs and IDs
   remain intact; check reads and writes during one worker/storage-process loss,
   restoration of quorum and existing objects after restart. Only then connect
   reviewed migrated backends to the internal S3 service, label approved clients
   `openlap-plugin-storage-client: "true"`, and establish their matching egress.
   This component changes no backend by default.

Normal `verify` performs no writes. Repeating `initialize` with a trusted intent
also only verifies the already-complete installation; it does not apply a layout,
recreate missing storage or import keys. A separately selected `reconnect` action
may connect only the trusted existing IDs, then verifies without layout/storage
mutation. A completed Job never reruns itself.

All later image/configuration updates also require controlled one-at-a-time pod
replacement; a changed template alone does not perform it. Do not delete multiple
pods together during ordinary updates. The PDB constrains eviction, not direct
pod deletion, so the operator must enforce the sequence.

## Failure and recovery boundaries

On ambiguous/failed layout apply, stop and retain claims, identity files and the
prepared intent. Never blindly retry apply, delete layouts or reinitialize data.
Use trusted read-only verification to establish the outcome. A missing bucket,
key, identity, changed ID, foreign/draining member, staged change or different
configuration fails rather than repairing/adopting it. A bucket recreated under
the same alias has a different ID and is rejected even with identical grants. Partial initialization is
not automatically resumed. Review a fresh installation or a separate recovery
procedure; new claims must not reuse an uncertain previous installation ID.

Each server preserves its private/public Garage node key and a separate owned
public ID pin and private-key integrity hash (kept private, never reported).
Retained key metadata, bytes and public ID are checked before Garage starts,
then the admin self-ID is checked again. Ready checks require that same pinned
identity, exact layout/roles and at least two of the intended three nodes up.
Gateway health alone is insufficient. Replacing a lost worker/PVC/node identity,
changing membership, moving a namespace, rotating credentials or changing storage
capacity needs a separately reviewed procedure; no automatic membership repair,
format, adoption or claim deletion is implemented.

The default memory/resource limits are tested fixture bounds, not capacity proof
for an environment. Monitor actual data/metadata usage, snapshots, resync and
quorum. Confirm drain/disruption behavior before maintenance. The local three-node
Docker suite proves protocol and process-loss behavior on one host, not actual
Kubernetes scheduling, CNI enforcement, node-independent disks or geographic HA.

## Validation and primary sources

```sh
python3 -B -m unittest discover -s tests -p test_garage_rf3.py
docker pull amazon/aws-cli@sha256:bba262340b0bc7cbf3a8a48612531263b56f4b280c4f036a07816af1b271bda0
python3 -B tests/test_garage_rf3_containers.py
docker pull ghcr.io/yannh/kubeconform@sha256:85dbef6b4b312b99133decc9c6fc9495e9fc5f92293d4ff3b7e1b30f5611823c
python3 -B tests/validate_garage_rf3_manifests.py
```

The container fixtures generate disposable credentials, use an internal Docker
network, read no deployment configuration, and clean only their own resources.
Single-loss fixtures allow up to 90 seconds for observed failure detection, then
45 seconds per request. The suite establishes bounded convergence and success,
not uninterrupted latency or an availability SLO. Review the actual application's
timeouts, retries and measured failure behavior before production acceptance.
The manifest fixture uses synthetic inputs, explicitly disables kubeconfig access,
checks that adding the component leaves an existing deployment unchanged, and
validates strict Kubernetes 1.31 schemas. It requires kubectl, Ruby's standard
YAML/JSON libraries and the pinned validator image. Official schema downloads are
public; no cluster is contacted.

- [Pinned Garage 2.5 configuration and RF guidance](https://github.com/deuxfleurs-org/garage/blob/586726edb0170bb46f604e84fba09e5659610649/doc/book/reference-manual/configuration.md)
- [Pinned admin API schemas](https://github.com/deuxfleurs-org/garage/blob/586726edb0170bb46f604e84fba09e5659610649/src/api/admin/api.rs)
- [Pinned layout mutation guidance](https://github.com/deuxfleurs-org/garage/blob/586726edb0170bb46f604e84fba09e5659610649/doc/book/operations/layout.md)
- [Pinned identity, peer persistence and discovery](https://github.com/deuxfleurs-org/garage/blob/586726edb0170bb46f604e84fba09e5659610649/src/rpc/system.rs)
- [Kubernetes StatefulSet behavior](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)
- [Pinned Kubernetes 1.31 update controller](https://github.com/kubernetes/kubernetes/blob/v1.31.0/pkg/controller/statefulset/stateful_set_control.go#L609-L692)
- [Kubernetes required pod anti-affinity](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/)
