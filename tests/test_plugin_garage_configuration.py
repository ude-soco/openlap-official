"""Only synthetic inputs; no deployment env files or Kubernetes client config."""
import contextlib
import importlib.util
import io
import os
from pathlib import Path
import stat
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]


def load(name, relative):
    spec = importlib.util.spec_from_file_location(name, ROOT / relative)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


bootstrap = load('garage_bootstrap', '.k8s/maintenance/plugin-garage-bootstrap/bootstrap.py')
prepare = load('garage_prepare', '.k8s/storage/plugin-garage/prepare-secrets.py')


class ApiFixture:
    identifier = 'a' * 64

    def __init__(self, settings, *, existing=False, extra=False):
        self.settings, self.existing, self.extra = settings, existing, extra
        self.calls = []

    def call(self, operation, body=None, query=None, missing=False):
        self.calls.append((operation, body, query))
        if operation == 'GetClusterHealth':
            return {'status': 'healthy'}
        if operation == 'GetKeyInfo':
            if not self.existing:
                return None
            buckets = [{'id': self.identifier, 'permissions': {'read': True, 'write': True, 'owner': False}}]
            if self.extra:
                buckets.append({'id': 'b' * 64, 'permissions': {'read': True}})
            return {'expired': False, 'permissions': {'createBucket': False}, 'buckets': buckets}
        if operation == 'ImportKey':
            self.existing = True
        if operation in ('GetBucketInfo', 'CreateBucket'):
            return {'id': self.identifier, 'quotas': self.settings.quota, 'websiteAccess': False}
        return {}


class ConfigurationTests(unittest.TestCase):
    def env(self):
        return {'GARAGE_ADMIN_ENDPOINT': 'http://garage:3903', 'GARAGE_ADMIN_TOKEN': 'synthetic-admin-token',
                'PLUGIN_STORAGE_S3_BUCKET': 'example-plugin-bucket',
                'PLUGIN_STORAGE_S3_ACCESS_KEY': 'GK' + '1' * 24,
                'PLUGIN_STORAGE_S3_SECRET_KEY': 'synthetic-application-secret'}

    def test_bucket_and_quotas_are_instance_inputs(self):
        env = self.env()
        env.update(PLUGIN_STORAGE_MAX_BYTES='2048', PLUGIN_STORAGE_MAX_OBJECTS='25')
        settings = bootstrap.Settings(env)
        self.assertEqual(settings.quota, {'maxSize': 2048, 'maxObjects': 25})
        self.assertEqual(settings.bucket, 'example-plugin-bucket')

    def test_invalid_settings_fail_before_api_requests(self):
        for key, value in [('PLUGIN_STORAGE_S3_BUCKET', '../bad'), ('PLUGIN_STORAGE_S3_BUCKET', '127.0.0.1'),
                           ('GARAGE_ADMIN_ENDPOINT', 'http://user:pass@garage:3903'),
                           ('GARAGE_ADMIN_ENDPOINT', 'http://garage:3903/path'),
                           ('GARAGE_ADMIN_ENDPOINT', 'http://garage:3903?x=1'),
                           ('PLUGIN_STORAGE_S3_ACCESS_KEY', 'wrong-format'),
                           ('PLUGIN_STORAGE_MAX_BYTES', '0'), ('PLUGIN_STORAGE_MAX_OBJECTS', '-1')]:
            env = self.env()
            env[key] = value
            with self.subTest(key=key, value=value), self.assertRaises((bootstrap.Rejected, ValueError)):
                bootstrap.Settings(env)

    def test_fresh_and_repeat_bootstrap_never_fetch_existing_secret(self):
        settings = bootstrap.Settings(self.env())
        for existing in (False, True):
            api = ApiFixture(settings, existing=existing)
            result = bootstrap.configure(settings, api)
            self.assertEqual(result['status'], 'GARAGE_APPLICATION_BUCKET_VERIFIED')
            operations = [row[0] for row in api.calls]
            self.assertEqual(operations.count('ImportKey'), int(not existing))
            for operation, body, query in api.calls:
                if operation == 'GetKeyInfo':
                    self.assertEqual(query['showSecretKey'], 'false')
                if operation == 'AllowBucketKey':
                    self.assertEqual(body['permissions'], {'read': True, 'write': True, 'owner': False})
            self.assertNotIn(settings.secret, str(result))

    def test_additional_bucket_grant_is_rejected(self):
        settings = bootstrap.Settings(self.env())
        with self.assertRaises(bootstrap.Rejected):
            bootstrap.configure(settings, ApiFixture(settings, existing=True, extra=True))

    def test_redirects_are_rejected(self):
        with self.assertRaises(bootstrap.Rejected):
            bootstrap.NoRedirect().redirect_request(None, None, 302, None, None, 'http://other')

    def test_projected_credentials_are_private_bounded_and_not_printed(self):
        with tempfile.TemporaryDirectory() as directory:
            source, target = Path(directory) / 'source', Path(directory) / 'target'
            source.mkdir()
            target.mkdir()
            for name in ('rpc-secret', 'admin-token', 'metrics-token'):
                (source / name).write_bytes(b'synthetic-private-value')
            output = io.StringIO()
            with contextlib.redirect_stdout(output):
                prepare.prepare(source, target)
            self.assertEqual(output.getvalue().strip(), 'PRIVATE_SERVER_FILES_READY')
            for path in target.iterdir():
                self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o600)
                self.assertEqual(path.read_bytes(), b'synthetic-private-value')
            (target / 'rpc-secret').unlink()
            (target / 'rpc-secret').symlink_to(source / 'rpc-secret')
            with self.assertRaises(OSError):
                prepare.prepare(source, target)
            self.assertEqual((source / 'rpc-secret').read_bytes(), b'synthetic-private-value')

    def test_oversized_credential_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            source, target = Path(directory) / 'source', Path(directory) / 'target'
            source.mkdir()
            target.mkdir()
            (source / 'rpc-secret').write_bytes(b'x' * 4097)
            with self.assertRaises(ValueError):
                prepare.prepare(source, target)
            self.assertEqual(list(target.iterdir()), [])

    def test_hardlinked_output_is_rejected_before_content_change(self):
        with tempfile.TemporaryDirectory() as directory:
            source, target = Path(directory) / 'source', Path(directory) / 'target'
            source.mkdir()
            target.mkdir()
            (source / 'rpc-secret').write_bytes(b'synthetic-new-value')
            protected = Path(directory) / 'protected'
            protected.write_bytes(b'synthetic-old-value')
            os.link(protected, target / 'rpc-secret')
            with self.assertRaises(ValueError):
                prepare.prepare(source, target)
            self.assertEqual(protected.read_bytes(), b'synthetic-old-value')


if __name__ == '__main__':
    unittest.main()
