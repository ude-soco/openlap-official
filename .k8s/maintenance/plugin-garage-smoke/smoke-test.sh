#!/bin/sh
# AWS output stays in the disposable working volume; never enable shell tracing.
set -eu
export AWS_EC2_METADATA_DISABLED=true AWS_CONFIG_FILE=/dev/null
export AWS_SHARED_CREDENTIALS_FILE=/dev/null AWS_PAGER= AWS_MAX_ATTEMPTS=1
work=$(mktemp -d /tmp/openlap-garage-probe.XXXXXX)
trap 'rm -rf "$work"' EXIT HUP INT TERM
fail() { echo GARAGE_STORAGE_PROBE_REJECTED >&2; exit 1; }
s3() { aws --no-cli-pager --cli-connect-timeout 3 --cli-read-timeout 10 s3api "$@"; }
download() {
  s3 get-object --bucket "$PLUGIN_STORAGE_S3_BUCKET" --key "$1" "$work/download.jar" >"$work/response" 2>"$work/error" || fail
  printf '%s  %s\n' "$2" "$work/download.jar" | sha256sum -c - >"$work/check" 2>&1 || fail
}
if test "${PLUGIN_STORAGE_PILOT_REQUIRE_EXISTING:-false}" = true; then
  test -n "${PLUGIN_STORAGE_PERSISTENCE_KEY:-}" || fail
  digest=${PLUGIN_STORAGE_PERSISTENCE_SHA256:-}
  test "${#digest}" = 64 || fail
  case "$digest" in *[!0-9a-f]*) fail ;; esac
  # Check the previous artifact before writing anything. A new probe uses a
  # separate key, so parallel clients cannot replace this recovery evidence.
  test "$PLUGIN_STORAGE_PERSISTENCE_KEY" != _pilot/reusable-roundtrip-v1.jar || fail
  download "$PLUGIN_STORAGE_PERSISTENCE_KEY" "$digest"
fi
base64 -d /smoke/probe.jar.b64 >"$work/probe.jar" 2>"$work/error" || fail
digest=a53591e422a071af63be62f915f112f2ca26c68d6604d57a893ae2b37ec510c3
printf '%s  %s\n' "$digest" "$work/probe.jar" | sha256sum -c - >"$work/check" 2>&1 || fail
key=_pilot/reusable-roundtrip-v1.jar
s3 put-object --bucket "$PLUGIN_STORAGE_S3_BUCKET" --key "$key" --body "$work/probe.jar" >"$work/response" 2>"$work/error" || fail
download "$key" "$digest"
if aws --no-cli-pager --no-sign-request --cli-connect-timeout 3 --cli-read-timeout 10 s3api get-object \
    --bucket "$PLUGIN_STORAGE_S3_BUCKET" --key "$key" "$work/anonymous.jar" >"$work/response" 2>"$work/error"; then
  fail
fi
grep -q AccessDenied "$work/error" || fail
if s3 create-bucket --bucket openlap-unpermitted-probe-bucket >"$work/response" 2>"$work/error"; then
  fail
fi
grep -q AccessDenied "$work/error" || fail
if test "${PLUGIN_STORAGE_PILOT_CHECK_NETWORK:-false}" = true; then
  if aws --endpoint-url "$GARAGE_ADMIN_ENDPOINT" --no-sign-request --no-cli-pager \
      --cli-connect-timeout 2 --cli-read-timeout 2 s3api list-buckets >"$work/response" 2>"$work/error"; then
    fail
  fi
  grep -Eq 'Connect timeout|Read timeout|Could not connect|Connection was closed' "$work/error" || fail
fi
echo GARAGE_STORAGE_PROBE_VERIFIED
