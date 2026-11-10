# Private local backup setup

`openlap-analyticsframework/scripts/plugin-backup-setup.py` gives an operator one
local form for a password-protected folder-share link and its share password.
The user enters those two values in the browser and presses **Submit** once.
Do not paste credentials into chat, command arguments, environment variables or
an operational log. The operator should not inspect the browser's accessibility
tree, screenshots, page state or request bodies during entry.

This is an opt-in local POSIX helper, not a hosted account-login service. It
creates an **unverified** WebDAV profile for a reviewed share endpoint. It does
not contact the provider, upload a test object, read an existing config, install
tools, change Kubernetes resources or establish a production backup.

## Operator preparation

Use a trusted local host and verified official age, age-keygen and rclone
executables. The regressions use age 1.3.2 and rclone 1.76.0. Obtain their binary
SHA-256 values from a separately verified installation of the reviewed official
release assets; hashing an arbitrary executable does not establish its origin.
The helper checks these explicit hashes before opening the form and again after
submission. It does not discover tools, update them or trust a filename/version
string as provenance.

Choose an existing owner-only 0700 operator root outside Git, using physical
absolute paths without symlink ancestors. The helper creates a new random 0700
profile directory beneath it only after a valid submission. Existing config and
key files are never selected for overwrite or deletion.

```sh
python3 -B openlap-analyticsframework/scripts/plugin-backup-setup.py \
  --operator-root /private/operator/backup-root \
  --allowed-provider-origin https://backup.example.invalid \
  --age /trusted/bin/age --age-sha256 REVIEWED_AGE_BINARY_SHA256 \
  --age-keygen /trusted/bin/age-keygen \
  --age-keygen-sha256 REVIEWED_KEYGEN_BINARY_SHA256 \
  --rclone /trusted/bin/rclone --rclone-sha256 REVIEWED_RCLONE_BINARY_SHA256
```

Replace the placeholders with reviewed non-secret paths, digests and the exact
allowed HTTPS origin. To retain an existing native identity, additionally supply
`--existing-identity /private/operator/RETAINED-age-identity.txt`. The helper checks
its owner, permissions, regular-file status, size, link count and stability; only
the explicitly selected native `age-keygen -y` opens its contents. It must produce
one native X25519 public recipient. No existing credential-bearing config is read.

## One form, then an automated local result

The first stdout line is typed `LOCAL_FORM_READY` JSON with an ephemeral
`http://127.0.0.1:PORT/` URL. Open that exact URL in the user's approved browser.
The form has only the share link, share password and Submit button. Inputs start
blank; the helper has no external assets, scripts, CORS, access/request logs or
input echo. Keep browser developer tools, remote inspection and traffic capture
closed while the user enters the values. The helper never launches a browser or
reads a browser profile.

The form accepts an HTTPS URL on the explicitly allowed origin with exactly
`/s/TOKEN` or `/index.php/s/TOKEN`. Queries, fragments, explicit ports, userinfo,
URL escapes, control characters and extra path segments are rejected. It derives
only the candidate legacy `/public.php/webdav/` endpoint, uses the share token as
the user, and creates the fixed remote `sciebo` with `vendor = other`. This does
not establish that a particular provider supports that endpoint or grants the
needed folder permissions; the allowed origin and later compatibility probe are
separate operator decisions. Never use a full-account credential for this flow.

After a valid submission, the helper passes the password to official
`rclone obscure -` through stdin, with a clean environment and explicit
`--config /dev/null`. It never puts the password in argv or environment variables.
Single-line UTF-8 passwords are preserved, including surrounding spaces; empty,
control-character or greater-than-1024-byte passwords are rejected. Obscuring is
**reversible obfuscation**, not encryption: the resulting config remains a secret.
See [rclone's stdin contract](https://rclone.org/commands/rclone_obscure/).

If no existing identity was selected, native `age-keygen -o` writes a new private
identity directly to a 0600 file after submission. Private key bytes never pass
through Python stdout or the browser. The helper opens the fresh file only for
metadata checks and fsync, without reading its bytes, and syncs its directory
before proceeding. It obtains only its public recipient
through native `-y`. It writes `sciebo-setup.conf` exclusively as 0600 with config
interpolation disabled, then writes a 0600 `setup-receipt.json`. The generic success
page contains no submitted values, paths or recipient.

Require terminal exit code zero **and** the final typed
`LOCAL_PROFILE_CREATED_UNVERIFIED` JSON. It contains only schema/status, protected
file paths, the public recipient, identity-reuse metadata and explicit false
connectivity/key-recovery flags. The local receipt has those same metadata fields;
it contains no share URL, token, password or obscured password. Do not open the
config or private identity in a model/browser tool to verify setup.

The listener binds only IPv4 loopback, uses an ephemeral port, exact Host/Origin
checks, a CSRF token and an HttpOnly SameSite=Strict cookie. It accepts one valid
handoff, expires after 300 seconds by default (30–900 configurable), limits
connections and request/body sizes, and bounds request reads and native processes.
Bad requests receive fixed generic responses. Local malware, a compromised browser,
screen capture, swap and OS-level memory inspection are outside this boundary;
the helper does not claim secure memory erasure.

## Failure and recovery gates

Failures produce only typed `LOCAL_SETUP_INCOMPLETE_PRIVATE_OUTPUTS_RETAINED`
status and a nonzero exit. Protect any new profile as sensitive unverified partial
state. The helper never removes uncertain files or changes an older config/key to
make a retry work. A fresh invocation uses a new profile. A late fsync, browser
response or stdout failure can leave accurate protected files/receipt while the
operation remains incomplete; file presence alone is insufficient.

Before any production backup, separately verify the folder-share service and
scope with a bounded authorized probe, then verify upload/readback integrity and
off-node recovery using the [encrypted transport](./plugin-release-backup.md).
This setup performs none of those network operations. Keep the private identity
off the cluster and cloud destination. Establish independently accessible key
recovery before relying on encrypted backups; the helper neither copies a key to
a password manager/cloud nor verifies recovery access. A drive share remains a
secondary encrypted destination alongside the separately retained local copy and
the production retention/availability plan.

## Credential-free verification

```sh
PLUGIN_BACKUP_AGE_BIN=/trusted/bin/age \
PLUGIN_BACKUP_AGE_KEYGEN_BIN=/trusted/bin/age-keygen \
PLUGIN_BACKUP_RCLONE_BIN=/trusted/bin/rclone \
python3 -B -m unittest discover -s tests -p test_plugin_backup_setup.py
```

Fixtures bind only loopback and use synthetic share values, disposable test
identities/profiles and verified official clients. They contact no provider and
never inspect an operator browser, config or identity. Native cases are skipped
without all three explicit binary paths; a skipped run is not complete native
validation. The existing focused encrypted-backup workflow installs its pinned
official Linux clients and runs these regressions without cloud credentials.
