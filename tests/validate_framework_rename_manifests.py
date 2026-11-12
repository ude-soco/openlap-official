#!/usr/bin/env python3
"""Render public synthetic name-cutover fixtures without a cluster or operator files."""
import copy
import json
from pathlib import Path
import shutil
import subprocess
import tempfile

import yaml

ROOT = Path(__file__).resolve().parents[1]
PREFIX = "fixture-"
NEW_MONGO = PREFIX + "openlap-official-analyticsframework-mongo"
OLD_MONGO = PREFIX + "openlap-official-openlap-analyticsframework-mongo"
BACKEND = PREFIX + "openlap-official-analyticsframework-web"
FRONTEND = PREFIX + "openlap-official-indicatorframework-web"
SENTINEL = PREFIX + "unrelated-learninglocker-mongo"
NAMESPACE = "synthetic-framework-rename"


def fixture(directory, legacy=False, replica=False, compatibility=False, reverse=False):
    shutil.copytree(ROOT / ".k8s/base", directory / "base")
    for name in ("legacy-mongo-identity", "plugin-backup-replica-set", "backend-rename-network-compatibility"):
        shutil.copytree(ROOT / ".k8s/components" / name, directory / name)
    shutil.copytree(ROOT / ".k8s/storage/plugin-garage", directory / "garage")
    (directory / "sentinel.yaml").write_text("""apiVersion: apps/v1
kind: Deployment
metadata:
  name: unrelated-learninglocker-mongo
  labels: {app.kubernetes.io/name: learninglocker, service: mongo}
spec:
  replicas: 1
  selector:
    matchLabels: {app.kubernetes.io/name: learninglocker, service: mongo}
  template:
    metadata:
      labels: {app.kubernetes.io/name: learninglocker, service: mongo}
    spec:
      containers: [{name: mongo, image: mongo:4.4}]
""")
    value = {
        "apiVersion": "kustomize.config.k8s.io/v1beta1", "kind": "Kustomization",
        "namespace": NAMESPACE, "namePrefix": PREFIX,
        "resources": ["base", "garage", "sentinel.yaml"],
        "patches": [
            {"target": {"kind": "Deployment", "labelSelector": "app.kubernetes.io/name=openlap-official,service=mongo"},
             "patch": """apiVersion: apps/v1
kind: Deployment
metadata: {name: ignored-target-name}
spec:
  template:
    spec:
      containers:
      - name: mongo
        env: [{name: SYNTHETIC_EXISTING_SETTING, value: preserve-this-value}]
        resources:
          requests: {cpu: 10m, memory: 64Mi}
          limits: {cpu: 500m, memory: 256Mi}
"""},
            {"target": {"kind": "PersistentVolumeClaim", "labelSelector": "app.kubernetes.io/name=openlap-official,service=mongo"},
             "patch": """apiVersion: v1
kind: PersistentVolumeClaim
metadata: {name: ignored-target-name}
spec:
  storageClassName: synthetic-retained-storage-class
  resources:
    requests: {storage: 2Gi}
"""},
        ],
    }
    selected = []
    if legacy:
        selected.append("legacy-mongo-identity")
    if replica:
        selected.append("plugin-backup-replica-set")
        host = (OLD_MONGO if legacy else NEW_MONGO) + "." + NAMESPACE + ".svc.cluster.local:27017"
        value["configMapGenerator"] = [{"name": "openlap-plugin-backup-replica-set", "literals": [
            "replicaSetName=synthetic-unchanged-set", "advertisedHost=" + host, "oplogSizeMiB=16"]}]
    if reverse:
        selected.reverse()
    if compatibility:
        selected.append("backend-rename-network-compatibility")
    if selected:
        value["components"] = selected
    (directory / "kustomization.yaml").write_text(yaml.safe_dump(value, sort_keys=False))
    result = subprocess.run(["kubectl", "--kubeconfig=/dev/null", "kustomize", str(directory)],
                            capture_output=True, check=False)
    if result.returncode:
        raise AssertionError(result.stderr.decode()[-4000:])
    rows = list(yaml.safe_load_all(result.stdout))
    assert len({(row["kind"], row["metadata"]["name"]) for row in rows}) == len(rows)
    assert all(row["metadata"]["namespace"] == NAMESPACE for row in rows)
    return {(row["kind"], row["metadata"]["name"]): row for row in rows}


