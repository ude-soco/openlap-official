# Logical plugin object snapshots

This optional application tool exports plugin objects as regular private files.
It does not copy provider internals, IAM files, user records or credentials.
The existing encrypted release transporter is unchanged. Writers to both the
database and object store must be paused externally for the entire checkpoint
and export operation.

The trusted input is an artifact index produced only after an isolated database
restore has verified the original checkpoint. The caller supplies the SHA-256 of
that index and of the original checkpoint report; the index also binds the
database archive. Export includes every managed object in the dedicated bucket,
including retained versions and objects not present in the registry. Objects
under unsupported keys, inconsistent registry states or changing inventories
prevent publication.

A snapshot is a new private directory containing an exact copy of the trusted
index, relative object body files and a canonical bounded `snapshot.json`
manifest. The manifest is published last. Incomplete folders are never adopted
or overwritten. Limits are 1,000 objects, 100 MiB per object, 2 GiB of bodies and
1 MiB per metadata document. Object key, byte SHA-256, size, content type and SHA
metadata are verified together.

Restore accepts only a fresh fixed local `/storage` volume, initializes the
qualified provider from separately supplied operator identities, and writes
through its loopback S3 API. All snapshot inputs are validated before storage
initialization. An independently regenerated verified database index must have
the same SHA-256 as the original frozen index. The tool checks the complete
inventory and every object after a cold provider restart and a new client.
It never restores into an arbitrary external endpoint or adopts retained state.

An index match establishes the association scope declared by the database index;
it does not establish universal coverage of arbitrary legacy serialized fields.
Export alone does not prove recovery. End-to-end recovery additionally requires
the retrieved and decrypted snapshot, verified database rehearsal, and the
fresh-provider restore result.

The standalone Java entry point is
`com.openlap.plugins.storage.PluginObjectSnapshotApplication` with the same
runtime classpath as the optional gateway. Its explicit arguments are:

```text
--export TRUSTED_INDEX INDEX_SHA256 ORIGINAL_CHECKPOINT_SHA256 NEW_OUTPUT_DIRECTORY
--restore-fresh SNAPSHOT_DIRECTORY MANIFEST_SHA256 INDEX_SHA256 ORIGINAL_CHECKPOINT_SHA256 REGENERATED_INDEX
```

All file paths must be absolute, physical paths. Input metadata and body files
must be private regular files owned by UID 1000. Keep a snapshot immutable while
restoring; a read-only input mount is the intended execution contract. The index
supplied to `--export` and the independently regenerated index supplied to restore
come from the checkpoint tool's explicit verified index mode. Copying the first
index does not substitute for the second database rehearsal. The full index is
preserved byte-for-byte; the Java consumer deliberately does not reimplement its
MongoDB projection rules.

Export receives only the projected application-client configuration and an
explicit `PLUGIN_STORAGE_S3_ENDPOINT`. Restore receives separate projected root
and client configuration; its destination is always the fixed local `/storage`
and `http://127.0.0.1:9000`, regardless of the export endpoint setting. The storage
volume must be fresh, dedicated and externally isolated. Initialization and
restore failures retain partial state for review and never adopt it on retry.
During this isolated restore operation IAM is initialized once and its retained
identity is checked before each provider startup. Normal serving uses the
foundation component's read-only IAM mount.

Only hashes, byte/object counts and fixed status fields are printed. Consume
`FRESH_LOCAL_PLUGIN_OBJECT_RESTORE_VERIFIED` as the final success result; the
fresh provider's initialization status alone does not report restored data.
The manifest itself always records `recoveryVerified: false`; the separate
restore result binds its hash and the matched index and checkpoint/archive hashes.

The generated fixture verifier is:

```sh
python3 -B tests/verify_plugin_object_snapshot_containers.py --image sha256:EXACT_LOCAL_GATEWAY_IMAGE_ID
```

It tests the empty case, older/removed READY versions, present and absent STAGED
objects, absent PURGED history, source orphans, changed bytes/index mismatch,
validation before storage writes, fresh-only restore and cold client readback.
These are generated index consumer fixtures. They do not replace a combined
test using an actual verified database index and retrieved/decrypted snapshot.
