#!/bin/bash
# Direct-source reads and one isolated loopback restore. No Kubernetes client or live restore mode.
set +x
set -euo pipefail
ulimit -c 0
umask 077
export LC_ALL=C
fail() { printf '%s\n' "Checkpoint incomplete: $1. Raw client output withheld; any partial checkpoint is retained." >&2; exit 1; }
[[ $# == 1 && $1 == --checkpoint ]] || fail 'configure the explicit --checkpoint action'
[[ ${OPENLAP_MONGODB_DB-} =~ ^[A-Za-z][A-Za-z0-9_-]{0,62}$ ]] || fail 'set the explicit primary database name'
[[ ! ${OPENLAP_MONGODB_DB} =~ ^(admin|config|local)$ ]] || fail 'system databases are unsupported'
[[ ${CHECKPOINT_ID-} =~ ^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$ ]] || fail 'set a fresh checkpoint identifier'
[[ ${CHECKPOINT_FREEZE_EVIDENCE-} =~ ^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,159}$ ]] || fail 'supply the separately reviewed writer-freeze evidence identifier'
[[ -n ${MONGODB_PRIMARY_URI-} && -n ${CHECKPOINT_SOURCE_HOST-} && -n ${CHECKPOINT_SOURCE_PORT-} ]] || fail 'set the source URI, expected host and port'
source_uri=$MONGODB_PRIMARY_URI
unset MONGODB_PRIMARY_URI
archive_mib=${CHECKPOINT_MAX_ARCHIVE_MIB:-256}
expanded_mib=${CHECKPOINT_MAX_EXPANDED_MIB:-1024}
restore_mib=${CHECKPOINT_MAX_RESTORE_MIB:-1024}
for number in "$archive_mib" "$expanded_mib" "$restore_mib"; do
    [[ $number =~ ^[1-9][0-9]{0,3}$ && $number -le 1024 ]] || fail 'review byte budgets between 1 and 1024 MiB'
done
output_root=${CHECKPOINT_OUTPUT_ROOT:-/outputs}
[[ $output_root == /* && $output_root != / && $output_root != *//* && $output_root != */ && $output_root != *$'\n'* ]] || fail 'use a normalized existing output mount'
part=/
IFS=/ read -ra parts <<< "$output_root"
for element in "${parts[@]}"; do
    [[ -n $element ]] || continue
    [[ $element != . && $element != .. ]] || fail 'indirect output paths are unsupported'
    part=${part%/}/$element
    [[ -d $part && ! -L $part && ! -e $part/.git ]] || fail 'output mount is unavailable, indirect or inside a Git worktree'
done
[[ -w $output_root && $(cd -P -- "$output_root" && pwd -P) == "$output_root" ]] || fail 'output mount is not writable and direct'
output=$output_root/$CHECKPOINT_ID
[[ ! -e $output && ! -L $output ]] || fail 'checkpoint already exists; choose a fresh identifier'
work=$(mktemp -d /tmp/openlap-checkpoint.XXXXXXXX) || fail 'private scratch allocation failed'
export CHECKPOINT_WORK=$work
mongod_pid= monitor_pid= report_publication_started=false
cleanup() {
    local exit_status=$?
    trap - EXIT TERM INT
    if [[ -n $monitor_pid ]]; then kill "$monitor_pid" 2>/dev/null || true; wait "$monitor_pid" 2>/dev/null || true; fi
    if [[ -n $mongod_pid ]]; then
        kill "$mongod_pid" 2>/dev/null || true
        for ((i=0; i<50; i++)); do kill -0 "$mongod_pid" 2>/dev/null || break; sleep 0.1; done
        kill -KILL "$mongod_pid" 2>/dev/null || true
        wait "$mongod_pid" 2>/dev/null || true
    fi
    if [[ $exit_status != 0 && $report_publication_started == true ]]; then
        rm -f -- "$output/checkpoint.json"
    fi
    rm -rf -- "$work"
}
trap cleanup EXIT
trap 'fail "operation interrupted"' TERM INT
run_private() {
    local stage=$1 limit=$2 destination=$3; shift 3
    if ! (ulimit -f "$limit"; exec timeout --kill-after=5s 120s "$@") >|"$destination" 2>|"$work/diagnostic"; then
        fail "$stage failed"
    fi
}
source_report() {
    local phase=$1
    CHECKPOINT_PHASE="$phase" MONGODB_PRIMARY_URI="$source_uri" run_private 'source validation' 2048 "$work/$phase.json" mongo --nodb --norc --quiet /opt/openlap-checkpoint/report.js
}
source_report source-before
[[ -s $work/source-config.json && ! -L $work/source-config.json ]] || fail 'private source configuration was not created'
chmod 0600 "$work/source-config.json"
available_kib=$(df -Pk -- "$output_root" | awk 'END { print $4 }')
[[ $available_kib =~ ^[0-9]+$ && $available_kib -gt $((archive_mib * 1024 + 4096)) ]] || fail 'output free space is below the reviewed archive budget'
mkdir -m 0700 -- "$output" || fail 'exclusive checkpoint creation failed'
archive=$output/database.archive.gz
# noclobber is additional protection even inside the newly created private directory.
set -C
if ! (ulimit -f "$((archive_mib * 1024))"; exec timeout --kill-after=5s 180s mongodump --config="$work/source-config.json" --db="$OPENLAP_MONGODB_DB" --archive --gzip --quiet) >"$archive.partial" 2>"$work/dump-diagnostic"; then
    fail 'bounded primary database dump failed'
fi
[[ -s $archive.partial && ! -L $archive.partial ]] || fail 'database archive is empty or indirect'
archive_size=$(stat -c %s -- "$archive.partial")
[[ $archive_size -le $((archive_mib * 1048576)) ]] || fail 'compressed archive exceeds budget'
run_private 'bounded gzip verification' 2048 "$work/expanded-size" /bin/bash --noprofile --norc -c 'set -o pipefail; gzip -dc -- "$1" | head -c "$2" | wc -c' checkpoint "$archive.partial" "$((expanded_mib * 1048576 + 1))"
read -r expanded_size < "$work/expanded-size"
[[ $expanded_size =~ ^[1-9][0-9]*$ && $expanded_size -le $((expanded_mib * 1048576)) ]] || fail 'expanded archive exceeds budget'
archive_sha=$(sha256sum -- "$archive.partial"); archive_sha=${archive_sha%% *}
source_report source-after
cmp -s "$work/source-before.json" "$work/source-after.json" || fail 'source identity, data or metadata changed around the dump'
mkdir -m 0700 -- "$work/db"
scratch_kib=$(df -Pk -- "$work" | awk 'END { print $4 }')
[[ $scratch_kib =~ ^[0-9]+$ && $scratch_kib -gt $((restore_mib * 1024 + 4096)) ]] || fail 'scratch free space is below the reviewed restore budget'
# No target URI is accepted. The fresh database is loopback-only and never mounts live Mongo data.
timeout --kill-after=5s 300s mongod --bind_ip=127.0.0.1 --port=37017 --dbpath="$work/db" --nounixsocket \
    --wiredTigerCacheSizeGB=0.25 --setParameter=ttlMonitorEnabled=false \
    --setParameter=diagnosticDataCollectionEnabled=false --quiet --logpath=/dev/null >/dev/null 2>/dev/null &
mongod_pid=$!
(
    while kill -0 "$mongod_pid" 2>/dev/null; do
        usage=$(du -sk -- "$work/db" 2>/dev/null | awk '{print $1}')
        if [[ ! $usage =~ ^[0-9]+$ || $usage -gt $((restore_mib * 1024)) ]]; then
            printf '%s\n' 'restore budget exceeded' > "$work/restore-budget-exceeded"
            kill "$mongod_pid" 2>/dev/null || true
            exit
        fi
        sleep 1
    done
) &
monitor_pid=$!
ready=false
for ((i=0; i<40; i++)); do
    kill -0 "$mongod_pid" 2>/dev/null || break
    if (ulimit -f 64; CHECKPOINT_PHASE=local-ready timeout --kill-after=1s 3s mongo --nodb --norc --quiet /opt/openlap-checkpoint/report.js) >|"$work/readiness" 2>|"$work/readiness-diagnostic"; then
        kill -0 "$mongod_pid" 2>/dev/null || break
        ready=true; break
    fi
    sleep 0.25
done
[[ $ready == true ]] || fail 'isolated loopback MongoDB did not become ready'
kill -0 "$mongod_pid" 2>/dev/null || fail 'isolated MongoDB exited before restore'
run_private 'isolated target identity check' 64 "$work/readiness" env CHECKPOINT_PHASE=local-ready mongo --nodb --norc --quiet /opt/openlap-checkpoint/report.js
run_private 'isolated full restore' 2048 "$work/restore-output" mongorestore --host=127.0.0.1 --port=37017 --archive="$archive.partial" --gzip --stopOnError --numParallelCollections=1
run_private 'isolated restored database verification' 2048 "$work/restored.json" env CHECKPOINT_PHASE=restored mongo --nodb --norc --quiet /opt/openlap-checkpoint/report.js
[[ ! -e $work/restore-budget-exceeded ]] || fail 'isolated restore exceeded disk budget'
restore_kib=$(du -sk -- "$work/db" | awk '{print $1}')
[[ $restore_kib =~ ^[0-9]+$ && $restore_kib -le $((restore_mib * 1024)) ]] || fail 'isolated restore exceeds disk budget'
# Verify the original compressed bytes again after the actual restore consumed them.
verify_sha=$(sha256sum -- "$archive.partial"); verify_sha=${verify_sha%% *}
[[ $verify_sha == "$archive_sha" ]] || fail 'archive changed during rehearsal'
run_private 'checkpoint report verification' 2048 "$work/report.json" env CHECKPOINT_PHASE=finish \
    CHECKPOINT_ARCHIVE_SHA256="$archive_sha" CHECKPOINT_ARCHIVE_SIZE="$archive_size" CHECKPOINT_EXPANDED_SIZE="$expanded_size" \
    mongo --nodb --norc --quiet /opt/openlap-checkpoint/report.js
# Stop the isolated server before publishing any successful report.
kill "$monitor_pid" 2>/dev/null || true; wait "$monitor_pid" 2>/dev/null || true; monitor_pid=
kill "$mongod_pid" 2>/dev/null || true; wait "$mongod_pid" 2>/dev/null || true; mongod_pid=
sync -f "$archive.partial"
ln -- "$archive.partial" "$archive"; rm -- "$archive.partial"
cat -- "$work/report.json" > "$output/checkpoint.json.partial"
sync -f "$output/checkpoint.json.partial"
report_publication_started=true
ln -- "$output/checkpoint.json.partial" "$output/checkpoint.json"; rm -- "$output/checkpoint.json.partial"
sync -f "$output"
printf '%s\n' 'OPENLAP-CHECKPOINT-REPORT-V1'
cat -- "$output/checkpoint.json"
printf '%s\n' 'OPENLAP-CHECKPOINT-REPORT-END-V1'
