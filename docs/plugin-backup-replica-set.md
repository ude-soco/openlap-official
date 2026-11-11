# Optional replica-set prerequisite for online backups

`.k8s/components/plugin-backup-replica-set` is an **unselected** Kustomize
component for the existing primary OpenLAP MongoDB 4.4 Deployment. It supplies
the single-node replica-set prerequisite for oplog-based backup. It does not
capture backups, add a second data copy, provide failover or change any live
installation by default.

Selecting it changes the MongoDB Pod template and restarts the database. Prepare
a preserved, independently verified backup and review a maintenance window before
changing an installation. Keep the same Deployment, Service, PVC, database path,
MongoDB image/version, resources, environment and credential references. Do not
delete or replace the existing claim, change its ownership, or upgrade MongoDB
as part of this prerequisite.

## Supported source and explicit inputs

This option supports the upstream primary MongoDB container as its existing
single replica with `Recreate`, port 27017, WiredTiger, server version 4.4.x and
FCV 4.4. The source must already start normally without an outstanding upgrade,
downgrade or custom image initialization. Its administrative commands must be
available on loopback without credentials. Authenticated deployments require a
separately reviewed initialization/authentication design; this option creates no
users, roles, credentials or authentication exceptions.

Create the input ConfigMap through the installation's generator, and select the
component at the same overlay level:

```yaml
namespace: openlap-demo
namePrefix: demo-
resources:
- https://github.com/ude-soco/openlap-official.git//.k8s/base?ref=REVIEWED_COMMIT
components:
- https://github.com/ude-soco/openlap-official.git//.k8s/components/plugin-backup-replica-set?ref=REVIEWED_COMMIT
configMapGenerator:
- name: openlap-plugin-backup-replica-set
  literals:
  - replicaSetName=openlap-backup
  - advertisedHost=demo-openlap-official-openlap-analyticsframework-mongo.openlap-demo.svc.cluster.local:27017
  - oplogSizeMiB=16
```

This is the configuration shape; supply the remaining application settings and
reviewed source revisions for the installation. The component merges its scripts
into the operator-created ConfigMap. Without that explicit input generator the
render fails, rather than choosing a replica-set name or host automatically.

The advertised address must be this installation's stable MongoDB Service DNS
name and must resolve to the same MongoDB process from the database Pod and every
application/backup client. Do not use a Pod IP, loopback address, transient Pod
hostname or another installation's Service. Preserve the same set name and
advertised host across subsequent restarts.

`oplogSizeMiB` is an explicit startup budget between 16 and 1024 MiB. **16 MiB is
the disposable test/example value, not a production sizing recommendation.** Size
the oplog for peak write volume and the longest dump/replay window, and review
actual node capacity. The component does not resize a PVC or an existing oplog.
It rejects an existing oplog whose configured maximum differs from the reviewed
input. A local-path PVC request does not enforce a physical disk quota, and an
oplog's configured size is not an unconditional disk-use ceiling. Online capture
must independently reject an overrun or missing oplog interval.

## Lifecycle and readiness

The same MongoDB container receives `--replSet` and `--oplogSize`; existing
arguments remain in order. A bounded `postStart` script polls loopback, checks the
server/FCV/startup settings and reads the replica-set configuration. It initializes
only an explicitly `NotYetInitialized` server, after proving that the advertised
Service reaches this same process. A racing `AlreadyInitialized` response is
accepted only after verifying the resulting configuration.

An existing configuration must match the one-member set, host, voting/election
roles and reviewed default member/settings attributes exactly. Repeated startup
verifies it without rewriting its durable set identity or configuration version.
Wrong set names, hosts, non-default attributes, additional members and mismatched
oplog budgets fail closed. There is no `rs.reconfig`, automatic member removal,
oplog resize, user creation or filesystem repair.

The existing Service receives [`publishNotReadyAddresses: true`](https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/). This lets its
stable advertised address reach the starting Pod before readiness succeeds,
avoiding a Service-endpoint/initialization deadlock. Service routing can therefore
reach MongoDB while it is still becoming primary; include this interval in the
maintenance and client-retry plan. Required network policy/CNI routing must permit
the Pod to reach its own Service on TCP27017. The readiness probe only verifies
the exact configuration, oplog budget and writable primary; it never initializes
or reconfigures a server.

This lifecycle works without Argo CD and needs no PostSync Job, sync wave,
Kubernetes API identity or terminal access. Apply the normal supported manifests;
the bounded hook waits for the database and its self-service route. A failure
leaves the Pod unready and emits a fixed status without raw MongoDB output.

Removing the component is not a database rollback procedure: replica-set metadata
persists on the claim. Use the installation's reviewed maintenance/recovery
procedure instead of deleting metadata or forcing a reconfiguration.

## Local qualification

```sh
node tests/test_plugin_replica_set_configuration.js
python3 -m pip install PyYAML==6.0.3
python3 -B tests/validate_plugin_replica_set_manifests.py
python3 -B tests/verify_plugin_replica_set_containers.py
```

The manifest fixture uses only the public base and synthetic settings/credential
references. It compares selected and unselected compositions to prove existing
image, arguments, environment, resources, data mounts, claim and Service identity
are preserved. The Docker fixture uses uniquely labeled disposable local volumes
and the pinned official 4.4.30 image. It converts an existing standalone volume,
checks data/index preservation and concurrent journaled majority writes, repeats
initialization, restarts with the same volume, and rejects wrong set/host/budget,
wrong advertised process, non-default and multi-member configurations.

Docker DNS remains available while a container is unhealthy; the local test
combines that property with a synthetic assertion of Kubernetes'
`publishNotReadyAddresses` contract. It does not claim to have exercised a real
Kubernetes endpoint controller or the live installation's network policies.

Primary references: [MongoDB oplog](https://www.mongodb.com/docs/manual/core/replica-set-oplog/),
[Kubernetes lifecycle hooks](https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/).