def mongo_identity(rows, expected):
    found = [row for (kind, _), row in rows.items() if kind == "Deployment"
             and row["metadata"].get("labels", {}).get("app.kubernetes.io/name") == "openlap-official"
             and row["metadata"].get("labels", {}).get("service") == "mongo"]
    assert len(found) == 1, "A cutover must never create a second MongoDB controller"
    deployment = found[0]
    assert deployment["metadata"]["name"] == expected
    assert ("Deployment", NEW_MONGO if expected == OLD_MONGO else OLD_MONGO) not in rows
    claim = rows["PersistentVolumeClaim", expected]
    assert claim["spec"] == {"accessModes": ["ReadWriteOnce"],
                             "resources": {"requests": {"storage": "2Gi"}},
                             "storageClassName": "synthetic-retained-storage-class"}
    pod = deployment["spec"]["template"]
    assert deployment["spec"]["replicas"] == 1
    assert deployment["spec"]["strategy"] == {"type": "Recreate"}
    assert deployment["spec"]["selector"]["matchLabels"] == pod["metadata"]["labels"]
    assert rows["Service", expected]["spec"]["selector"] == pod["metadata"]["labels"]
    data = next(volume for volume in pod["spec"]["volumes"] if volume["name"] == "mongo")
    assert data["persistentVolumeClaim"]["claimName"] == expected
    container = pod["spec"]["containers"][0]
    assert container["image"] == "mongo:4.4"
    assert {entry["name"]: entry.get("value") for entry in container["env"]}["SYNTHETIC_EXISTING_SETTING"] == "preserve-this-value"
    backend_deployment = rows["Deployment", BACKEND]
    assert backend_deployment["spec"]["strategy"] == {
        "type": "RollingUpdate", "rollingUpdate": {"maxUnavailable": 0, "maxSurge": 1}}
    backend = backend_deployment["spec"]["template"]["spec"]["containers"][0]
    for probe, failures in (("startupProbe", 60), ("readinessProbe", 3)):
        assert backend[probe] == {"httpGet": {"path": "/api/v1/content/news", "port": 8090},
                                  "periodSeconds": 5, "timeoutSeconds": 5, "failureThreshold": failures}
    assert "livenessProbe" not in backend
    env = {entry["name"]: entry.get("value") for entry in backend["env"]}
    assert env["MONGODB_PRIMARY_URI"] == "mongodb://" + expected + ":27017"
    assert env["OPENLAP_MONGODB_DB"] == "openlap" and env["LRS_MONGODB_DB"] == "learninglocker_v2"
    assert backend["image"] == "ghcr.io/ude-soco/openlap-official-analyticsframework:edge"
    frontend_deployment = rows["Deployment", FRONTEND]
    assert frontend_deployment["spec"]["strategy"] == {
        "type": "RollingUpdate", "rollingUpdate": {"maxUnavailable": 0, "maxSurge": 1}}
    frontend = frontend_deployment["spec"]["template"]["spec"]["containers"][0]
    for probe, failures in (("startupProbe", 12), ("readinessProbe", 2)):
        assert frontend[probe] == {"httpGet": {"path": "/", "port": 8080},
                                   "periodSeconds": 5, "timeoutSeconds": 2, "failureThreshold": failures}
    assert "livenessProbe" not in frontend
    assert rows["Service", FRONTEND]["spec"]["ports"][0]["targetPort"] == frontend["ports"][0]["containerPort"] == 8080
    assert frontend["image"] == "ghcr.io/ude-soco/openlap-official-indicatorframework:edge"
    ingress = next(row for (kind, _), row in rows.items() if kind == "Ingress")
    paths = ingress["spec"]["rules"][0]["http"]["paths"]
    assert [entry["backend"]["service"]["name"] for entry in paths] == [BACKEND, FRONTEND]
    return deployment


def retained_identity_changes_only(before, after):
    assert len(before) == len(after)
    for kind in ("Deployment", "Service", "PersistentVolumeClaim"):
        original = copy.deepcopy(before[kind, NEW_MONGO])
        original["metadata"]["name"] = OLD_MONGO
        original["metadata"]["labels"]["app.kubernetes.io/component"] = "openlap-analyticsframework"
        if kind == "Deployment":
            original["spec"]["selector"]["matchLabels"]["app.kubernetes.io/component"] = "openlap-analyticsframework"
            original["spec"]["template"]["metadata"]["labels"]["app.kubernetes.io/component"] = "openlap-analyticsframework"
            original["spec"]["template"]["spec"]["volumes"][0]["persistentVolumeClaim"]["claimName"] = OLD_MONGO
        elif kind == "Service":
            original["spec"]["selector"]["app.kubernetes.io/component"] = "openlap-analyticsframework"
        assert original == after[kind, OLD_MONGO], kind
    for key, row in before.items():
        if key[1] == NEW_MONGO:
            continue
        expected = copy.deepcopy(row)
        if key == ("Deployment", BACKEND):
            for entry in expected["spec"]["template"]["spec"]["containers"][0]["env"]:
                if entry["name"] == "MONGODB_PRIMARY_URI":
                    entry["value"] = "mongodb://" + OLD_MONGO + ":27017"
        assert expected == after[key], key


