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
