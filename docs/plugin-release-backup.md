# Encrypted release backup transport

`openlap-analyticsframework/scripts/plugin-release-backup.py` transports a
completed database checkpoint and explicitly reviewed source/artifact folders
from a local POSIX operator host. It uses the official `age` and `rclone` clients;
it implements no encryption algorithm, account login or database restoration.
No Kubernetes component, scheduled task or application default is installed.

Use an account-backed cloud drive, including sciebo, as a secondary encrypted
destination alongside a separately retained local copy and the agreed production
backup/retention design. Transfer success does not establish storage availability,
account recovery, retention guarantees or an independent failure domain. Configure
the provider through rclone outside this tool; no vendor endpoint is embedded.

## Prerequisites and trust

- Install reviewed official client binaries and verify their published checksums.
  The local regression uses age 1.3.2 and rclone 1.76.0. Supply explicit physical
  absolute binary paths; this tool does not install or update them.
- Create a native age X25519 identity on the operator host, retain recovery access
  separately, and review its public recipient. Keep the private identity off the
  cluster and cloud destination. Only age opens the identity file during pull;
  Python checks file metadata only. The noninteractive flow accepts native public
  recipients and an owner-only identity file, not passwords or private keys in
  arguments. Interactive/plugin identities are outside this procedure.
- Configure a named rclone remote using the operator's own secure setup. Supply
  its existing, regular, owner-only config with `--rclone-config PATH`; Python
  never opens or prints its contents. The configuration is trusted client input:
  use reviewed backend settings without global/override logging, external
  commands, TLS weakening or other behavior overrides. The tool does not inspect
  credential-bearing configuration. It discards client stderr and supplies a
  clean environment, so ambient credentials, profiles, proxy settings and
  password variables are not inherited. Interactive configuration/password
  prompts are unsupported.
- Obtain the **original `checkpoint.json` SHA-256 from separately retained trusted
  evidence**, before transport. Do not derive this trust value from a downloaded
  archive/report or an untrusted adjacent checksum file. Preserve the upload
  receipt and its hash through the same trusted operational record.
- Select reviewed source folders explicitly. Include the inventory, mapping,
  provenance and exact required artifact versions as appropriate. Review their
  contents beforehand; do not select a home directory, credential folder or Git
  checkout. The tool preserves regular files, not empty directories, permissions
  or automatic catalog coverage. MongoDB and S3/source artifacts need a consistent
  release set under the separately verified writer drain.

The [database checkpoint procedure](./plugin-release-checkpoint.md) remains the
source of checkpoint/freeze prerequisites. This transport requires the original
report's completed status and success flags, verifies its original hash before
JSON parsing, and checks the fixed archive's size/SHA-256 plus complete bounded
gzip expansion. It also validates the complete v1 database/runtime and collection
fingerprint metadata. It does not parse database records or re-establish the original
writer pause/internal restore evidence.

## Push: retain locally, encrypt, upload and read back

Choose a fresh output directory on protected local storage, outside source
folders and Git. Its parent must already exist. Paths must be physical absolute
paths without symlink ancestors. The remote is a configured name and normalized
directory, such as `backup:Release copies`; inline backend connection strings
and credentials are rejected.

```sh
python3 -B openlap-analyticsframework/scripts/plugin-release-backup.py push \
  --age /trusted/bin/age --rclone /trusted/bin/rclone \
  --rclone-config /private/operator/rclone.conf \
  --remote 'backup:Release copies' \
  --checkpoint /protected/COMPLETED-checkpoint \
  --checkpoint-report-sha256 TRUSTED_ORIGINAL_REPORT_SHA256 \
  --source artifacts=/protected/REVIEWED-artifacts \
  --source records=/protected/REVIEWED-inventory-and-mapping \
  --recipient age1REVIEWED_PUBLIC_RECIPIENT \
  --output /protected/NEW-encrypted-release
```

Replace all uppercase placeholders. Source labels must be unique lowercase names;
repeat `--source` and `--recipient` only for explicitly reviewed inputs/recipients.
No source, existing output or remote backup is overwritten or selected for
deletion. Files and directories created locally are mode 0600 and 0700.

