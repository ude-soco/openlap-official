# Framework naming migration

The maintained modules are `analyticsframework` and `indicatorframework`.
The former names were `openlap-analyticsframework` and
`openlap-indicatoreditor`. Repository and application names remain OpenLAP.

| Surface | Backend | Frontend |
| --- | --- | --- |
| Source directory / Compose service | `analyticsframework` | `indicatorframework` |
| Maven artifact / npm package | `analyticsframework` | `indicatorframework` |
| Packaged application | `analyticsframework.jar` | `dist/webapp` |
| Container repository | `ghcr.io/ude-soco/openlap-official-analyticsframework` | `ghcr.io/ude-soco/openlap-official-indicatorframework` |
| Base Deployment and Service | `openlap-official-analyticsframework-web` | `openlap-official-indicatorframework-web` |

An installation's own name prefix is added to these resource names. Pods inherit
their Deployment's name plus Kubernetes-generated suffixes. Existing routes,
database and collection names, document IDs, plugin classes and S3 object keys are
preserved throughout this migration.

## Current and historical references

`framework-rename-exceptions.json` records the reviewed exceptions. Run
`python3 -B tests/test_framework_rename_references.py` to check maintained paths
and frozen release/artifact records.

Historical Git paths are paired with fixed commits, blob IDs and checksums. Those
commits contain the original paths; changing the recorded path would invalidate
artifact qualification and recovery. Released image identities and backup receipts
also retain their original names. Current build contexts, commands and runtime JAR
paths use the new names.

Temporary compatibility is explicit:

- Official main builds publish the old mutable `:edge` aliases from the same
  qualified image as each canonical repository. Semver and `latest` aliases are
  not rewritten. Remove this step after all consumers use canonical repositories.
- `legacy-mongo-identity` retains the existing Mongo controller, selectors,
  Service/DNS and PVC during the stateless cutover.
- `backend-rename-network-compatibility` allows both backend component labels
  through the Garage policy during the overlap. Remove it after old application
  pods are gone.

## Existing local development

Run Maven from `analyticsframework` and npm from `indicatorframework`. Move local
plugin JARs into the renamed module's existing `jars` subdirectories and preserve
their recorded names and exact binaries. Git does not carry these ignored files.
Recorded relative plugin paths still resolve from the backend's working directory.
Move ignored local configuration, such as the frontend's `.env`, through a native
file move without displaying its values. Reinstall dependencies in the new module
directories when an existing checkout leaves ignored build files behind.

Host-run applications can continue using existing MongoDB instances. Renaming a
directory does not require creating a new database. Compose project names and
volume identities need an explicit choice: `OPENLAP_MONGO_VOLUME` selects an
existing external volume, and `analyticsframework/scripts/start-local-mongo.py`
checks for a conflicting running writer before startup. It never creates, copies
or deletes the selected volume or stops another project's container. Compose
starts or reconciles the selected project's Mongo service, including creating its
container when it is absent.

For existing data, stop its previous Mongo stack without `-v`, verify the selected
volume, then use the new startup helper. For a fresh development database, create
and select a separately named volume explicitly. The preflight narrows writer
conflicts; MongoDB's own data-directory lock remains the final race protection.

## Pin the existing installation before merging renamed manifests

Record the active base revision, image digests, resource names, replica-set
configuration, PVC/PV bindings, reclaim policy and actual capacity. Pin every
unversioned application base to that installation's current reviewed commit before
merging a rename. Keep existing production pins intact.

Retain data-bearing claims/PVs through the operational layer. For Argo CD, protect
claims from pruning and application deletion before resource identities change.
Rendering or inspecting an operational overlay may expose its Secrets; use public
synthetic fixtures for development checks and the supported scoped operational
interfaces for live verification.

## Stateless cutover

Qualify the new images locally and in CI, and verify pull access to the canonical
repositories. Pin the operational overlay to one reviewed application revision
and the exact qualified image digests. Update its image-updater configuration to
the canonical repositories.

Existing installations temporarily select these public components alongside the
renamed base, all at the same reviewed revision:

```yaml
resources:
- https://github.com/ude-soco/openlap-official.git//.k8s/base?ref=REVIEWED_COMMIT
components:
- https://github.com/ude-soco/openlap-official.git//.k8s/components/legacy-mongo-identity?ref=REVIEWED_COMMIT
- https://github.com/ude-soco/openlap-official.git//.k8s/components/backend-rename-network-compatibility?ref=REVIEWED_COMMIT
```

Update ingress, Services, replicas, ConfigMap/Secret identifiers and references,
network-policy selectors and operational patch targets together. Move existing
credential files through the operator's native private mechanism; their values
are not part of the application change or review output.

Use the operational layer's prune ordering to keep old stateless resources until
their replacements are healthy. Both new application Deployments have startup
and readiness checks. The backend check requires the public database-backed news
endpoint to serve successfully after initialization; the frontend checks nginx.

Before applying, prove the rendered resource inventory still contains exactly one
Mongo controller and the original claim, selectors and DNS. The compatibility
component changes no data, creates no second Mongo writer and does not modify an
existing replica-set member. Verify frontend/API health, plugin execution and
scheduled backup/recovery behavior after the cutover.

## Final Mongo identity and storage cutover

Removing the legacy Mongo component changes the Mongo controller, Service and
claim identities. Schedule a separate writer-pause maintenance window; do not
apply that removal directly to a live database.

Use the application's supported checkpoint and independent recovery tools to
capture a consistent Mongo/S3 backup and rehearse restoration. The explicit
[fresh-volume restore](plugin-mongo-restore.md) retains a verified frozen-v1
MongoDB 4.4 database on the new claim; ordinary rehearsal actions retain no
application database files. Confirm its single-database scope covers this
installation, and keep S3 recovery and writer enforcement as separate gates.
Prepare a new
correctly named claim with the installation's verified storage class and adequate
capacity, using the same qualified Mongo version. Restore into the new instance
with writers stopped and validate document IDs, counts, indexes, DBRefs and plugin
catalog/artifact coverage before application writers resume.

Switch the backend's Mongo DNS and backup/checkpoint settings together. Existing
replica-set membership records its advertised host: the initializer intentionally
rejects an unexplained host change. Use a freshly restored instance initialized
for the intended host, or a supported explicitly rehearsed member reconfiguration;
keep the replica-set name and existing database identities consistent.

Keep the old claim/PV intact until recovery acceptance. Never run two Mongo
processes against that volume. Before writes resume, rollback can return to the
retained original instance; after new writes, recovery/reconciliation is required
before returning to an older disk. Validate edge first, then repeat the qualified
procedure for production in its own approved window.

After both installations and scheduled recovery are accepted, remove temporary
DNS/network/image compatibility references. Historical records remain in the
exception manifest. Application migration behavior and tooling live in this
repository; operational overlays supply only instance configuration and pins.
