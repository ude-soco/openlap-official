#!/bin/bash
# Verify a retrieved copy against a trusted original report. Never connects to a source database.
set +x
set -euo pipefail
ulimit -c 0
umask 077
export LC_ALL=C
fail() { printf '%s\n' "Checkpoint rehearsal incomplete: $1. Raw client output withheld; inputs were not changed." >&2; exit 1; }
index_plugins=false
if [[ $# == 1 && $1 == --plugin-index ]]; then index_plugins=true
elif [[ $# != 0 ]]; then fail 'configure an explicit supported rehearsal action'; fi
[[ ${CHECKPOINT_ID-} =~ ^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$ ]] || fail 'set a fresh rehearsal identifier'
[[ ${CHECKPOINT_EXPECTED_REPORT_SHA256-} =~ ^[a-f0-9]{64}$ ]] || fail 'supply the independently trusted original report SHA-256'
for name in MONGODB_PRIMARY_URI MONGODB_SECONDARY_URI OPENLAP_MONGODB_DB \
    PLUGIN_STORAGE_S3_ACCESS_KEY PLUGIN_STORAGE_S3_SECRET_KEY AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY \
    AWS_SESSION_TOKEN AWS_PROFILE AWS_CONFIG_FILE AWS_SHARED_CREDENTIALS_FILE AWS_WEB_IDENTITY_TOKEN_FILE \
    AWS_ROLE_ARN AWS_CONTAINER_CREDENTIALS_RELATIVE_URI AWS_CONTAINER_CREDENTIALS_FULL_URI \
    AWS_CONTAINER_AUTHORIZATION_TOKEN AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE KUBECONFIG KUBERNETES_BEARER_TOKEN; do
    [[ -z ${!name-} ]] || fail 'source database, S3 and API credentials/selectors must be absent'
done
[[ ! -e /var/run/secrets/kubernetes.io/serviceaccount/token ]] || fail 'do not mount a Kubernetes API identity'
archive_mib=${CHECKPOINT_MAX_ARCHIVE_MIB:-256}
expanded_mib=${CHECKPOINT_MAX_EXPANDED_MIB:-1024}
restore_mib=${CHECKPOINT_MAX_RESTORE_MIB:-1024}
for number in "$archive_mib" "$expanded_mib" "$restore_mib"; do
    [[ $number =~ ^[1-9][0-9]{0,3}$ && $number -le 1024 ]] || fail 'review byte budgets between 1 and 1024 MiB'
done
readonly_input() {
    local path=$1 element part=/ mount_point options best= best_options=
    local -a elements fields
    [[ $path =~ ^/inputs/[A-Za-z0-9._/-]+$ && $path != *//* && $path != */ ]] || fail 'use explicit normalized input files below /inputs'
    IFS=/ read -ra elements <<< "$path"
    for element in "${elements[@]}"; do
        [[ -n $element ]] || continue
        [[ $element != . && $element != .. ]] || fail 'indirect input paths are unsupported'
        part=${part%/}/$element
        [[ ! -L $part ]] || fail 'input files and their directories must not be symlinks'
    done
    [[ -f $path && -r $path ]] || fail 'an input is not a readable regular file'
    # Verify the most specific Linux mount, including an individual subPath mount.
    # Input paths use no spaces/backslashes, so mountinfo escaping cannot alias them.
    while IFS=' ' read -ra fields; do
        [[ ${#fields[@]} -ge 6 ]] || continue
        mount_point=${fields[4]}; options=${fields[5]}
        if [[ $path == "$mount_point" || $path == "${mount_point%/}/"* ]]; then
            if [[ ${#mount_point} -gt ${#best} ]]; then best=$mount_point; best_options=$options; fi
        fi
    done < /proc/self/mountinfo
    [[ ,$best_options, == *,ro,* ]] || fail 'mount both input files read-only'
}
archive_input=${CHECKPOINT_ARCHIVE_PATH-}
report_input=${CHECKPOINT_REPORT_PATH-}
readonly_input "$archive_input"
readonly_input "$report_input"
[[ $archive_input == *.gz && $report_input == *.json ]] || fail 'select a gzip archive and JSON report explicitly'
report_size=$(stat -c %s -- "$report_input")
archive_size=$(stat -c %s -- "$archive_input")
[[ $report_size -gt 0 && $report_size -le 262144 ]] || fail 'original report exceeds the 256 KiB format limit'
[[ $archive_size -gt 0 && $archive_size -le $((archive_mib * 1048576)) ]] || fail 'compressed archive exceeds budget'
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
[[ ! -e $output && ! -L $output ]] || fail 'rehearsal already exists; choose a fresh identifier'
work=$(mktemp -d /tmp/openlap-checkpoint.XXXXXXXX) || fail 'private scratch allocation failed'
export CHECKPOINT_WORK=$work
mongod_pid= monitor_pid= report_publication_started=false index_publication_started=false
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
    if [[ $exit_status != 0 && $report_publication_started == true ]]; then rm -f -- "$output/rehearsal.json"; fi
    if [[ $exit_status != 0 && $index_publication_started == true ]]; then rm -f -- "$output/artifact-index.json"; fi
    rm -rf -- "$work"
}
trap cleanup EXIT
trap 'fail "operation interrupted"' TERM INT
run_private() {
    local stage=$1 limit=$2 destination=$3; shift 3
    if ! (ulimit -f "$limit"; exec timeout --kill-after=5s 120s "$@") >|"$destination" 2>|"$work/diagnostic"; then fail "$stage failed"; fi
}
scratch_kib=$(df -Pk -- "$work" | awk 'END { print $4 }')
[[ $scratch_kib =~ ^[0-9]+$ && $scratch_kib -gt $((restore_mib * 1024 + (archive_size + 1023) / 1024 + 4096)) ]] || fail 'scratch free space is below archive snapshot and restore budgets'
run_private 'bounded original report snapshot' 256 "$work/original-report.json" cat -- "$report_input"
report_sha=$(sha256sum -- "$work/original-report.json"); report_sha=${report_sha%% *}
[[ $report_sha == "$CHECKPOINT_EXPECTED_REPORT_SHA256" ]] || fail 'original report SHA-256 does not match the trusted identity'
run_private 'original report schema validation' 256 "$work/report-values" env CHECKPOINT_PHASE=rehearsal-validate mongo --nodb --norc --quiet /opt/openlap-checkpoint/report.js
read -r database expected_archive_sha expected_archive_size expected_expanded_size < "$work/report-values"
[[ $database =~ ^[A-Za-z][A-Za-z0-9_-]{0,62}$ && $expected_archive_sha =~ ^[a-f0-9]{64}$ \
    && $expected_archive_size =~ ^[1-9][0-9]*$ && $expected_expanded_size =~ ^[1-9][0-9]*$ ]] || fail 'validated report summary is incomplete'
[[ $archive_size == "$expected_archive_size" && $expected_expanded_size -le $((expanded_mib * 1048576)) ]] || fail 'archive size or expanded budget differs from the trusted report'
export OPENLAP_MONGODB_DB=$database
mkdir -m 0700 -- "$output" || fail 'exclusive rehearsal creation failed'
run_private 'bounded retrieved archive snapshot' "$((archive_mib * 1024))" "$work/archive.gz" cat -- "$archive_input"
snapshot_size=$(stat -c %s -- "$work/archive.gz")
archive_sha=$(sha256sum -- "$work/archive.gz"); archive_sha=${archive_sha%% *}
[[ $snapshot_size == "$expected_archive_size" && $archive_sha == "$expected_archive_sha" ]] || fail 'retrieved archive bytes differ from the trusted report'
run_private 'bounded gzip verification' 256 "$work/expanded-size" /bin/bash --noprofile --norc -c 'set -o pipefail; gzip -dc -- "$1" | head -c "$2" | wc -c' rehearsal "$work/archive.gz" "$((expanded_mib * 1048576 + 1))"
read -r expanded_size < "$work/expanded-size"
[[ $expanded_size == "$expected_expanded_size" ]] || fail 'expanded archive size differs from the trusted report'
mkdir -m 0700 -- "$work/db"
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
run_private 'isolated full restore' 2048 "$work/restore-output" mongorestore --host=127.0.0.1 --port=37017 --archive="$work/archive.gz" --gzip --stopOnError --numParallelCollections=1
run_private 'isolated restored database verification' 2048 "$work/restored.json" env CHECKPOINT_PHASE=rehearsal-restored mongo --nodb --norc --quiet /opt/openlap-checkpoint/report.js
[[ ! -e $work/restore-budget-exceeded ]] || fail 'isolated restore exceeded disk budget'
restore_kib=$(du -sk -- "$work/db" | awk '{print $1}')
[[ $restore_kib =~ ^[0-9]+$ && $restore_kib -le $((restore_mib * 1024)) ]] || fail 'isolated restore exceeds disk budget'
verify_sha=$(sha256sum -- "$work/archive.gz"); verify_sha=${verify_sha%% *}
[[ $verify_sha == "$expected_archive_sha" ]] || fail 'private archive snapshot changed during rehearsal'
run_private 'rehearsal report verification' 2048 "$work/result.json" env CHECKPOINT_PHASE=rehearsal-finish \
    CHECKPOINT_ARCHIVE_SHA256="$archive_sha" CHECKPOINT_ARCHIVE_SIZE="$snapshot_size" CHECKPOINT_EXPANDED_SIZE="$expanded_size" \
    mongo --nodb --norc --quiet /opt/openlap-checkpoint/report.js
if [[ $index_plugins == true ]]; then
    run_private 'plugin artifact index projection' 1024 "$work/artifact-index.json" env CHECKPOINT_PHASE=rehearsal-plugin-index \
        CHECKPOINT_ARCHIVE_SHA256="$archive_sha" CHECKPOINT_ARCHIVE_SIZE="$snapshot_size" CHECKPOINT_EXPANDED_SIZE="$expanded_size" \
        mongo --nodb --norc --quiet /opt/openlap-checkpoint/report.js
    run_private 'post-index restored database verification' 2048 "$work/index-after.json" env CHECKPOINT_PHASE=rehearsal-restored \
        mongo --nodb --norc --quiet /opt/openlap-checkpoint/report.js
    cmp -s -- "$work/restored.json" "$work/index-after.json" || fail 'isolated database changed during index projection'
    index_size=$(stat -c %s -- "$work/artifact-index.json")
    [[ $index_size -gt 0 && $index_size -le 1048576 ]] || fail 'plugin artifact index exceeds its format budget'
    index_sha=$(sha256sum -- "$work/artifact-index.json"); index_sha=${index_sha%% *}
    rehearsal_sha=$(sha256sum -- "$work/result.json"); rehearsal_sha=${rehearsal_sha%% *}
    run_private 'plugin artifact index summary' 256 "$work/index-summary.json" env CHECKPOINT_PHASE=rehearsal-plugin-index-summary \
        CHECKPOINT_INDEX_SHA256="$index_sha" CHECKPOINT_INDEX_SIZE="$index_size" CHECKPOINT_REHEARSAL_REPORT_SHA256="$rehearsal_sha" \
        mongo --nodb --norc --quiet /opt/openlap-checkpoint/report.js
    summary_size=$(stat -c %s -- "$work/index-summary.json")
    [[ $summary_size -gt 0 && $summary_size -le 4096 ]] || fail 'plugin artifact index summary exceeds its format budget'
fi
kill "$monitor_pid" 2>/dev/null || true; wait "$monitor_pid" 2>/dev/null || true; monitor_pid=
kill "$mongod_pid" 2>/dev/null || true; wait "$mongod_pid" 2>/dev/null || true; mongod_pid=
set -C
cat -- "$work/result.json" > "$output/rehearsal.json.partial"
sync -f "$output/rehearsal.json.partial"
report_publication_started=true
ln -- "$output/rehearsal.json.partial" "$output/rehearsal.json"; rm -- "$output/rehearsal.json.partial"
sync -f "$output"
if [[ $index_plugins == true ]]; then
    cat -- "$work/artifact-index.json" > "$output/artifact-index.json.partial"
    published_sha=$(sha256sum -- "$output/artifact-index.json.partial"); published_sha=${published_sha%% *}
    [[ $published_sha == "$index_sha" ]] || fail 'plugin artifact index copy differs from its verified snapshot'
    sync -f "$output/artifact-index.json.partial"
    index_publication_started=true
    ln -- "$output/artifact-index.json.partial" "$output/artifact-index.json"; rm -- "$output/artifact-index.json.partial"
    sync -f "$output"
    printf '%s\n' 'OPENLAP-CHECKPOINT-PLUGIN-INDEX-REPORT-V1'
    cat -- "$work/index-summary.json"
    printf '%s\n' 'OPENLAP-CHECKPOINT-PLUGIN-INDEX-REPORT-END-V1'
else
    printf '%s\n' 'OPENLAP-CHECKPOINT-REHEARSAL-REPORT-V1'
    cat -- "$output/rehearsal.json"
    printf '%s\n' 'OPENLAP-CHECKPOINT-REHEARSAL-REPORT-END-V1'
fi
