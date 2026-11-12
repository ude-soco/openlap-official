#!/bin/bash
# Verify a retrieved copy against a trusted original report. Never connects to a source database.
set +x
set -euo pipefail
ulimit -c 0
umask 077
export LC_ALL=C
fail() { printf '%s\n' "Checkpoint rehearsal incomplete: $1. Raw client output withheld; inputs were not changed." >&2; exit 1; }
index_plugins=false
persistent=false
unset CHECKPOINT_PERSISTENT_MODE CHECKPOINT_COLD_RESTART_VERIFIED CHECKPOINT_CLEAN_SHUTDOWN_VERIFIED CHECKPOINT_FSYNC_VERIFIED
if [[ $# == 1 && $1 == --persistent ]]; then persistent=true; index_plugins=true
elif [[ $# == 1 && $1 == --plugin-index ]]; then index_plugins=true
elif [[ $# != 0 ]]; then fail 'configure an explicit supported rehearsal action'; fi
[[ ${CHECKPOINT_ID-} =~ ^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$ ]] || fail 'set a fresh rehearsal identifier'
[[ ${CHECKPOINT_EXPECTED_REPORT_SHA256-} =~ ^[a-f0-9]{64}$ ]] || fail 'supply the independently trusted original report SHA-256'
if [[ $persistent == true ]]; then
    [[ ${CHECKPOINT_TARGET_TOKEN-} =~ ^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$ ]] || fail 'supply an explicit fresh target token'
    [[ ${CHECKPOINT_FREEZE_EVIDENCE-} =~ ^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,159}$ ]] || fail 'supply the separately verified writer-pause evidence identifier'
    export CHECKPOINT_PERSISTENT_MODE=true
fi
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
if [[ $persistent == true ]]; then
    [[ $output_root == /outputs ]] || fail 'persistent restore requires a separate /outputs mount'
    [[ -d /target && ! -L /target && -w /target && $(cd -P -- /target && pwd -P) == /target ]] || fail 'mount an existing writable direct target at /target'
    # Device + mount root distinguish bind mounts on one filesystem as well as
    # separate block volumes. Never permit inputs/output to alias the target.
    mount_record() {
        local path=$1 exact=$2 point best= device= root= options= filesystem= i
        local -a fields
        while IFS=' ' read -ra fields; do
            [[ ${#fields[@]} -ge 6 ]] || continue
            point=${fields[4]}
            if [[ $path == "$point" || $path == "${point%/}/"* ]]; then
                if [[ ${#point} -gt ${#best} ]]; then
                    best=$point; device=${fields[2]}; root=${fields[3]}; options=${fields[5]}; filesystem=
                    for ((i=6; i<${#fields[@]}-1; i++)); do
                        if [[ ${fields[i]} == - ]]; then filesystem=${fields[i+1]}; break; fi
                    done
                fi
            fi
        done < /proc/self/mountinfo
        [[ -n $best && ( $exact == false || $best == "$path" ) && $root != *\\* ]] || return 1
        printf '%s %s %s %s\n' "$device" "$root" "$options" "$filesystem"
    }
    read -r target_device target_root target_options target_filesystem < <(mount_record /target true) || fail 'target must be an explicit Linux mount'
    [[ ,$target_options, == *,rw,* ]] || fail 'target mount is read-only'
    persistent_filesystem() {
        case $1 in ext2|ext3|ext4|xfs|btrfs|zfs|nfs|nfs4|ceph|fuse.ceph) return 0 ;; *) return 1 ;; esac
    }
    persistent_filesystem "$target_filesystem" || fail 'target must use a reviewed persistent filesystem, not memory or container scratch'
    disjoint_mounts() {
        [[ $1 != "$3" || ( $2 != "$4" && $2 != "${4%/}/"* && $4 != "${2%/}/"* ) ]]
    }
    read -r output_device output_mount_root output_options output_filesystem < <(mount_record /outputs true) || fail 'output must be an explicit Linux mount'
    [[ ,$output_options, == *,rw,* ]] || fail 'output mount is read-only'
    persistent_filesystem "$output_filesystem" || fail 'output must use a reviewed persistent filesystem, not memory or container scratch'
    disjoint_mounts "$target_device" "$target_root" "$output_device" "$output_mount_root" || fail 'target aliases the output mount'
    for mounted in "$archive_input" "$report_input"; do
        read -r other_device other_root other_options other_filesystem < <(mount_record "$mounted" false) || fail 'could not establish separate input and output mounts'
        disjoint_mounts "$target_device" "$target_root" "$other_device" "$other_root" || fail 'target aliases an input mount'
        disjoint_mounts "$output_device" "$output_mount_root" "$other_device" "$other_root" || fail 'output aliases an input mount'
    done
fi
output=$output_root/$CHECKPOINT_ID
[[ ! -e $output && ! -L $output ]] || fail 'rehearsal already exists; choose a fresh identifier'
work=$(mktemp -d /tmp/openlap-checkpoint.XXXXXXXX) || fail 'private scratch allocation failed'
export CHECKPOINT_WORK=$work
mongod_pid= monitor_pid= report_publication_started=false index_publication_started=false
report_name=rehearsal.json
[[ $persistent == false ]] || report_name=restore.json
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
    if [[ $exit_status != 0 && $report_publication_started == true ]]; then rm -f -- "$output/$report_name"; fi
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
db_path=$work/db
ready_phase=local-ready
restored_phase=rehearsal-restored
index_phase=rehearsal-plugin-index
if [[ $persistent == true ]]; then
    shopt -s nullglob dotglob
    target_entries=(/target/*)
    [[ ${#target_entries[@]} == 0 ]] || fail 'target is not empty; never reuse a partial or completed restore'
    shopt -u nullglob dotglob
    target_free_kib=$(df -Pk -- /target | awk 'END { print $4 }')
    [[ $target_free_kib =~ ^[0-9]+$ && $target_free_kib -gt $((restore_mib * 1024 + 4096)) ]] || fail 'target free space is below the restore budget'
    # Atomic exclusive creation fences a simultaneous attempt. On failure both
    # this marker and every database byte remain for operator review.
    mkdir -m 0700 -- /target/.openlap-mongo-restore-attempt || fail 'target restore attempt already exists'
    printf '%s\n%s\n' "$CHECKPOINT_TARGET_TOKEN" "$CHECKPOINT_EXPECTED_REPORT_SHA256" > /target/.openlap-mongo-restore-attempt/binding
    sync -f /target/.openlap-mongo-restore-attempt/binding
    sync -f /target
    db_path=/target
    ready_phase=persistent-ready
    restored_phase=persistent-restored
    index_phase=persistent-plugin-index
fi
[[ $persistent == true ]] || mkdir -m 0700 -- "$db_path"
start_server() {
    local -a server=(mongod --bind_ip=127.0.0.1 --port=37017 --dbpath="$db_path" --nounixsocket
        --wiredTigerCacheSizeGB=0.25 --setParameter=ttlMonitorEnabled=false
        --setParameter=diagnosticDataCollectionEnabled=false --quiet --logpath=/dev/null)
    # The persistent child is direct so wait() observes mongod's clean exit,
    # rather than the wrapper's signal status. The image has its own deadline.
    [[ $persistent == true ]] || server=(timeout --kill-after=5s 300s "${server[@]}")
    "${server[@]}" >/dev/null 2>/dev/null &
    mongod_pid=$!
    (
        while kill -0 "$mongod_pid" 2>/dev/null; do
            usage=$(du -sk -- "$db_path" 2>/dev/null | awk '{print $1}')
            if [[ ! $usage =~ ^[0-9]+$ || $usage -gt $((restore_mib * 1024)) ]]; then
                printf '%s\n' 'restore budget exceeded' > "$work/restore-budget-exceeded"
                kill "$mongod_pid" 2>/dev/null || true
                exit
            fi
            sleep 1
        done
    ) &
    monitor_pid=$!
    local ready=false i
    for ((i=0; i<40; i++)); do
        kill -0 "$mongod_pid" 2>/dev/null || break
        if (ulimit -f 64; CHECKPOINT_PHASE="$ready_phase" timeout --kill-after=1s 3s mongo --nodb --norc --quiet /opt/openlap-checkpoint/report.js) >|"$work/readiness" 2>|"$work/readiness-diagnostic"; then
            kill -0 "$mongod_pid" 2>/dev/null || break
            ready=true; break
        fi
        sleep 0.25
    done
    [[ $ready == true ]] || fail 'isolated loopback MongoDB did not become ready'
    kill -0 "$mongod_pid" 2>/dev/null || fail 'isolated MongoDB exited before restore'
    run_private 'isolated target identity check' 64 "$work/readiness" env CHECKPOINT_PHASE="$ready_phase" mongo --nodb --norc --quiet /opt/openlap-checkpoint/report.js
}
clean_shutdown() {
    # A timeout/kill or nonzero child status must not yield a success receipt.
    run_private 'persistent database fsync' 64 "$work/fsync" env CHECKPOINT_PHASE=persistent-fsync mongo --nodb --norc --quiet /opt/openlap-checkpoint/report.js
    kill "$monitor_pid" 2>/dev/null || true; wait "$monitor_pid" 2>/dev/null || true; monitor_pid=
    kill -TERM "$mongod_pid" || fail 'persistent MongoDB exited before clean shutdown'
    local i
    for ((i=0; i<100; i++)); do kill -0 "$mongod_pid" 2>/dev/null || break; sleep 0.1; done
    kill -0 "$mongod_pid" 2>/dev/null && fail 'persistent MongoDB did not shut down cleanly'
    wait "$mongod_pid" || fail 'persistent MongoDB shutdown returned failure'
    mongod_pid=
    sync -f "$db_path"
}
start_server
run_private 'isolated full restore' 2048 "$work/restore-output" mongorestore --host=127.0.0.1 --port=37017 --archive="$work/archive.gz" --gzip --stopOnError --numParallelCollections=1
run_private 'isolated restored database verification' 2048 "$work/restored.json" env CHECKPOINT_PHASE="$restored_phase" mongo --nodb --norc --quiet /opt/openlap-checkpoint/report.js
[[ ! -e $work/restore-budget-exceeded ]] || fail 'isolated restore exceeded disk budget'
restore_kib=$(du -sk -- "$db_path" | awk '{print $1}')
[[ $restore_kib =~ ^[0-9]+$ && $restore_kib -le $((restore_mib * 1024)) ]] || fail 'isolated restore exceeds disk budget'
verify_sha=$(sha256sum -- "$work/archive.gz"); verify_sha=${verify_sha%% *}
[[ $verify_sha == "$expected_archive_sha" ]] || fail 'private archive snapshot changed during rehearsal'
run_private 'rehearsal report verification' 2048 "$work/result.json" env CHECKPOINT_PHASE=rehearsal-finish \
    CHECKPOINT_ARCHIVE_SHA256="$archive_sha" CHECKPOINT_ARCHIVE_SIZE="$snapshot_size" CHECKPOINT_EXPANDED_SIZE="$expanded_size" \
    mongo --nodb --norc --quiet /opt/openlap-checkpoint/report.js
if [[ $persistent == true ]]; then
    clean_shutdown
    start_server
    run_private 'persistent cold database verification' 2048 "$work/cold.json" env CHECKPOINT_PHASE="$restored_phase" mongo --nodb --norc --quiet /opt/openlap-checkpoint/report.js
    cmp -s -- "$work/restored.json" "$work/cold.json" || fail 'persistent database changed across cold restart'
    export CHECKPOINT_COLD_RESTART_VERIFIED=true
fi
if [[ $index_plugins == true ]]; then
    run_private 'plugin artifact index projection' 1024 "$work/artifact-index.json" env CHECKPOINT_PHASE="$index_phase" \
        CHECKPOINT_ARCHIVE_SHA256="$archive_sha" CHECKPOINT_ARCHIVE_SIZE="$snapshot_size" CHECKPOINT_EXPANDED_SIZE="$expanded_size" \
        mongo --nodb --norc --quiet /opt/openlap-checkpoint/report.js
    run_private 'post-index restored database verification' 2048 "$work/index-after.json" env CHECKPOINT_PHASE="$restored_phase" \
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
if [[ $persistent == true ]]; then
    clean_shutdown
    [[ ! -e $work/restore-budget-exceeded ]] || fail 'persistent restore exceeded disk budget'
    restore_kib=$(du -sk -- "$db_path" | awk '{print $1}')
    [[ $restore_kib =~ ^[0-9]+$ && $restore_kib -le $((restore_mib * 1024)) ]] || fail 'persistent restore exceeds disk budget'
    export CHECKPOINT_CLEAN_SHUTDOWN_VERIFIED=true CHECKPOINT_FSYNC_VERIFIED=true
    run_private 'persistent restore receipt validation' 64 "$work/result.json" env CHECKPOINT_PHASE=persistent-finish \
        CHECKPOINT_ARCHIVE_SHA256="$archive_sha" CHECKPOINT_ARCHIVE_SIZE="$snapshot_size" CHECKPOINT_EXPANDED_SIZE="$expanded_size" \
        CHECKPOINT_INDEX_SHA256="$index_sha" CHECKPOINT_INDEX_SIZE="$index_size" \
        mongo --nodb --norc --quiet /opt/openlap-checkpoint/report.js
    [[ $(stat -c %s -- "$work/result.json") -le 4096 ]] || fail 'persistent restore receipt exceeds budget'
else
    kill "$monitor_pid" 2>/dev/null || true; wait "$monitor_pid" 2>/dev/null || true; monitor_pid=
    kill "$mongod_pid" 2>/dev/null || true; wait "$mongod_pid" 2>/dev/null || true; mongod_pid=
fi
set -C
publish_report() {
    cat -- "$work/result.json" > "$output/$report_name.partial"
    sync -f "$output/$report_name.partial"
    report_publication_started=true
    ln -- "$output/$report_name.partial" "$output/$report_name"; rm -- "$output/$report_name.partial"
    sync -f "$output"
}
# The persistent acceptance receipt is published last, after its bound index.
[[ $persistent == true ]] || publish_report
if [[ $index_plugins == true ]]; then
    cat -- "$work/artifact-index.json" > "$output/artifact-index.json.partial"
    published_sha=$(sha256sum -- "$output/artifact-index.json.partial"); published_sha=${published_sha%% *}
    [[ $published_sha == "$index_sha" ]] || fail 'plugin artifact index copy differs from its verified snapshot'
    sync -f "$output/artifact-index.json.partial"
    index_publication_started=true
    ln -- "$output/artifact-index.json.partial" "$output/artifact-index.json"; rm -- "$output/artifact-index.json.partial"
    sync -f "$output"
    if [[ $persistent == true ]]; then
        publish_report
        printf '%s\n' 'OPENLAP-PERSISTENT-MONGO-RESTORE-REPORT-V1'
        cat -- "$output/restore.json"
        printf '%s\n' 'OPENLAP-PERSISTENT-MONGO-RESTORE-REPORT-END-V1'
    else
        printf '%s\n' 'OPENLAP-CHECKPOINT-PLUGIN-INDEX-REPORT-V1'
        cat -- "$work/index-summary.json"
        printf '%s\n' 'OPENLAP-CHECKPOINT-PLUGIN-INDEX-REPORT-END-V1'
    fi
else
    printf '%s\n' 'OPENLAP-CHECKPOINT-REHEARSAL-REPORT-V1'
    cat -- "$output/$report_name"
    printf '%s\n' 'OPENLAP-CHECKPOINT-REHEARSAL-REPORT-END-V1'
fi
