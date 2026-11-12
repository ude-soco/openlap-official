# Retaining recurring backup evidence

The optional collector retains a trusted receipt from the latest nightly online backup before Kubernetes Job history is removed. Its scope is the selected primary MongoDB installation and plugin S3 objects. LearningLocker/LRS and other MongoDB instances are excluded. Collection verifies cluster provenance and uploaded-release hashes; it does not by itself prove recovery.

The cluster CronJob creates backups independently of the Mac. The Mac must be awake and logged in, with its existing Argo CD session valid, for daily collection. A full independent recovery check additionally needs its qualified native age/rclone tools, private decryption identity, local Docker socket and prequalified Linux/amd64 images. Neither example schedule is installed or enabled by this repository. This is a prepared operator workflow, not a claim that unattended independent recovery is operational.

## Install only the public tools

Install these five reviewed files from the same immutable public commit under an operator-owned tools directory outside Git, preserving their relative paths:

```text
PUBLIC-TOOLS/
  scripts/collect-plugin-backup-evidence.py
  scripts/plugin-recurring-record.py
  analyticsframework/scripts/check-plugin-backup-recovery.py
  analyticsframework/scripts/plugin-release-backup.py
  analyticsframework/scripts/plugin-backup-upload.py
```

Retain the selected commit and file SHA-256 values with installation records. The tools need Python 3 and its standard library, not a source checkout, application images, or secrets copied into the tool tree. Container image qualification and local availability are separate prerequisites of the full recovery runner. Existing native Argo, age and rclone credential files remain private operator references. Installing these public files creates or changes no credentials. For an operator-confirmed destination without expiry, use the explicit `unlimited` setting; authenticated upload/readback remains mandatory.

Create private configuration and state directories outside Git with mode `0700`. Copy [the collector example](examples/plugin-backup-evidence-collection.json) into a private single-link `0600` JSON file. Fill public resource names, the trusted installed CronJob UID, immutable image references and finite accepted runtime image IDs from the reviewed deployment and image qualification records. A registry manifest/index digest can differ from a container runtime image ID: both are required, and neither is guessed from the other. Recreating the CronJob requires a reviewed UID refresh; the collector rejects the changed identity.

The `argocd_config` path references the existing native CLI session. The collector verifies file metadata but never opens, hashes or copies that credential file; the native Argo executable consumes it. It only reads filtered CronJob/Job/Pod metadata, ownership, terminal status, qualified image fields and the uploader's bounded receipt frame. It has no Kubernetes client, terminal command, Secret-object query or application-update action.

Use an already qualified [recovery configuration](examples/plugin-recovery-check.json) as `recovery_template`, also a private single-link `0600` JSON file. Keep the native binary/profile/key paths, approved remote, qualified restore-image pins and resource budgets in that template. The separate `active_recovery_config` path is managed by the collector. Start with that path absent and `initial_active_config_sha256: null`; adopting an existing active file instead requires its exact locally reviewed SHA-256. The state directory must already exist, be owner-only `0700`, and differ from the recovery runner's scratch state directory.

Keep the collector configuration, recovery template and active recovery configuration outside the entire collector state directory. That directory is reserved for generated custody records, locks, the selection ledger and its pending journal; even an absent configuration file cannot use one of those paths.

Treat `active_recovery_config` and the selection state as collector-owned files. Before manual maintenance, stop its schedules and any running collector, then coordinate changes through the same advisory locks. Routine settings belong in the reviewed template and collector configuration. Do not edit the active selection while a collector is running.

## Daily custody and weekly independent recovery

The minimal independent-check schedule is the disabled [weekly example](examples/org.openlap.plugin-backup-weekly-recovery.plist): Sundays at 05:00 local time, using the collector with `--run-check`. It refreshes and verifies the latest trusted evidence before attempting recovery; it does not restore a week-old static selection. The separate disabled [daily example](examples/org.openlap.plugin-backup-evidence.plist) collects evidence at 04:00 local time without running a full restore. Set these times after the configured nightly backup window and account for its timezone. Review the timing and enable selected schedules only after a supervised run succeeds.

```sh
/VERIFIED/python3 -B /INSTALLED/PUBLIC-TOOLS/scripts/collect-plugin-backup-evidence.py \
  --config /PRIVATE/plugin-backup-evidence-collection.json

/VERIFIED/python3 -B /INSTALLED/PUBLIC-TOOLS/scripts/collect-plugin-backup-evidence.py \
  --config /PRIVATE/plugin-backup-evidence-collection.json --run-check
```

Daily collection is recommended even when full recovery is weekly: cluster history retains only a few successful Jobs, so it preserves the original hashes needed to trust newer backups if the cluster is lost between weekly checks. Weekly checks alone retain only the receipts they actually collected. If the Mac misses collections until those Jobs are removed, this collector cannot reconstruct trust from a cloud listing. A stale, failed, still-running or unowned latest attempt fails closed, with no fallback to an older success. A successful retry may have one earlier Failed sibling Pod because the producer allows one retry; both must belong to the same exact Job, and only one Pod can have succeeded.

Before selecting a release, the collector atomically retains its exact three-line frame, canonical record, nested original upload receipt, CronJob→Job→Pod UID evidence, image/status proofs and any previous active configuration under `state_directory/record-<sha256>`. These files remain owner-only and outside Git. It then replaces the active recovery configuration atomically, selecting the retained receipt and source capture time while preserving the template's transport settings, restore-image pins and budgets. Advisory locks serialize cooperating writers; prepublication fingerprint checks reject changes observed before replacement. These checks are not an atomic compare-and-swap: an uncoordinated edit between the final check and replacement could be overwritten. An interrupted local selection can be completed only from its hash-bound pending transaction and retained originals.

Collection prints `independentRecoveryVerified: false`. With `--run-check`, the existing recovery runner independently downloads and decrypts the selected archive, restores and indexes its database in fresh local volumes, cold-restores and reads its S3 objects, and verifies source inputs remained unchanged. Only a newly produced recovery receipt bound to the exact selected hashes and recovery point permits `independentRecoveryVerified: true`. Disposable local resources are cleaned by the qualified runner; retained evidence is not deleted.

Native authentication failures, missing/stale evidence, unqualified image IDs and unsuccessful recovery return nonzero. The collector emits the fixed `BACKUP_EVIDENCE_COLLECTION_INCOMPLETE` marker and withholds native diagnostics; inspect the private owner-only logs and the existing native session separately. The examples send no external notifications. They cannot wake a powered-off Mac, renew SSO, or guarantee that someone notices a failed or missed run. Neither schedule performs a production restore or changes the live application.
