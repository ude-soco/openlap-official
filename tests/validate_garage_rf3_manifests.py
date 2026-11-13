"""Render synthetic RF3 inputs only; never load a kubeconfig or deployment overlay.

Requires kubectl, Ruby's standard YAML/JSON libraries, Docker and the preloaded
pinned kubeconform image. No cluster connection or credential files are used.
"""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
VALIDATOR = "ghcr.io/yannh/kubeconform@sha256:85dbef6b4b312b99133decc9c6fc9495e9fc5f92293d4ff3b7e1b30f5611823c"
YAML_JSON = r'''text=$stdin.read; docs=text.split(/^---\s*\n/).reject(&:empty?).map { |part| YAML.safe_load(part, permitted_classes: [], permitted_symbols: [], aliases: false) }; puts JSON.generate(docs)'''


def main():
    with tempfile.TemporaryDirectory(prefix="openlap-rf3-manifests-") as temporary:
        work = Path(temporary).resolve()
        environment = {"PATH": "/usr/local/bin:/usr/bin:/bin", "HOME": str(work), "KUBECONFIG": os.devnull, "LANG": "C"}
        kubectl, ruby, docker = (shutil.which(tool) for tool in ("kubectl", "ruby", "docker"))
        assert all((kubectl, ruby, docker)), "Install kubectl, Ruby and Docker for isolated validation"
        def run(arguments, payload=None):
            result = subprocess.run(arguments, input=payload, capture_output=True, env=environment, timeout=120)
            assert result.returncode == 0, "Synthetic manifest validation command failed"
            return result.stdout
        def render():
            value = run([kubectl, "--kubeconfig="+os.devnull, "kustomize", str(work)])
            parsed = json.loads(run([ruby, "-rjson", "-ryaml", "-e", YAML_JSON], value))
            return value, parsed
        def document(documents, kind, name=None):
            rows = [row for row in documents if row['kind'] == kind and (name is None or row['metadata']['name'] == name)]
            assert len(rows) == 1
            return rows[0]
        sentinel = {"apiVersion":"apps/v1","kind":"Deployment","metadata":{"name":"unchanged-app"},
                    "spec":{"replicas":1,"selector":{"matchLabels":{"app":"unchanged"}},
                            "template":{"metadata":{"labels":{"app":"unchanged"}},
                                        "spec":{"containers":[{"name":"app","image":"example.invalid/app:synthetic"}]}}}}
        (work/'app.json').write_text(json.dumps(sentinel))
        kustomization = {"apiVersion":"kustomize.config.k8s.io/v1beta1","kind":"Kustomization",
                         "namespace":"synthetic-rf3","namePrefix":"fixture-","resources":["app.json"]}
        (work/'kustomization.yaml').write_text(json.dumps(kustomization))
        _, baseline = render()
        shutil.copytree(ROOT/'.k8s/components/garage-rf3',work/'component')
        config = json.loads((work/'component/settings.json').read_text())
        config.update(installationId="synthetic-installation-001", namespace="synthetic-rf3",
                      statefulSetName="fixture-garage-rf3",rpcServiceName="fixture-garage-rf3-rpc",
                      bucket="synthetic-private-bucket",capacityBytes=67108864,zones=["site-a","site-a","site-b"])
        (work/'component/settings.json').write_text(json.dumps(config))
        kustomization['components']=['component']
        (work/'kustomization.yaml').write_text(json.dumps(kustomization))
        rendered, documents = render()
        assert document(documents,'Deployment') == document(baseline,'Deployment'), "Optional component changed existing application"
        assert len(documents) == 10 and not any(row['kind'] in ('Secret','ServiceAccount','Role','RoleBinding','ClusterRole','CustomResourceDefinition') for row in documents)
        stateful = document(documents,'StatefulSet'); pod=stateful['spec']['template']['spec']
        assert stateful['spec']['replicas'] == 3 and stateful['spec']['podManagementPolicy'] == 'Parallel'
        assert stateful['spec']['updateStrategy'] == {'type':'OnDelete'}
        assert stateful['spec']['persistentVolumeClaimRetentionPolicy'] == {'whenDeleted':'Retain','whenScaled':'Retain'}
        terms=pod['affinity']['podAntiAffinity']['requiredDuringSchedulingIgnoredDuringExecution']
        assert len(terms) == 1 and terms[0]['topologyKey'] == 'kubernetes.io/hostname'
        assert terms[0]['labelSelector']['matchLabels'] == stateful['spec']['selector']['matchLabels']
        assert pod['automountServiceAccountToken'] is False and pod['securityContext']['runAsUser'] == 1000
        assert pod['containers'][0]['args'] == ['--configure-storage']
        assert pod['containers'][0]['securityContext']['capabilities']['drop'] == ['ALL']
        assert pod['containers'][0]['securityContext']['readOnlyRootFilesystem'] is True
        disruption=document(documents,'PodDisruptionBudget')
        assert disruption['spec']['minAvailable'] == 2 and disruption['spec']['selector'] == stateful['spec']['selector']
        rpc=document(documents,'Service','fixture-garage-rf3-rpc')
        assert rpc['spec']['clusterIP'] == 'None' and rpc['spec']['publishNotReadyAddresses'] is True
        for name in ('s3','admin'):
            service=document(documents,'Service','fixture-garage-rf3-'+name)
            assert service['spec'].get('type','ClusterIP') == 'ClusterIP'
            assert not service['spec'].get('publishNotReadyAddresses',False)
        job=document(documents,'Job')['spec']; assert job['backoffLimit'] == 0 and job['activeDeadlineSeconds'] == 240
        assert job['template']['spec']['automountServiceAccountToken'] is False
        assert job['template']['spec']['containers'][0]['args'] == ['--configure-storage']
        policies=[row for row in documents if row['kind']=='NetworkPolicy']; assert len(policies)==2
        assert all(set(policy['spec']['policyTypes'])=={'Ingress','Egress'} for policy in policies)
        assert not any(key.partition('/')[0] == 'argocd.argoproj.io' for row in documents for key in row['metadata'].get('annotations',{}))
        before=document(documents,'ConfigMap')['metadata']['name']
        config['expectedNodeIds']=['a'*64,'b'*64,'c'*64]
        config['expectedBucketId']='d'*64
        (work/'component/settings.json').write_text(json.dumps(config))
        _, pinned = render(); after=document(pinned,'ConfigMap')['metadata']['name']
        assert before != after, "Peer pinning did not update the ConfigMap content hash"
        assert document(pinned,'StatefulSet')['spec']['template']['spec']['volumes'][0]['configMap']['name'] == after
        assert document(pinned,'Job')['spec']['template']['spec']['volumes'][0]['configMap']['name'] == after
        assert 'garage-rf3' not in (ROOT/'.k8s/base/kustomization.yaml').read_text(), "Component was selected by default"
        docker_config=work/'docker-config'; docker_config.mkdir(mode=0o700)
        result=run([docker,'--host=unix:///var/run/docker.sock','--config',str(docker_config),'run','--rm','--pull=never','-i',
                    '--read-only','--user=1000:1000','--cap-drop=ALL','--security-opt=no-new-privileges',
                    VALIDATOR,'-strict','-summary','-kubernetes-version','1.31.0'],rendered)
        print(result.decode().strip())
        print('PASS: synthetic RF3 manifests, strict three-host scheduling, unchanged application, secret/API isolation, retained claims and explicit pinned replacement')


if __name__=='__main__': main()
