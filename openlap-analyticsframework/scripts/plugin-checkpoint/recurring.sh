#!/bin/bash
# Fresh-Pod recurring capture/index wrappers. No cluster API, retries or source mutation.
set +x
set -euo pipefail
umask 077
ulimit -c 0
export LC_ALL=C
fail() { printf '%s\n' 'Recurring backup stage incomplete; private client diagnostics withheld.' >&2; exit 1; }
[[ $# == 1 ]] || fail
case "$1" in
    --capture-online) stage=capture; mode=ONLINE; action=--checkpoint-online; header=OPENLAP-CHECKPOINT-ONLINE-REPORT-V2; footer=OPENLAP-CHECKPOINT-ONLINE-REPORT-END-V2 ;;
    --capture-frozen) stage=capture; mode=FROZEN; action=--checkpoint; header=OPENLAP-CHECKPOINT-REPORT-V1; footer=OPENLAP-CHECKPOINT-REPORT-END-V1 ;;
    --index-online) stage=index; mode=ONLINE; action=--index-online-plugin-artifacts ;;
    --index-frozen) stage=index; mode=FROZEN; action=--index-plugin-artifacts ;;
    *) fail ;;
esac
[[ $(id -u) == 1000 && $(id -g) == 1000 ]] || fail
uid=${BACKUP_POD_UID-}
[[ $uid =~ ^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$ ]] || fail
[[ ${BACKUP_DESTINATION_APPROVED-} == true ]] || fail
until=${BACKUP_DESTINATION_VALID_UNTIL-}
if [[ $until != unlimited ]]; then
    [[ $until =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$ ]] || fail
    normalized=$(date -u -d "$until" '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null) || fail
    [[ $normalized == "$until" ]] || fail
    minimum=${BACKUP_MINIMUM_DESTINATION_VALIDITY_SECONDS:-604800}
    [[ $minimum =~ ^[1-9][0-9]{0,7}$ && $minimum -le 31536000 ]] || fail
    expiry=$(date -u -d "$until" +%s 2>/dev/null) || fail
    now=$(date -u +%s) || fail
    [[ $expiry -gt $((now + minimum)) ]] || fail
fi
payload=${BACKUP_MAX_BYTES:-268435456}
files=${BACKUP_MAX_FILES:-2048}
workspace_budget=${BACKUP_WORKSPACE_MAX_BYTES:-1342177280}
scratch_budget=${BACKUP_SCRATCH_MAX_BYTES:-805306368}
archive_mib=${CHECKPOINT_MAX_ARCHIVE_MIB:-16}
restore_mib=${CHECKPOINT_MAX_RESTORE_MIB:-512}
for value in "$payload" "$files" "$workspace_budget" "$scratch_budget" "$archive_mib" "$restore_mib"; do
    [[ $value =~ ^[1-9][0-9]{0,11}$ ]] || fail
done
[[ $payload -le 8589934592 && $files -ge 5 && $files -le 10000 && $archive_mib -le 1024 && $restore_mib -le 1024 ]] || fail
# Original payload + tar + encrypted output + encrypted readback. Include the
# transport's per-file/tar/manifest and age overhead, plus auxiliary metadata.
workspace_peak=$((4 * payload + 3 * ((files + 4) * 2048 + 1048576) + 2 * 4194304 + 4 * 1048576))
scratch_peak=$(((restore_mib + 2 * archive_mib + 32) * 1048576))
[[ $workspace_peak -le $workspace_budget && $scratch_peak -le $scratch_budget ]] || fail
if [[ $stage == capture && $mode == FROZEN ]]; then
    # This references a separately enforced pause. Never derive evidence from a
    # run ID or claim that this tool enforces the freeze.
    [[ ${CHECKPOINT_FREEZE_EVIDENCE-} =~ ^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,159}$ ]] || fail
