#!/bin/sh
set -eu
umask 077
PATH=/usr/local/bin:/usr/bin:/bin
export PATH
fail() { printf '%s\n' 'Backup upload configuration or credential staging failed; no client diagnostics exposed.' >&2; exit 1; }
[ "$#" -gt 0 ] || fail
case "$1" in
    --upload-report) program=plugin-backup-upload.py ;;
    --upload-recurring-online|--upload-recurring-frozen) program=plugin-recurring-backup.py ;;
    *) fail ;;
esac
if [ "$program" = plugin-recurring-backup.py ]; then
    # Check the nonsecret activation/expiry envelope before opening a profile.
    python3 -B -c 'import importlib.util; s=importlib.util.spec_from_file_location("guard","/opt/plugin-backup/plugin-recurring-export.py"); m=importlib.util.module_from_spec(s); s.loader.exec_module(m); m.guard()' >/dev/null 2>/dev/null || fail
fi
config_root=/run/plugin-backup-config
selected=$(readlink -f -- "$config_root/rclone.conf.b64" 2>/dev/null) || fail
case "$selected" in "$config_root"/*) ;; *) fail ;; esac
[ -f "$selected" ] && [ -r "$selected" ] || fail
size=$(stat -c %s -- "$selected" 2>/dev/null) || fail
case "$size" in ''|*[!0-9]*) fail ;; esac
[ "$size" -gt 0 ] && [ "$size" -le 131072 ] || fail
private=$(mktemp -d /tmp/plugin-backup-upload.XXXXXXXX 2>/dev/null) || fail
set -C
base64 -d "$selected" > "$private/rclone.conf" 2>/dev/null || fail
size=$(stat -c %s -- "$private/rclone.conf" 2>/dev/null) || fail
[ "$size" -gt 0 ] && [ "$size" -le 65536 ] || fail
base64 -w0 "$private/rclone.conf" > "$private/canonical.b64" 2>/dev/null || fail
cmp -s "$private/canonical.b64" "$selected" 2>/dev/null || fail
export PLUGIN_BACKUP_STAGED_CONFIG="$private/rclone.conf"
exec python3 -B "/opt/plugin-backup/$program" "$@"
