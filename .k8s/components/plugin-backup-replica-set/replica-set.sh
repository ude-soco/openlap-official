#!/bin/bash
# No credential input, filesystem repair, config rewrite or raw Mongo output.
set +x
set -eu
ulimit -c 0
case "${1-}" in
  initialize) seconds=150 ;;
  verify) seconds=8 ;;
  *) printf '%s\n' MONGODB_REPLICA_SET_ACTION_REJECTED >&2; exit 1 ;;
esac
[[ $# == 1 ]] || exit 1
export OPENLAP_RS_ACTION=$1
result=0
timeout --kill-after=2s "${seconds}s" mongo --nodb --norc --quiet /opt/openlap-replica-set/replica-set.js >/dev/null 2>&1 || result=$?
if [[ $result == 0 ]]; then
  printf '%s\n' MONGODB_SINGLE_NODE_PRIMARY_VERIFIED
  exit 0
fi
case "$result" in
  10) reason=SETTINGS_REJECTED ;;
  20) reason=SERVER_PREREQUISITE_REJECTED ;;
  21) reason=NEW_OPLOG_CAPACITY_REJECTED ;;
  30) reason=EXISTING_CONFIGURATION_REJECTED ;;
  31) reason=ADVERTISED_HOST_IS_NOT_THIS_SERVER ;;
  124|137) reason=STARTUP_TIMED_OUT ;;
  *) reason=INITIALIZATION_OR_PRIMARY_UNAVAILABLE ;;
esac
printf '%s\n' "MONGODB_REPLICA_SET_${reason}" >&2
exit 1
