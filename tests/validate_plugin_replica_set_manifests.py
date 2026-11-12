#!/usr/bin/env python3
"""Compare optional replica-set composition against an isolated public base."""
import copy
import json
from pathlib import Path
import shutil
import subprocess
import tempfile

import yaml

ROOT = Path(__file__).resolve().parents[1]
MONGO = 'fixture-openlap-official-analyticsframework-mongo'


def fixture(root, selected):
    shutil.copytree(ROOT / '.k8s/base', root / 'base')
    shutil.copytree(ROOT / '.k8s/components/plugin-backup-replica-set', root / 'replica-set')
    (root / 'synthetic-secret.yaml').write_text('''apiVersion: v1
kind: Secret
metadata:
  name: synthetic-mongo-credentials
type: Opaque
stringData:
  SYNTHETIC_CREDENTIAL: disposable-fixture-only
''')
    value = '''apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: synthetic-rs
namePrefix: fixture-
resources: [base, synthetic-secret.yaml]
patches:
- target:
    kind: Deployment
    name: openlap-official-analyticsframework-mongo
  patch: |-
    apiVersion: apps/v1
    kind: Deployment
    metadata:
      name: openlap-official-analyticsframework-mongo
    spec:
      template:
        spec:
          containers:
          - name: mongo
            env:
            - {name: SYNTHETIC_EXISTING_ENV, value: keep-this-input}
            envFrom:
            - secretRef:
                name: synthetic-mongo-credentials
            resources:
              requests: {cpu: 10m, memory: 64Mi}
              limits: {cpu: 500m, memory: 256Mi}
            lifecycle:
              preStop:
                exec:
                  command: [/bin/true]
'''
    if selected:
        value += '''components: [replica-set]
configMapGenerator:
- name: openlap-plugin-backup-replica-set
  literals:
  - replicaSetName=synthetic-rs
  - advertisedHost=fixture-openlap-official-analyticsframework-mongo.synthetic-rs.svc.cluster.local:27017
  - oplogSizeMiB=16
'''
    (root / 'kustomization.yaml').write_text(value)
    result = subprocess.run(['kubectl', '--kubeconfig=/dev/null', 'kustomize', str(root)], capture_output=True)
    if result.returncode:
        raise AssertionError(result.stderr.decode()[-3000:])
    return list(yaml.safe_load_all(result.stdout))


def verify(before, after):
    a = {(row['kind'], row['metadata']['name']): row for row in before}
    b = {(row['kind'], row['metadata']['name']): row for row in after}
    additions = set(b) - set(a)
    assert len(additions) == 1 and next(iter(additions))[0] == 'ConfigMap'
    assert set(a) <= set(b)
    assert a['Service', MONGO]['spec'].get('publishNotReadyAddresses') is not True
    assert b['Service', MONGO]['spec']['publishNotReadyAddresses'] is True
    svc = copy.deepcopy(b['Service', MONGO]); svc['spec'].pop('publishNotReadyAddresses')
    assert svc == a['Service', MONGO]
    deployment = copy.deepcopy(b['Deployment', MONGO])
    old = a['Deployment', MONGO]
    assert deployment['spec']['replicas'] == old['spec']['replicas'] == 1
    assert deployment['spec']['strategy'] == old['spec']['strategy'] == {'type': 'Recreate'}
    pod = deployment['spec']['template']['spec']; container = pod['containers'][0]
    previous = old['spec']['template']['spec']['containers'][0]
    assert container['name'] == previous['name'] == 'mongo'
    assert container['image'] == previous['image'] == 'mongo:4.4'
    assert container['args'][:-4] == previous['args']
    assert container['args'][-4:] == ['--replSet', '$(OPENLAP_MONGODB_REPLICA_SET)', '--oplogSize', '$(OPENLAP_MONGODB_OPLOG_SIZE_MIB)']
    container['args'] = container['args'][:-4]
    names = {'OPENLAP_MONGODB_REPLICA_SET', 'OPENLAP_MONGODB_REPLICA_HOST', 'OPENLAP_MONGODB_OPLOG_SIZE_MIB'}
    added_env = [entry for entry in container['env'] if entry['name'] in names]
    assert len(added_env) == 3
    config_name = next(iter(additions))[1]
    assert all(entry['valueFrom']['configMapKeyRef']['name'] == config_name for entry in added_env)
    container['env'] = [entry for entry in container['env'] if entry['name'] not in names]
    assert container['resources'] == previous['resources']
    assert container['envFrom'] == previous['envFrom']
    assert 'postStart' not in container.get('lifecycle', {})
    startup = container.pop('startupProbe')
    assert startup['exec']['command'][-1] == 'initialize'
    assert startup['timeoutSeconds'] == 155 and startup['failureThreshold'] == 1
    readiness = container.pop('readinessProbe')
    assert readiness['exec']['command'][-1] == 'verify' and readiness['timeoutSeconds'] == 10
    mounts = [item for item in container['volumeMounts'] if item['name'] == 'plugin-backup-replica-set']
    assert len(mounts) == 1
    mount = mounts[0]
    container['volumeMounts'] = [item for item in container['volumeMounts'] if item['name'] != 'plugin-backup-replica-set']
    assert mount == {'name': 'plugin-backup-replica-set', 'mountPath': '/opt/openlap-replica-set', 'readOnly': True}
    added = [volume for volume in pod['volumes'] if volume['name'] == 'plugin-backup-replica-set']
    assert len(added) == 1 and added[0]['configMap']['name'] == config_name
    pod['volumes'] = [volume for volume in pod['volumes'] if volume['name'] != 'plugin-backup-replica-set']
    assert deployment == old
    for key in a:
        if key not in [('Service', MONGO), ('Deployment', MONGO)]:
            assert a[key] == b[key], key
    assert a['PersistentVolumeClaim', MONGO] == b['PersistentVolumeClaim', MONGO]
    for row in after:
        assert row['metadata']['namespace'] == 'synthetic-rs'
        assert not any(name.startswith('argocd.') for name in row['metadata'].get('annotations', {}))
    return {'status': 'OPTIONAL_REPLICA_SET_COMPOSITION_VERIFIED', 'baselineResources': len(before),
            'selectedResources': len(after), 'existingImageArgsDataVolumeCredentialsAndResourcesPreserved': True,
            'servicePublishesBeforeReadiness': True, 'defaultBaseStillStandalone': True,
            'liveOverlayRendered': False, 'kubernetesApiUsed': False}


if __name__ == '__main__':
    with tempfile.TemporaryDirectory(prefix='openlap-replica-set-manifests-') as temporary:
        root = Path(temporary); (root / 'before').mkdir(); (root / 'after').mkdir()
        print(json.dumps(verify(fixture(root / 'before', False), fixture(root / 'after', True)), sort_keys=True))