fi
private_directory() {
    [[ -d $1 && ! -L $1 && $(stat -c %u -- "$1") == 1000 ]] || fail
    case $(stat -c %a -- "$1") in 700|2700) ;; *) fail ;; esac
}
private_file() {
    [[ -f $1 && ! -L $1 && $(stat -c %u -- "$1") == 1000 && $(stat -c %a -- "$1") == 600 && $(stat -c %h -- "$1") == 1 ]] || fail
}
readonly_view() {
    local selected=$1 point options longest= best= line
    while IFS=' ' read -ra line; do
        [[ ${#line[@]} -ge 6 ]] || continue
        point=${line[4]}; options=${line[5]}
        if [[ $selected == "$point" || $selected == "${point%/}/"* ]]; then
            if [[ ${#point} -gt ${#longest} ]]; then longest=$point; best=$options; fi
        fi
    done < /proc/self/mountinfo
    [[ ,$best, == *,ro,* ]] || fail
}
frame() {
    local file=$1 first=$2 last=$3
    [[ $(stat -c %s -- "$file") -le 270336 ]] || fail
    mapfile -t lines < "$file"
    [[ ${#lines[@]} == 3 && ${lines[0]} == "$first" && ${lines[2]} == "$last" ]] || fail
    cat -- "$file"
}
if [[ $stage == capture ]]; then
    [[ -d /workspace && ! -L /workspace && -w /workspace ]] || fail
    free_kib=$(df -Pk -- /workspace | awk 'END {print $4}')
    [[ $free_kib =~ ^[0-9]+$ && $free_kib -gt $((workspace_peak / 1024 + 4096)) ]] || fail
    run=/workspace/run-$uid
    [[ ! -e $run && ! -L $run ]] || fail
    mkdir -m 0700 -- "$run" || fail
    for folder in checkpoints indexes objects encrypted control; do mkdir -m 0700 -- "$run/$folder" || fail; done
    printf '%s\n' "$uid" > "$run/control/pod-uid"
    printf '%s\n' "$mode" > "$run/control/capture-mode"
    export CHECKPOINT_ID=capture-$uid CHECKPOINT_OUTPUT_ROOT=$run/checkpoints
    # Use the supported explicit online source contract unchanged. In particular,
    # an application DB URI path is not silently stripped or converted.
    timeout --kill-after=10s 540s /bin/bash --noprofile --norc /opt/openlap-checkpoint/checkpoint.sh "$action" \
        > "$run/control/capture.log" 2> "$run/control/capture-error.log" || fail
    report=$run/checkpoints/$CHECKPOINT_ID/checkpoint.json
    private_file "$report"
    cp -- "$report" "$run/control/checkpoint-report.json"
    report_sha=$(sha256sum -- "$report"); report_sha=${report_sha%% *}
    [[ $report_sha =~ ^[a-f0-9]{64}$ ]] || fail
    printf '%s\n' "$report_sha" > "$run/control/checkpoint.sha256"
    sync -f "$run/control/checkpoint.sha256"
    frame "$run/control/capture.log" "$header" "$footer"
else
    private_directory /control; private_directory /inputs; private_directory /outputs
    readonly_view /control; readonly_view /inputs
    private_file /control/pod-uid; private_file /control/checkpoint.sha256
    private_file /control/capture-mode
    [[ $(cat /control/pod-uid) == "$uid" ]] || fail
    [[ $(cat /control/capture-mode) == "$mode" ]] || fail
    report_sha=$(cat /control/checkpoint.sha256)
    [[ $report_sha =~ ^[a-f0-9]{64}$ ]] || fail
    export CHECKPOINT_ID=index-$uid CHECKPOINT_OUTPUT_ROOT=/outputs CHECKPOINT_EXPECTED_REPORT_SHA256=$report_sha
    export CHECKPOINT_REPORT_PATH=/inputs/capture-$uid/checkpoint.json
    export CHECKPOINT_ARCHIVE_PATH=/inputs/capture-$uid/database.archive.gz
    private_file "$CHECKPOINT_REPORT_PATH"; private_file "$CHECKPOINT_ARCHIVE_PATH"
    actual=$(sha256sum -- "$CHECKPOINT_REPORT_PATH"); [[ ${actual%% *} == "$report_sha" ]] || fail
    timeout --kill-after=10s 540s /bin/bash --noprofile --norc /opt/openlap-checkpoint/checkpoint.sh "$action" \
        > /outputs/index.log 2> /outputs/index-error.log || fail
    private_file /outputs/$CHECKPOINT_ID/artifact-index.json
    frame /outputs/index.log OPENLAP-CHECKPOINT-PLUGIN-INDEX-REPORT-V1 OPENLAP-CHECKPOINT-PLUGIN-INDEX-REPORT-END-V1
fi
