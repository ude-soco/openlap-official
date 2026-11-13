#!/usr/bin/env python3
"""Explicit fresh Garage RF3 setup and verification; no Kubernetes API client."""
import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import signal
import stat
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request

LIMIT = 65536
VERSION = "2.5.0"
GARAGE = "/usr/local/bin/garage"
SAFE = re.compile(r"[a-z0-9][a-z0-9-]{0,61}[a-z0-9]|[a-z0-9]")
NODE = re.compile(r"[a-f0-9]{64}")
STAGE = "configuration"


class Incomplete(Exception):
    pass


class Unexpected(Incomplete):
    pass


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, _request, _response, _code, _message, _headers, _url):
        raise Incomplete()


def require(value):
    if not value:
        raise Incomplete()


def encoded(value):
    return (json.dumps(value, sort_keys=True, separators=(",", ":")) + "\n").encode()


def digest(value):
    return hashlib.sha256(value).hexdigest()


def parse(data):
    require(0 < len(data) <= LIMIT)
    def pairs(items):
        result = {}
        for key, value in items:
            require(key not in result)
            result[key] = value
        return result
    return json.loads(data, object_pairs_hook=pairs, parse_constant=lambda _: require(False))


def read(path, maximum=LIMIT):
    # Kubernetes projected ConfigMaps/Secrets use symlinks inside trusted RO mounts.
    with open(path, "rb") as stream:
        require(stat.S_ISREG(os.fstat(stream.fileno()).st_mode))
        value = stream.read(maximum + 1)
    require(0 < len(value) <= maximum)
    return value