def replica_set(rows, expected):
    deployment = mongo_identity(rows, expected)
    container = deployment["spec"]["template"]["spec"]["containers"][0]
    assert container["args"][-4:] == ["--replSet", "$(OPENLAP_MONGODB_REPLICA_SET)",
                                      "--oplogSize", "$(OPENLAP_MONGODB_OPLOG_SIZE_MIB)"]
    assert container["args"].count("--replSet") == 1
    assert container["startupProbe"]["exec"]["command"][-1] == "initialize"
    assert container["readinessProbe"]["exec"]["command"][-1] == "verify"
    assert rows["Service", expected]["spec"]["publishNotReadyAddresses"] is True
    reference = next(entry for entry in container["env"] if entry["name"] == "OPENLAP_MONGODB_REPLICA_HOST")
    config = rows["ConfigMap", reference["valueFrom"]["configMapKeyRef"]["name"]]
    assert config["data"]["advertisedHost"] == expected + "." + NAMESPACE + ".svc.cluster.local:27017"
    assert config["data"]["replicaSetName"] == "synthetic-unchanged-set"
    assert "replSetReconfig" not in config["data"]["replica-set.js"]
    sentinel = rows["Deployment", SENTINEL]["spec"]["template"]["spec"]
    assert sentinel == {"containers": [{"name": "mongo", "image": "mongo:4.4"}]}, "Unrelated MongoDB was modified"


def networking(before, after):
    name = PREFIX + "openlap-plugin-storage"
    original = copy.deepcopy(before["NetworkPolicy", name])
    selector = original["spec"]["ingress"][0]["from"][0]["podSelector"]
    assert selector["matchLabels"]["app.kubernetes.io/component"] == "analyticsframework"
    selector["matchLabels"].pop("app.kubernetes.io/component")
    selector["matchExpressions"] = [{"key": "app.kubernetes.io/component", "operator": "In",
                                      "values": ["analyticsframework", "openlap-analyticsframework"]}]
    assert original == after["NetworkPolicy", name]
    for key in before:
        if key != ("NetworkPolicy", name):
            assert before[key] == after[key], key


if __name__ == "__main__":
    with tempfile.TemporaryDirectory(prefix="openlap-framework-rename-manifests-") as temporary:
        root = Path(temporary)
        cases = {}
        for name, options in {
            "default": {}, "legacy": {"legacy": True}, "replica": {"replica": True},
            "legacy-replica": {"legacy": True, "replica": True},
            "replica-legacy": {"legacy": True, "replica": True, "reverse": True},
            "network": {"compatibility": True},
        }.items():
            directory = root / name
            directory.mkdir()
            cases[name] = fixture(directory, **options)
        mongo_identity(cases["default"], NEW_MONGO)
        mongo_identity(cases["legacy"], OLD_MONGO)
        retained_identity_changes_only(cases["default"], cases["legacy"])
        replica_set(cases["replica"], NEW_MONGO)
        replica_set(cases["legacy-replica"], OLD_MONGO)
        replica_set(cases["replica-legacy"], OLD_MONGO)
        assert cases["legacy-replica"] == cases["replica-legacy"], "Component order changed storage identity"
        networking(cases["default"], cases["network"])
        print(json.dumps({"status": "FRAMEWORK_RENAME_COMPOSITION_VERIFIED", "syntheticCases": len(cases),
                          "defaultNewIdentities": True, "legacyMongoControllerClaimDnsAndSelectorsRetained": True,
                          "noSecondMongoWriter": True, "replicaSetBothComponentOrders": True,
                          "networkOverlapIsOptIn": True, "unrelatedMongoUntouched": True,
                          "databaseNamesUnchanged": True, "backendReadinessGatesDatabaseBackedApi": True,
                          "frontendReadinessGatesSpaOnNginxPort": True,
                          "kubernetesApiUsed": False}, sort_keys=True))