The tool snapshots regular files into a bounded tar with an encrypted hash
manifest, detects changed bytes/membership, and encrypts through age. It retains
`release-UTC_DATE-RANDOM.tar.age` locally, refuses an existing remote object,
uploads using `rclone copyto --immutable`, then starts a separate `rclone cat`
download and checks the exact ciphertext size and SHA-256. It rechecks the local
encrypted copy before publishing `receipt.json` last. No plaintext archive is
uploaded. Successful scratch cleanup removes only this run's private temporary
files; source data and retained backup versions remain untouched.
Success is established by exit code zero and the completed receipt file. The
tool prints no success sentence that could precede a failed publication.

The unique dated name, absence check and rclone immutable transfer mode provide
an append-only tool policy. They do not provide provider object locking or a
universal atomic create-if-absent guarantee against competing writers. Restrict
writers to the backup location, keep every release name unique, and retain the
verified local encrypted copy plus trusted receipt. This tool never invokes
sync, move, remote delete, automatic rotation or retention cleanup. See the
[rclone immutable semantics](https://rclone.org/docs/#immutable) and
[age client](https://github.com/FiloSottile/age) for the underlying client behavior.

## Pull: retrieve and verify into a fresh private directory

Use the trusted upload receipt hash **and** original checkpoint report hash.
Select the recovery remote explicitly; its configured name may differ from the
upload host as long as it contains the same verified ciphertext object.

```sh
python3 -B openlap-analyticsframework/scripts/plugin-release-backup.py pull \
  --age /trusted/bin/age --rclone /trusted/bin/rclone \
  --rclone-config /private/operator/rclone.conf \
  --remote 'backup:Release copies' \
  --receipt /protected/TRUSTED-upload-receipt.json \
  --receipt-sha256 TRUSTED_UPLOAD_RECEIPT_SHA256 \
  --checkpoint-report-sha256 TRUSTED_ORIGINAL_REPORT_SHA256 \
  --identity-file /private/operator/age-identity.txt \
  --output /protected/NEW-recovery
```

Pull verifies the receipt before retrieving ciphertext, checks the downloaded
bytes, and decrypts only through age. It validates the complete tar and encrypted
manifest before extracting regular files: traversal, links, special files,
extended headers, duplicates, unexpected members/trailers and exceeded budgets
fail closed. Recovered files must match every manifest hash/size; the checkpoint
report must match the independently trusted original hash and the archive must
pass complete gzip/identity checks again.

Success retains the encrypted object, `recovered/checkpoint/`,
`recovered/sources/LABEL/`, the recovered release manifest and a final
`pull-receipt.json`. Its status is `DOWNLOADED_DECRYPTED_FILES_VERIFIED`.
This is file/transport evidence. The retrieved database archive still needs a
separately reviewed isolated restore and semantic comparison with the trusted
checkpoint report before the production recovery gate can pass. No live target,
database URI or restore command is accepted by this tool.

## Bounds and failure handling

Both actions default to a 2 GiB aggregate payload budget, a 10,000-entry budget
(source files/directories plus checkpoint files),
32 directory levels and 900 seconds. `--max-bytes` accepts at most 8 GiB,
`--max-files` at most 10,000 and `--timeout-seconds` at most 3,600. Metadata is
bounded to 1 MiB; checkpoint compressed/expanded data remains within its trusted
report and the current runner's 1 GiB bounds. Tar/encryption overhead is bounded
separately. Allow local space for plaintext scratch, ciphertext and readback or
extracted copies, roughly three payload copies plus metadata/overhead. Requested
budgets do not establish actual free storage or destination quota.

Errors print fixed bounded summaries, never plaintext, config/identity contents
or raw client errors. Timeouts/interruptions terminate child process groups.
Failure retains private incomplete output, potentially including plaintext
scratch, without a success receipt; protect it as sensitive and establish the
outcome before an operator-approved disposal or a fresh run. A remote object may
exist after an interrupted upload/readback. Do not overwrite it or infer success
from its name alone. Retries use a new output directory and new release name.

Run credential-free regressions with explicit verified tools:

```sh
PLUGIN_BACKUP_AGE_BIN=/trusted/bin/age \
PLUGIN_BACKUP_RCLONE_BIN=/trusted/bin/rclone \
python3 -B -m unittest discover -s tests -p test_plugin_release_backup.py
```

The real-client fixtures generate disposable test identities and use a local
rclone alias remote. They contact no account/service and never read an operator
config, identity or browser profile. Without both binary paths, real-client cases
are skipped; that is not complete integration validation.
The focused `plugin-release-backup.yml` workflow installs the checksum-pinned
official Linux clients and runs these same fixtures without cloud credentials.
