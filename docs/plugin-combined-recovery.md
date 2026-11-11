# Synthetic encrypted plugin recovery proof

The combined fixture uses generated records and class-free JARs only. It runs the
real checkpoint, verified artifact-index projection, logical object snapshot and
existing age/rclone transport tools. It records trusted report/index/manifest and
upload-receipt hashes before transport. No cloud account, deployed application,
operator configuration or production storage is accessed.

Both an empty registry and retained historical versions must complete the same
sequence: capture and index the database, export objects, encrypt/upload/read
back, remove source containers and their data, independently retrieve/decrypt,
regenerate the index from the retrieved checkpoint, restore a fresh provider,
and cold-read actual restored database associations and object bytes/metadata.

The fixture's remote is a disposable local rclone alias reached by separate
client processes. This proves native encryption and independent retrieval after
source loss. It does not prove an external provider's availability, quota,
off-node failure domain, retention, account recovery or production acceptance.
Those remain deployment requirements.

Run the combined fixture with Docker:

```sh
python3 -B tests/verify_plugin_combined_recovery.py
```

It builds three images from explicitly allowlisted public inputs. The optional
`--snapshot-image`, `--checkpoint-image` and `--transport-image` flags accept exact
local SHA-256 image IDs for the same reviewed runtimes. The shared gateway image
workflow supplies its exact loaded candidate to this fixture before retaining
that image for publication. It builds the checkpoint and fixture-client images
from the checked-out public revision.

The native age 1.3.2 and rclone 1.76.0 binaries use the existing checked release
archive hashes. Fixture-only native age-keygen generates a disposable identity;
no test identity is packaged into a runtime image or printed. The simulated
remote contains encrypted files only. Source capture/index/object folders and
upload plaintext/cache volumes are removed before the independent pull.

The operator side runs as UID 501 with private files, modelling a Mac operator's
retrieval. A fixed fixture copier reads those inputs through a read-only mount
and creates a fresh UID 1000 staging copy. Source ownership, modes and byte hashes
must remain identical before and after copying. It changes ownership only on new
destination entries, never retained input files. This is a fixture procedure,
not an installed production migration or backup-permission repair helper.

The real retrieved original checkpoint is reindexed through the existing strict
isolated rehearsal, and that deterministic index must match the trusted frozen
index hash. A separate fresh MongoDB receives the retrieved archive, restarts,
and serves a new Java client alongside a freshly restored and restarted gateway.
That client checks native database references to current/older/removed/discarded
versions, registry lifecycle states, every required or present staged object and
source orphan, and exact object size, SHA metadata, content type and bytes.
No plugin classes execute. The empty case traverses the same steps and verifies
that no object directory needs to be recreated in immutable retrieved inputs.

The final typed report records source revision, exact fixture image IDs and the
original report/archive/index/snapshot/ciphertext/receipt hashes for both cases.
Successful process exit and both complete case results are required. This proof
does not replace provider/account recovery, off-node backup custody or production
application acceptance.
