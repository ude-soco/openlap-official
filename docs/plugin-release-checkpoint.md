# Plugin release database checkpoint

The opt-in `.k8s/maintenance/plugin-checkpoint` component preserves one explicit
primary database and rehearses restoration inside its own temporary storage.
It uses the official MongoDB 4.4.30 runtime and Database Tools 100.10.0, starts no
application server and needs no Kubernetes API access or Pod exec. The default
action fails before accessing a database. Select an immutable image published
through the `plugin-checkpoint-*` workflow, which tests the exact image against
25 disposable fixtures before publishing it without rebuilding.

## Operator prerequisites

1. Enforce and verify an actual writer pause. Scaling all old backend writers to
   zero through deployment configuration is one option; inspect live replicas
   and account for other writers and controllers. This stops the backend API.
   Keep old writers stopped through migration, then resume only compatible S3
   backends under the reviewed rollout plan. Restrict other plugin changes until
   acceptance ends. An evidence string does not enforce a freeze.
2. Retain the reviewed source bundle, private migration manifest, original
   inventory and application image pins with the checkpoint record. Determine
   the required S3 objects independently; this runner backs up MongoDB only.
3. Supply an existing protected claim with private writable access for UID/GID 1000
   and adequate actual space. The runner creates a fresh directory exclusively;
   it never repairs retained-volume ownership or permissions. Keep GitOps
   prune/delete protection in the environment overlay.
4. Configure one source URI/database and exact expected DNS host/port. Access
   needs reads, collection/index listing, `dbHash` and read-only FCV `getParameter`.
   An application read role can lack FCV access. Inject any credentials securely,
   outside source, logs and command arguments. Review DNS/Mongo-only egress and
   no ingress; on an unauthenticated server the network capability can permit
   writes even though the reviewed tool only reads the source.

## Explicit inputs and limits

| Input | Required value or default |
| --- | --- |
| Action | `--checkpoint` |
| `MONGODB_PRIMARY_URI` | One explicit `mongodb://HOST:PORT/DATABASE` source; supported TLS/auth options and securely injected credentials are optional |
| `OPENLAP_MONGODB_DB` | Explicit non-system database matching the URI |
| `CHECKPOINT_SOURCE_HOST` / `CHECKPOINT_SOURCE_PORT` | Exact source DNS host/port; no loopback, SRV or discovery |
| `CHECKPOINT_ID` | Fresh directory identifier; existing outputs are never reused |
| `CHECKPOINT_FREEZE_EVIDENCE` | Nonsecret reference to separately verified freeze evidence |
| `CHECKPOINT_OUTPUT_ROOT` | Existing `/outputs` mount by default |
| `CHECKPOINT_MAX_ARCHIVE_MIB` | `256`; compressed archive limit |
| `CHECKPOINT_MAX_EXPANDED_MIB` | `1024`; decompressed archive limit |
| `CHECKPOINT_MAX_RESTORE_MIB` | `1024`; local database disk limit |

Budgets accept 1–1024 MiB. The Job bounds scratch with `emptyDir` and container
ephemeral-storage, CPU and memory limits. The tool also checks actual free space;
a PVC request does not establish physical capacity. There is a 540-second image
deadline and 600-second Job deadline, no retries/TTL, no API token, no `fsGroup`,
UID/GID 1000, a read-only root and dropped capabilities. Database Tools receive
the URI through a mode 0600 temporary config, not argv.

## Verification and retained output

The tool compares source collection identities, counts, ordered BSON ID/content
hashes, indexes and options before and after the dump. `dbHash` briefly holds a
database read lock; the external writer pause remains mandatory. Unsupported
views, capped/system namespaces, missing `_id` indexes, unfinished index builds
and metadata outside the bounded format fail explicitly.

It validates the original full bounded gzip stream and SHA-256, then restores
that same archive into a new local database path at fixed loopback port 37017.
It attests the target's actual dbPath/bind/port/socket settings and child liveness
before restoring, compares every supported namespace and count/ID/content/index/
option hash, and stops the local server before publishing success.

Success produces only `CHECKPOINT_ID/database.archive.gz` and `checkpoint.json`,
both mode 0600 inside a mode 0700 directory. The bounded report prints collection
names, counts and hashes between `OPENLAP-CHECKPOINT-REPORT-V1` markers; review
that operational metadata's audience and retention. URI values, raw records and
client errors stay private. MongoDB MD5 values compare consistency; SHA-256
identifies the original compressed archive.

Failure retains partial output without a success report. Keep writers paused
until choosing a retry with a fresh identifier or aborting before migration and
restoring the previous backend replica count. Remove the temporary Job/policy
after any terminal result; retain the protected claim, archive and report.

This establishes a DB-only roundtrip in the tested runtime. Off-node retention,
replacement infrastructure, required S3 objects, image compatibility, application
acceptance and production availability remain separate release gates. An on-node
PVC alone does not satisfy the production backup gate.