def sync_dir(path):
    descriptor = os.open(path, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        os.fsync(descriptor)
    finally:
        os.close(descriptor)


def publish(path, value):
    data = encoded(value)
    require(len(data) <= LIMIT and not path.is_symlink())
    pending = path.with_name(path.name + ".partial")
    descriptor = os.open(pending, os.O_CREAT | os.O_EXCL | os.O_WRONLY | os.O_NOFOLLOW, 0o600)
    with os.fdopen(descriptor, "wb") as stream:
        stream.write(data)
        stream.flush()
        os.fsync(stream.fileno())
    os.link(pending, path)
    try:
        sync_dir(path.parent)
        pending.unlink()
        sync_dir(path.parent)
    except BaseException:
        path.unlink()
        raise
    return data


def physical_directory(path):
    path = Path(path)
    require(path.is_absolute() and str(path) == os.path.normpath(str(path)))
    current = Path("/")
    for part in path.parts[1:]:
        current /= part
        require(not current.is_symlink() and current.is_dir())
    return path


class Configuration:
    FIELDS = {"schemaVersion", "installationId", "statefulSetName", "rpcServiceName", "namespace",
              "clusterDomain", "bucket", "region", "capacityBytes", "zones", "expectedNodeIds", "expectedBucketId"}

    def __init__(self, value):
        require(type(value) is dict and set(value) == self.FIELDS and type(value["schemaVersion"]) is int and value["schemaVersion"] == 1)
        require(isinstance(value["installationId"], str) and re.fullmatch(r"[a-z0-9][a-z0-9-]{15,63}", value["installationId"]))
        for key in ("statefulSetName", "rpcServiceName", "namespace"):
            require(isinstance(value[key], str) and SAFE.fullmatch(value[key]))
        require(len(value["statefulSetName"]) <= 52)
        for key in ("clusterDomain", "region", "bucket"):
            require(isinstance(value[key], str) and re.fullmatch(r"[a-z0-9][a-z0-9.-]{0,250}", value[key]))
        require(3 <= len(value["bucket"]) <= 63 and ".." not in value["bucket"])
        require(re.fullmatch(r"[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]", value["bucket"]))
        require(all(SAFE.fullmatch(label) for label in value["clusterDomain"].split(".")))
        require(type(value["capacityBytes"]) is int and 1048576 <= value["capacityBytes"] <= 8 * 1024**4)
        require(type(value["zones"]) is list and len(value["zones"]) == 3)
        require(all(isinstance(zone, str) and re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,62}", zone) for zone in value["zones"]))
        ids = value["expectedNodeIds"]
        require(type(ids) is list and len(ids) in (0, 3) and len(set(ids)) == len(ids))
        require(all(isinstance(identifier, str) and NODE.fullmatch(identifier) for identifier in ids))
        bucket_id = value["expectedBucketId"]
        require(isinstance(bucket_id, str) and ((not ids and bucket_id == "") or
                (len(ids) == 3 and NODE.fullmatch(bucket_id))))
        self.value = value
        self.intent = {key: item for key, item in value.items() if key not in ("expectedNodeIds", "expectedBucketId")}
        self.fingerprint = digest(encoded(self.intent))
        self.names = [value["statefulSetName"] + "-" + str(index) for index in range(3)]
        self.dns = [name + "." + value["rpcServiceName"] + "." + value["namespace"] + ".svc." + value["clusterDomain"] for name in self.names]
        require(all(len(host) <= 253 for host in self.dns))

    def members(self, ids):
        require(len(ids) == 3 and len(set(ids)) == 3 and all(NODE.fullmatch(item) for item in ids))
        return [{"id": identifier, "hostname": self.names[index], "dns": self.dns[index],
                 "zone": self.value["zones"][index], "capacityBytes": self.value["capacityBytes"],
                 "tags": ["openlap-rf3", self.value["installationId"], str(index)]}
                for index, identifier in enumerate(ids)]


def secret(directory, name):
    value = read(Path(directory) / name, 1024).decode("ascii").removesuffix("\n")
    require(16 <= len(value) <= 512 and all(33 <= ord(character) <= 126 for character in value))
    return value


def secret_descriptor(value):
    # Linux-only runner: sealed anonymous RAM files expose no filesystem entry.
    descriptor = os.memfd_create("openlap-garage-credential", os.MFD_CLOEXEC | os.MFD_ALLOW_SEALING)
    try:
        os.fchmod(descriptor, 0o600)
        remaining = value.encode("ascii")
        while remaining:
            count = os.write(descriptor, remaining)
            require(count > 0)
            remaining = remaining[count:]
        os.lseek(descriptor, 0, os.SEEK_SET)
        seals = fcntl.F_SEAL_WRITE | fcntl.F_SEAL_GROW | fcntl.F_SEAL_SHRINK | fcntl.F_SEAL_SEAL
        fcntl.fcntl(descriptor, fcntl.F_ADD_SEALS, seals)
        require(fcntl.fcntl(descriptor, fcntl.F_GET_SEALS) & seals == seals)
        return descriptor
    except BaseException:
        os.close(descriptor)
        raise


class Api:
    def __init__(self, token, seconds=120):
        self.token = token
        self.end = time.monotonic() + seconds
        self.opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())

    def request(self, host, operation, body=None):
        global STAGE
        labels = {"GetNodeInfo": "node identity", "GetClusterStatus": "cluster membership",
                  "GetClusterLayout": "cluster layout", "UpdateClusterLayout": "layout staging",
                  "ApplyClusterLayout": "layout commit", "ConnectClusterNodes": "peer connection",
                  "ListKeys": "key inventory", "ListBuckets": "bucket inventory", "ImportKey": "key import",
                  "GetKeyInfo": "application key verification", "CreateBucket": "bucket creation",
                  "AllowBucketKey": "bucket access grant", "GetBucketInfo": "bucket verification"}
        STAGE = labels.get(operation.split("?", 1)[0], "admin operation")
        remaining = self.end - time.monotonic()
        require(remaining > 0 and re.fullmatch(r"[a-z0-9][a-z0-9.-]{0,252}", host))
        data = None if body is None else encoded(body)
        request = urllib.request.Request("http://" + host + ":3903/v2/" + operation, data=data,
            headers={"Authorization": "Bearer " + self.token, "Content-Type": "application/json"})
        with self.opener.open(request, timeout=min(5, remaining)) as response:
            require(response.status == 200 and response.geturl() == request.full_url)
            return parse(response.read(LIMIT + 1))


def self_info(api, host, hostname):
    value = api.request(host, "GetNodeInfo?node=self")
    if not (type(value) is dict and not value.get("error") and len(value.get("success", {})) == 1):
        raise Unexpected()
    identifier, info = next(iter(value["success"].items()))
    if not (NODE.fullmatch(identifier) and info.get("nodeId") == identifier and info.get("hostname") == hostname
            and info.get("garageVersion", "").lstrip("v") == VERSION):
        raise Unexpected()
    return identifier


def normalized_roles(rows):
    require(type(rows) is list)
    result = []
    for row in rows:
        require(type(row) is dict and NODE.fullmatch(row.get("id", "")))
        result.append({key: row.get(key) for key in ("id", "zone", "capacity", "tags")})
    require(len({row["id"] for row in result}) == len(result))
    return sorted(result, key=lambda row: row["id"])


def roles(members):
    return sorted([{"id": member["id"], "zone": member["zone"], "capacity": member["capacityBytes"], "tags": member["tags"]}
                   for member in members], key=lambda row: row["id"])


def membership(api, host, members, minimum_up=3):
    value = api.request(host, "GetClusterStatus")
    nodes = value.get("nodes")
    require(type(nodes) is list and len(nodes) == 3)
    expected = {member["id"]: member for member in members}
    if any(row.get("id") not in expected or row.get("draining") is not False for row in nodes):
        raise Unexpected()
    require({row.get("id") for row in nodes} == set(expected))
    require(all(row.get("draining") is False for row in nodes))
    require(value.get("layoutVersion") == 1)
    require(sum(row.get("isUp") is True for row in nodes) >= minimum_up)
    return value


def verify_layout(api, host, members):
    value = api.request(host, "GetClusterLayout")
    if value.get("version") not in (0, 1):
        raise Unexpected()
    if value.get("version") == 1 and (value.get("stagedRoleChanges") or value.get("stagedParameters") is not None
            or normalized_roles(value.get("roles")) != roles(members)):
        raise Unexpected()
    require(value.get("version") == 1 and not value.get("stagedRoleChanges") and value.get("stagedParameters") is None)
    require(normalized_roles(value.get("roles")) == roles(members))
    require(value.get("parameters", {}).get("zoneRedundancy") == "maximum")
    membership(api, host, members)
    return value


def application_key(directory):
    access = secret(directory, "access-key-id")
    require(re.fullmatch(r"[A-Za-z0-9_.-]{16,128}", access))
    return access, secret(directory, "secret-access-key")


def verify_storage(api, host, config, access, key_secret, create=False):
    keys = api.request(host, "ListKeys?limit=2")
    require(type(keys) is list and len(keys) <= 1 and all(row.get("id") == access for row in keys))
    buckets = api.request(host, "ListBuckets?limit=2")
    require(type(buckets) is list and len(buckets) <= 1)
    require(all(row.get("globalAliases") == [config.value["bucket"]] and not row.get("localAliases") for row in buckets))
    require((keys and buckets) or create)
    require((create and config.value["expectedBucketId"] == "") or
            (not create and buckets[0].get("id") == config.value["expectedBucketId"]))
    if create:
        # Only this invocation's fresh 0->1 layout may create resources, and both
        # namespaces must be empty before any import/create operation.
        require(keys == [] and buckets == [])
    if not keys:
        require(create)
        api.request(host, "ImportKey", {"accessKeyId": access, "secretAccessKey": key_secret, "name": config.value["installationId"]})
    key = api.request(host, "GetKeyInfo?id=" + urllib.parse.quote(access, safe="") + "&showSecretKey=true")
    require(key.get("accessKeyId") == access and key.get("secretAccessKey") == key_secret)
    require(key.get("name") == config.value["installationId"] and key.get("expired") is False and key.get("expiration") is None)
    require(key.get("permissions") == {"createBucket": False})
    if not buckets:
        require(create)
        api.request(host, "CreateBucket", {"globalAlias": config.value["bucket"]})
        buckets = api.request(host, "ListBuckets?limit=2")
    require(len(buckets) == 1 and buckets[0].get("globalAliases") == [config.value["bucket"]] and not buckets[0].get("localAliases"))
    bucket_id = buckets[0].get("id")
    require(isinstance(bucket_id, str) and NODE.fullmatch(bucket_id))
    info = api.request(host, "GetBucketInfo?id=" + bucket_id)
    require(info.get("globalAliases") == [config.value["bucket"]] and info.get("websiteAccess") is False)
    require(not info.get("websiteConfig") and not info.get("corsRules") and not info.get("lifecycleRules"))
    require(info.get("quotas") == {"maxSize": None, "maxObjects": None})
    grants = info.get("keys")
    require(type(grants) is list and len(grants) <= 1 and all(row.get("accessKeyId") == access for row in grants))
    require(all(not row.get("bucketLocalAliases") for row in grants))
    if not grants or grants[0].get("permissions") != {"read": True, "write": True, "owner": False}:
        require(create and all(row.get("permissions", {}).get("owner") is False for row in grants))
        api.request(host, "AllowBucketKey", {"bucketId": bucket_id, "accessKeyId": access,
                    "permissions": {"read": True, "write": True, "owner": False}})
        info = api.request(host, "GetBucketInfo?id=" + bucket_id)
    require(len(info.get("keys", [])) == 1 and info["keys"][0].get("permissions") == {"read": True, "write": True, "owner": False})
    key = api.request(host, "GetKeyInfo?id=" + urllib.parse.quote(access, safe=""))
    require(len(key.get("buckets", [])) == 1 and key["buckets"][0].get("id") == bucket_id)
    require(not key["buckets"][0].get("localAliases"))
    require(key["buckets"][0].get("permissions") == {"read": True, "write": True, "owner": False})
    return bucket_id


def record(config, members, access):
    return {"schemaVersion": 1, "status": "GARAGE_RF3_INSTALLATION_INTENT", "configuration": config.intent,
            "configurationSha256": config.fingerprint, "members": members, "applicationKeyIdSha256": digest(access.encode()),
            "scope": "Trusted installation intent; not evidence of completed setup, independent workers, backup or application acceptance"}


def report(value, label):
    data = encoded(value)
    require(len(data) <= LIMIT)
    sys.stdout.buffer.write(("OPENLAP-GARAGE-RF3-" + label + "-V1\n").encode())
    sys.stdout.buffer.write(data)
    sys.stdout.buffer.write(("SHA256=" + digest(data) + "\nOPENLAP-GARAGE-RF3-" + label + "-END-V1\n").encode())
    sys.stdout.buffer.flush()


def bootstrap(action, config, directory, output, intent_path=None, intent_sha=None):
    api = Api(secret(directory, "admin-token"))
    access, key_secret = application_key(directory)
    ids = []
    for host, name in zip(config.dns, config.names):
        while True:
            try:
                ids.append(self_info(api, host, name))
                break
            except Unexpected:
                raise
            except (OSError, ValueError, Incomplete):
                require(time.monotonic() < api.end)
                time.sleep(.25)
    members = config.members(ids)
    wanted = record(config, members, access)
    trusted = intent_path is not None
    if trusted:
        data = read(intent_path)
        require(isinstance(intent_sha, str) and re.fullmatch(r"[a-f0-9]{64}", intent_sha) and digest(data) == intent_sha)
        require(parse(data) == wanted and config.value["expectedNodeIds"] == ids)
    else:
        require(action == "initialize" and config.value["expectedNodeIds"] == [])
    primary = config.dns[0]
    if not trusted:
        for host in config.dns:
            layout = api.request(host, "GetClusterLayout")
            require(layout.get("version") == 0 and not layout.get("roles") and not layout.get("stagedRoleChanges") and layout.get("stagedParameters") is None)
            # Replicated key/bucket tables have no readable quorum before the
            # initial layout. Freshness is enforced by the server's owned-volume
            # marker and the operator's fresh-claim gate; check tables after apply.
            known = api.request(host, "GetClusterStatus").get("nodes", [])
            require(known and all(row.get("id") in ids and row.get("draining") is False for row in known))
    output = physical_directory(Path(output).parent) / Path(output).name
    require(output.name not in ("", ".", "..") and not output.exists() and not output.is_symlink())
    output.mkdir(mode=0o700)
    sync_dir(output.parent)
    publish(output / "intent.json", wanted)
    report(wanted, "INTENT")
    if action == "reconnect" or (action == "initialize" and not trusted):
        connected = api.request(primary, "ConnectClusterNodes", [member["id"] + "@" + member["dns"] + ":3901" for member in members[1:]])
        require(type(connected) is list and len(connected) == 2 and all(row.get("success") is True for row in connected))
    fresh_setup = False
    if action == "initialize" and not trusted:
        for host in config.dns:
            layout = api.request(host, "GetClusterLayout")
            require(layout.get("version") == 0 and not layout.get("roles") and not layout.get("stagedRoleChanges") and layout.get("stagedParameters") is None)
            known = api.request(host, "GetClusterStatus").get("nodes", [])
            require(known and all(row.get("id") in ids and row.get("draining") is False for row in known))
        api.request(primary, "UpdateClusterLayout", {"roles": roles(members)})
        staged = api.request(primary, "GetClusterLayout")
        require(staged.get("version") == 0 and normalized_roles(staged.get("stagedRoleChanges")) == roles(members))
        # Exactly one initial apply. A trusted rerun is verification-only, even
        # when a stale node still reports version zero after an ambiguous apply.
        api.request(primary, "ApplyClusterLayout", {"version": 1})
        fresh_setup = True
    for host in config.dns:
        while True:
            try:
                verify_layout(api, host, members)
                break
            except Unexpected:
                raise
            except (OSError, ValueError, Incomplete):
                require(time.monotonic() < api.end)
                time.sleep(.25)
    bucket_id = verify_storage(api, primary, config, access, key_secret, create=fresh_setup)
    completed = {"schemaVersion": 1, "status": "GARAGE_RF3_CONFIGURATION_VERIFIED", "intentSha256": digest(encoded(wanted)),
                 "installationId": config.value["installationId"], "members": members, "layoutVersion": 1,
                 "bucketId": bucket_id, "scope": "Configuration only; independent workers, node-loss availability, backup and application acceptance remain external gates"}
    publish(output / "verified.json", completed)
    try:
        report(completed, "REPORT")
    except BaseException:
        (output / "verified.json").unlink()
        sync_dir(output)
        raise


def server(config, directory, data):
    pod = os.environ.get("POD_NAME", "")
    require(pod in config.names and os.environ.get("POD_NAMESPACE") == config.value["namespace"])
    index = config.names.index(pod)
    data = Path(data)
    parent = physical_directory(data.parent)
    if data.name == "garage":
        require(all(path.name in ("garage", "lost+found") and path.is_dir() and not path.is_symlink()
                    for path in parent.iterdir()))
        if not data.exists():
            data.mkdir(mode=0o700)
            sync_dir(parent)
    data = physical_directory(data)
    marker = data / ".openlap-rf3-installation.json"
    expected = {"schemaVersion": 1, "installationId": config.value["installationId"], "podName": pod,
                "configurationSha256": config.fingerprint}
    if marker.exists():
        require(not marker.is_symlink() and parse(read(marker)) == expected)
        require(all(path.name in (marker.name, ".openlap-rf3-node.json", "meta", "blocks") for path in data.iterdir()))
        require(all((data / name).is_dir() and not (data / name).is_symlink() for name in ("meta", "blocks")))
    else:
        require(not marker.is_symlink() and not any(data.iterdir()))
        publish(marker, expected)
        (data / "meta").mkdir(mode=0o700)
        (data / "blocks").mkdir(mode=0o700)
        sync_dir(data)
    pin = data / ".openlap-rf3-node.json"
    if pin.exists():
        require(not pin.is_symlink())
        pinned_value = parse(read(pin))
        require(set(pinned_value) == {"nodeId", "privateKeySha256"})
        pinned = pinned_value.get("nodeId")
        require(isinstance(pinned, str) and NODE.fullmatch(pinned))
        require(isinstance(pinned_value["privateKeySha256"], str) and NODE.fullmatch(pinned_value["privateKeySha256"]))
        for name, size in (("node_key", 64), ("node_key.pub", 32)):
            path = data / "meta" / name
            require(path.is_file() and not path.is_symlink() and path.stat().st_size == size)
        require(read(data / "meta" / "node_key.pub", 32).hex() == pinned)
        require(digest(read(data / "meta" / "node_key", 64)) == pinned_value["privateKeySha256"])
    else:
        require(not pin.is_symlink() and not config.value["expectedNodeIds"])
        require(not any((data / "meta").iterdir()) and not any((data / "blocks").iterdir()))
    work = Path(tempfile.mkdtemp(prefix="openlap-garage-", dir="/tmp"))
    process = None
    descriptors = []
    try:
        rpc, admin = secret(directory, "rpc-secret"), secret(directory, "admin-token")
        require(re.fullmatch(r"[a-f0-9]{64}", rpc))
        for value in (rpc, admin):
            descriptors.append(secret_descriptor(value))
        peers = config.value["expectedNodeIds"]
        bootstrap_peers = [] if not peers else [peers[i] + "@" + config.dns[i] + ":3901" for i in range(3) if i != index]
        settings = ('replication_factor=3\nconsistency_mode="consistent"\ndb_engine="lmdb"\nmetadata_fsync=true\ndata_fsync=true\n'
                    'metadata_auto_snapshot_interval="6h"\nmetadata_dir=' + json.dumps(str(data / "meta")) + '\ndata_dir=' + json.dumps(str(data / "blocks")) + '\n'
                    'rpc_bind_addr="0.0.0.0:3901"\nrpc_public_addr=' + json.dumps(config.dns[index] + ":3901") + '\nrpc_secret_file=' + json.dumps("/proc/self/fd/" + str(descriptors[0])) + '\n'
                    'bootstrap_peers=' + json.dumps(bootstrap_peers) + '\n[s3_api]\ns3_region=' + json.dumps(config.value["region"]) + '\napi_bind_addr="0.0.0.0:3900"\n'
                    '[admin]\napi_bind_addr="0.0.0.0:3903"\nadmin_token_file=' + json.dumps("/proc/self/fd/" + str(descriptors[1])) + '\nmetrics_require_token=true\n')
        # Keep the generated config anonymous and immutable too. It contains
        # public settings and descriptor paths, never the credential values.
        descriptors.append(secret_descriptor(settings))
        environment = {"PATH": "/usr/local/bin:/usr/bin:/bin", "HOME": str(work), "TMPDIR": str(work), "LANG": "C"}
        process = subprocess.Popen([GARAGE, "-c", "/proc/self/fd/" + str(descriptors[2]), "server"], stdout=subprocess.DEVNULL,
                                   stderr=subprocess.DEVNULL, start_new_session=True, env=environment, pass_fds=tuple(descriptors))
        api = Api(admin, seconds=30)
        while True:
            require(process.poll() is None)
            try:
                own = self_info(api, "127.0.0.1", pod)
                break
            except Unexpected:
                raise
            except (OSError, ValueError, Incomplete):
                require(time.monotonic() < api.end)
                time.sleep(.25)
        if pin.exists():
            require(not pin.is_symlink() and parse(read(pin))["nodeId"] == own)
        else:
            require(not peers)
            publish(pin, {"nodeId": own, "privateKeySha256": digest(read(data / "meta" / "node_key", 64))})
        if peers:
            require(own == peers[index])
        require(process.wait() == 0)
    finally:
        try:
            if process is not None and process.poll() is None:
                try:
                    os.killpg(process.pid, signal.SIGTERM)
                    try:
                        process.wait(timeout=5)
                    except subprocess.TimeoutExpired:
                        os.killpg(process.pid, signal.SIGKILL)
                        process.wait()
                except ProcessLookupError:
                    pass
        finally:
            try:
                for descriptor in descriptors:
                    os.close(descriptor)
            finally:
                shutil.rmtree(work)


def ready(config, directory, data):
    pod = os.environ.get("POD_NAME", "")
    require(pod in config.names and len(config.value["expectedNodeIds"]) == 3)
    api = Api(secret(directory, "admin-token"), seconds=5)
    own = self_info(api, "127.0.0.1", pod)
    require(own == config.value["expectedNodeIds"][config.names.index(pod)])
    pinned = parse(read(Path(data) / ".openlap-rf3-node.json"))
    require(pinned.get("nodeId") == own and pinned.get("privateKeySha256") == digest(read(Path(data) / "meta/node_key", 64)))
    members = config.members(config.value["expectedNodeIds"])
    layout = api.request("127.0.0.1", "GetClusterLayout")
    require(layout.get("version") == 1 and normalized_roles(layout.get("roles")) == roles(members))
    require(not layout.get("stagedRoleChanges") and layout.get("stagedParameters") is None)
    membership(api, "127.0.0.1", members, minimum_up=2)


class Parser(argparse.ArgumentParser):
    def error(self, _message):
        raise Incomplete()


def main(argv=None):
    global STAGE
    STAGE = "configuration"
    parser = Parser(description=__doc__)
    parser.add_argument("action", choices=("serve", "ready", "initialize", "verify", "reconnect"))
    parser.add_argument("--config", required=True)
    parser.add_argument("--secrets", required=True)
    parser.add_argument("--data", default="/data/garage")
    parser.add_argument("--output")
    parser.add_argument("--intent")
    parser.add_argument("--intent-sha256")
    os.umask(0o077)
    try:
        options = parser.parse_args(argv)
        def interrupted(_number, _frame):
            raise Incomplete()
        for number in (signal.SIGTERM, signal.SIGINT, signal.SIGALRM):
            signal.signal(number, interrupted)
        config = Configuration(parse(read(options.config)))
        if options.action == "serve":
            server(config, options.secrets, options.data)
        elif options.action == "ready":
            ready(config, options.secrets, options.data)
        else:
            require(options.output is not None and (options.action == "initialize" or options.intent is not None))
            signal.alarm(180)
            bootstrap(options.action, config, options.secrets, options.output, options.intent, options.intent_sha256)
        return 0
    except BaseException:
        print("Garage RF3 operation incomplete at " + STAGE + "; raw diagnostics withheld. No automatic cluster repair was attempted.", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
