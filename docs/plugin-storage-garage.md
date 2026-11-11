# Optional single-node Garage storage

`.k8s/storage/plugin-garage` provides a Garage 2.5.0 StatefulSet, private S3 and
administration Services, NetworkPolicy, empty credential stubs and one explicit
5 GiB PVC. It is an optional provider, separate from Versity. It has no public
ingress, Kubernetes API identity or external discovery. Metadata and object data
share the claim. A single node remains a single failure domain; schedule and
verify backups outside that node before relying on it for durable service.

The provider retains the `openlap-plugin-storage*` resource contract. It runs as
UID/GID 1000, prepares bounded server credential files in RAM with mode 0600 and
starts Garage with loopback RPC and `--single-node`. The supplied filesystem group
is for a correctly provisioned claim. Do not use a deployment change as an
ownership repair for retained data or backup volumes.

The application operator supplies these private files next to their overlay:

| File | Required keys |
| --- | --- |
| `openlap-plugin-storage-server.env` | `GARAGE_RPC_SECRET`, `GARAGE_ADMIN_TOKEN`, `GARAGE_METRICS_TOKEN` |
| `openlap-plugin-storage-client.env` | `PLUGIN_STORAGE_S3_ACCESS_KEY`, `PLUGIN_STORAGE_S3_SECRET_KEY` |

Use a 64-character hexadecimal RPC secret, a Garage importable application key
(`GK` followed by 24 hexadecimal characters), and independent strong application,
administration and metrics secrets. Supply them through your operator's private
credential mechanism. Existing installations retain their existing files; this
component does not rotate credentials. Never render an overlay containing live
env files into logs or reviews.

An installation can select the provider independently of the operational Jobs:

```yaml
resources:
- https://github.com/ude-soco/openlap-official.git//.k8s/storage/plugin-garage?ref=REVIEWED_COMMIT
secretGenerator:
- name: openlap-plugin-storage-server
  behavior: merge
  envs: [openlap-plugin-storage-server.env]
- name: openlap-plugin-storage-client
  behavior: merge
  envs: [openlap-plugin-storage-client.env]
```

Choose the storage class, PVC size, resource budgets, namespace, name prefix and
lifecycle protection in the installation overlay. The reusable defaults contain
no Argo annotations. Preserve an existing claim's name, class, access mode and
size when moving only the configuration source; do not delete the claim.

## Explicit bootstrap and verification

`.k8s/maintenance/plugin-garage-bootstrap` is an optional, finite Job that imports
the operator's application key if absent, configures one bucket, disables website
access, denies bucket creation/ownership and verifies read/write access to that
bucket only. It never retrieves the secret half of an existing key. Configure
these values in a `configMapGenerator` named `openlap-plugin-storage` with
`behavior: merge`:

| Key | Meaning |
| --- | --- |
| `GARAGE_ADMIN_ENDPOINT` | Internal administration URL, including the installation prefix and port 3903 |
| `PLUGIN_STORAGE_S3_ENDPOINT` | Internal S3 URL on port 3900 |
| `PLUGIN_STORAGE_S3_BUCKET` | Installation's bucket name |
| `PLUGIN_STORAGE_S3_REGION` | `garage`, matching `garage.toml` |
| `PLUGIN_STORAGE_MAX_BYTES` | Optional positive bucket quota, default 1073741824 |
| `PLUGIN_STORAGE_MAX_OBJECTS` | Optional positive object quota, default 1000 |

Run the bootstrap only after the provider is ready, through your supported Job
runner. Select its NetworkPolicy alongside the Job. Argo installations may add
their own PostSync ordering and terminal-Job cleanup annotations in their overlay;
other installations need no Argo controller.

`.k8s/maintenance/plugin-garage-smoke` supplies two independent application
clients. They upload a fixed class-free JAR under
`_pilot/reusable-roundtrip-v1.jar`, verify its checksum, check anonymous denial and
denied bucket creation, and require the administration endpoint to be blocked by
NetworkPolicy. The probe does not execute plugin code. The bounded `_pilot/`
artifact remains as verification data.

Set `PLUGIN_STORAGE_PILOT_REQUIRE_EXISTING=true` after initial installation. Also
set `PLUGIN_STORAGE_PERSISTENCE_KEY` and `PLUGIN_STORAGE_PERSISTENCE_SHA256` to a
previously verified artifact. Every client verifies that prior artifact before
writing anything. The prior key must differ from the new probe key, so parallel
probes cannot conceal lost data by overwriting the recovery evidence. Leave the
old artifact intact when upgrading from a previous probe implementation.

## Moving a configuration source

An independently implemented reusable option can preserve resource identities
and effective Garage settings while changing ConfigMap contents and generated
names. In particular, the provider's configuration and credential-preparation
ConfigMaps are mounted through its Pod template. Changed hashes replace the
Garage Pod even when the same PVC is retained. Treat this as a controlled storage
restart and verify the old object before any new upload. A folder cleanup alone
does not prove that a running workload will stay unchanged.

Validate source changes with synthetic inputs:

```sh
python3 -m pip install PyYAML==6.0.3
python3 -B -m unittest discover -s tests -p test_plugin_garage_configuration.py
python3 -B tests/validate_plugin_garage_manifests.py
python3 -B tests/verify_plugin_garage_containers.py
```

The last command creates only uniquely named disposable local Docker volumes,
an internal network and synthetic keys, then removes them. It tests fresh and
repeated bootstrap, independent application clients, a cold server restart and
rejection of a wrong prior-artifact checksum. Docker does not enforce Kubernetes
NetworkPolicies; verify their administration-port isolation in the actual
installation's supported smoke procedure.

The [Garage administration API](https://garagehq.deuxfleurs.fr/api/garage-admin-v2.json)
defines the v2 bucket permissions and quotas used by the bootstrap.
