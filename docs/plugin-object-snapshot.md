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
