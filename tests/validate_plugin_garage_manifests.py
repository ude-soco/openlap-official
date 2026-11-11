#!/usr/bin/env python3
"""Render only a public Garage fixture with synthetic env files; no live overlay."""
import json
from pathlib import Path
import shutil
import subprocess
import tempfile

import yaml


ROOT = Path(__file__).resolve().parents[1]


def render_fixture(directory):
    root = Path(directory)
    for name, source in (
            ('storage', '.k8s/storage/plugin-garage'),
            ('bootstrap', '.k8s/maintenance/plugin-garage-bootstrap'),
            ('smoke', '.k8s/maintenance/plugin-garage-smoke')):
        shutil.copytree(ROOT / source, root / name)
    (root / 'openlap-plugin-storage-server.env').write_text(
        'GARAGE_RPC_SECRET=' + '1' * 64 + '\nGARAGE_ADMIN_TOKEN=synthetic-admin-token\n'
        'GARAGE_METRICS_TOKEN=synthetic-metrics-token\n')
    (root / 'openlap-plugin-storage-client.env').write_text(
        'PLUGIN_STORAGE_S3_ACCESS_KEY=GK' + '2' * 24 + '\n'
        'PLUGIN_STORAGE_S3_SECRET_KEY=synthetic-client-secret\n')
    (root / 'kustomization.yaml').write_text('''apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: synthetic-openlap-storage
namePrefix: fixture-
resources: [storage, bootstrap, smoke]
configMapGenerator:
- name: openlap-plugin-storage
  behavior: merge
  literals:
  - PLUGIN_STORAGE_S3_ENDPOINT=http://fixture-openlap-plugin-storage:3900
  - PLUGIN_STORAGE_S3_REGION=garage
  - PLUGIN_STORAGE_S3_BUCKET=synthetic-openlap-bucket
  - GARAGE_ADMIN_ENDPOINT=http://fixture-openlap-plugin-storage-admin:3903
  - PLUGIN_STORAGE_PILOT_REQUIRE_EXISTING=true
  - PLUGIN_STORAGE_PERSISTENCE_KEY=_pilot/prior-artifact.jar
  - PLUGIN_STORAGE_PERSISTENCE_SHA256=a53591e422a071af63be62f915f112f2ca26c68d6604d57a893ae2b37ec510c3
secretGenerator:
- name: openlap-plugin-storage-server
  behavior: merge
  envs: [openlap-plugin-storage-server.env]
- name: openlap-plugin-storage-client
  behavior: merge
  envs: [openlap-plugin-storage-client.env]
patches:
- target:
    kind: PersistentVolumeClaim
    name: openlap-plugin-storage-data
  patch: |-
    - op: add
      path: /metadata/annotations
      value:
        argocd.argoproj.io/sync-wave: "0"
        argocd.argoproj.io/sync-options: Prune=false,Delete=false
    - op: add
      path: /spec/storageClassName
      value: local-path
''')
    process = subprocess.run(['kubectl', '--kubeconfig=/dev/null', 'kustomize', str(root)],
                             capture_output=True, check=True)
    return list(yaml.safe_load_all(process.stdout))


def verify(resources):
    by_key = {(row['kind'], row['metadata']['name']): row for row in resources}
    assert len(by_key) == len(resources) == 15
    prefix = 'fixture-openlap-plugin-storage'
    provider = by_key['StatefulSet', prefix]
    assert provider['spec']['replicas'] == 1
    pod = provider['spec']['template']['spec']
    assert pod['automountServiceAccountToken'] is False
    assert pod['securityContext']['runAsUser'] == 1000
    assert pod['containers'][0]['args'][-1] == '--single-node'
    assert '@sha256:' in pod['containers'][0]['image']
    claim = by_key['PersistentVolumeClaim', prefix + '-data']
    assert claim['spec']['resources']['requests']['storage'] == '5Gi'
    assert claim['spec']['storageClassName'] == 'local-path'
    assert claim['metadata']['annotations']['argocd.argoproj.io/sync-options'] == 'Prune=false,Delete=false'
    assert by_key['NetworkPolicy', prefix]['spec']['egress'] == []
    assert sum(row['kind'] == 'Secret' for row in resources) == 2
    names = {row['metadata']['name'] for row in resources}
    secret_names = {row['metadata']['name'] for row in resources if row['kind'] == 'Secret'}
    config_names = {row['metadata']['name'] for row in resources if row['kind'] == 'ConfigMap'}
    for row in resources:
        assert row['metadata']['namespace'] == 'synthetic-openlap-storage'
        # The reusable files are independent of Argo; only this fixture's PVC
        # instance patch adds Argo lifecycle annotations.
        if row['kind'] != 'PersistentVolumeClaim':
            assert not any(key.startswith('argocd.') for key in row['metadata'].get('annotations', {}))
        if row['kind'] not in ('StatefulSet', 'Job'):
            continue
        spec = row['spec']['template']['spec']
        assert spec['automountServiceAccountToken'] is False
        assert 'serviceAccountName' not in spec
        for container in spec.get('containers', []) + spec.get('initContainers', []):
            assert '@sha256:' in container['image']
            assert container['securityContext']['readOnlyRootFilesystem'] is True
            assert container['securityContext']['allowPrivilegeEscalation'] is False
            for env in container.get('env', []):
                ref = env.get('valueFrom', {})
                if 'secretKeyRef' in ref:
                    assert ref['secretKeyRef']['name'] in secret_names
                if 'configMapKeyRef' in ref:
                    assert ref['configMapKeyRef']['name'] in config_names
        for volume in spec.get('volumes', []):
            if 'configMap' in volume:
                assert volume['configMap']['name'] in config_names
            if 'secret' in volume:
                assert volume['secret']['secretName'] in secret_names
            if 'persistentVolumeClaim' in volume:
                assert volume['persistentVolumeClaim']['claimName'] in names
    return {'status': 'GARAGE_SYNTHETIC_MANIFESTS_VERIFIED', 'resources': len(resources),
            'liveCredentialsRead': False, 'kubernetesApiUsed': False}


if __name__ == '__main__':
    with tempfile.TemporaryDirectory(prefix='openlap-garage-manifests-') as directory:
        print(json.dumps(verify(render_fixture(directory)), sort_keys=True))
