# Prepare private plugin deployment secrets

An operator can run `plugin-storage-secret-setup.py` once to create separate root
and application credentials for a fresh storage installation. The optional backup
input copies an **already tested, folder-scoped** rclone configuration into the
backup uploader's env-file format. No values belong in chat, command arguments,
public Git, images or logs.

Run this yourself in a trusted local terminal. An assistant may prepare and review
the code, but should not execute credential creation on your behalf when your
operational policy reserves that action to you.

```sh
python3 -B analyticsframework/scripts/plugin-storage-secret-setup.py \
  --prepare \
  --output-directory /PRIVATE/EXISTING/DEPLOYMENT/DIRECTORY \
  --rclone-config /PRIVATE/EXISTING/FOLDER-SCOPED-rclone.conf
```

Both paths must be physical absolute paths without symlinks. The destination must
already exist, belong to the operator, and not be writable by group or others.
Select a private deployment directory whose credential files are permitted by
your operational process. The tool cannot determine whether a Git repository is
private or whether a provider configuration has the required account scope.

The command creates these new owner-only files:

| File | Key names |
| --- | --- |
| `openlap-plugin-storage-root.env` | `ROOT_ACCESS_KEY_ID`, `ROOT_SECRET_ACCESS_KEY` |
| `openlap-plugin-storage-client.env` | `PLUGIN_STORAGE_S3_ACCESS_KEY`, `PLUGIN_STORAGE_S3_SECRET_KEY` |
| `openlap-plugin-backup-upload.env` | `RCLONE_CONFIG_BASE64` |

Omit `--rclone-config` to create only the two storage files. These file names match
the corresponding Secret names; deployment-specific Secret generators and public
component placeholders must still be configured separately. Only the client
Secret belongs in the backend or app-only readiness probe. Root credentials stay
with the storage administrator/bootstrap. The tool does not configure or deploy
Kubernetes resources, contact a service, change existing credentials, or prove
service access.

Each storage key has a distinct ID and a new 240-bit random secret. Files are
mode 0600, contain unquoted single-line env values, and are published without
overwriting an existing target. An existing file or symlink at **any** selected
target stops the operation before generating credentials or opening the source
profile. This is first-time setup, not credential rotation or permission repair.

The rclone input must be a regular, single-link, owner-only file of at most
64 KiB. Python opens its descriptor for metadata checks but never reads its
contents. Native `/usr/bin/base64` and `/usr/bin/tr` copy it into the private output;
no encoded value enters Python, command arguments, environment variables or
diagnostic output. Native child processes have a clean environment and bounded
execution. Source identity/size changes or failed encoding stop publication.
Base64 is credential material, **not encryption**. The copied profile has the
same permissions and expiry at its provider as the original profile; it is not a
new backup account.

New files are staged privately and flushed before exclusive publication. A
publication failure rolls back only this run's own linked inodes and preserves a
competing target. A late cleanup or terminal-output failure may leave the valid
new files present: inspect them privately before retrying, and never delete or
rotate existing deployment credentials to make a retry succeed. Keep credential
and encryption-key recovery custody separate from backup transport verification.

Success prints only a small typed result listing file names, with `deployed` and
`serviceAccessVerified` both false. It never prints credential values. Keep the
terminal private and close it after completion.

Credential-free regressions use generated test keys and a synthetic local alias
profile only:

```sh
python3 -B -m unittest discover -s tests -p test_plugin_storage_secret_setup.py -v
```
