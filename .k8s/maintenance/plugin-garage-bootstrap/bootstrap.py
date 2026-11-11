"""Explicitly configure one bucket and its application key through Garage v2."""
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

STAGE = 'settings'

class Rejected(Exception):
    pass


def require(condition):
    if not condition:
        raise Rejected()


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *_args):
        raise Rejected()


class Settings:
    def __init__(self, env):
        self.bucket = env['PLUGIN_STORAGE_S3_BUCKET']
        require(re.fullmatch(r'[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]', self.bucket))
        require('..' not in self.bucket and not re.fullmatch(r'[0-9.]+', self.bucket))
        self.endpoint = env['GARAGE_ADMIN_ENDPOINT'].rstrip('/')
        parsed = urllib.parse.urlsplit(self.endpoint)
        require(parsed.scheme in ('http', 'https') and parsed.hostname and not parsed.username
                and not parsed.password and not parsed.path and not parsed.query and not parsed.fragment)
        self.token = env['GARAGE_ADMIN_TOKEN']
        self.key = env['PLUGIN_STORAGE_S3_ACCESS_KEY']
        self.secret = env['PLUGIN_STORAGE_S3_SECRET_KEY']
        require(re.fullmatch(r'GK[a-fA-F0-9]{24}', self.key))
        require(all(isinstance(value, str) and 16 <= len(value) <= 4096
                    and all(33 <= ord(char) <= 126 for char in value)
                    for value in (self.token, self.secret)))
        self.quota = {}
        for field, variable, default in (
                ('maxSize', 'PLUGIN_STORAGE_MAX_BYTES', 1073741824),
                ('maxObjects', 'PLUGIN_STORAGE_MAX_OBJECTS', 1000)):
            value = int(env.get(variable, default))
            require(1 <= value <= 8 * 1024 ** 4)
            self.quota[field] = value


class Api:
    def __init__(self, settings):
        self.settings = settings
        self.opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())

    def call(self, operation, body=None, query=None, missing=False):
        global STAGE
        STAGE = operation
        url = self.settings.endpoint + '/v2/' + operation
        if query:
            url += '?' + urllib.parse.urlencode(query)
        data = None if body is None else json.dumps(body).encode('utf-8')
        request = urllib.request.Request(url, data=data, headers={
            'Authorization': 'Bearer ' + self.settings.token,
            'Content-Type': 'application/json'})
        try:
            with self.opener.open(request, timeout=5) as response:
                require(response.status == 200 and response.geturl() == url)
                value = response.read(65537)
                require(len(value) <= 65536)
                return json.loads(value)
        except urllib.error.HTTPError as error:
            if error.code == 404 and missing:
                return None
            raise Rejected() from None
        except (OSError, ValueError):
            raise Rejected() from None


def configure(settings, api):
    deadline = time.monotonic() + 90
    while time.monotonic() < deadline:
        try:
            if api.call('GetClusterHealth').get('status') == 'healthy':
                break
        except Rejected:
            pass
        time.sleep(1)
    else:
        raise Rejected()
    query = {'id': settings.key, 'showSecretKey': 'false'}
    known = api.call('GetKeyInfo', query=query, missing=True)
    if known is None:
        api.call('ImportKey', {'accessKeyId': settings.key, 'secretAccessKey': settings.secret,
                              'name': 'OpenLAP plugin application'})
    api.call('UpdateKey', {'deny': {'createBucket': True}}, query={'id': settings.key})
    bucket = api.call('GetBucketInfo', query={'globalAlias': settings.bucket}, missing=True)
    if bucket is None:
        bucket = api.call('CreateBucket', {'globalAlias': settings.bucket})
    identifier = bucket['id']
    require(isinstance(identifier, str) and re.fullmatch(r'[a-f0-9]{64}', identifier))
    api.call('UpdateBucket', {'websiteAccess': {'enabled': False}, 'quotas': settings.quota},
             query={'id': identifier})
    access = {'bucketId': identifier, 'accessKeyId': settings.key}
    api.call('DenyBucketKey', dict(access, permissions={'read': False, 'write': False, 'owner': True}))
    api.call('AllowBucketKey', dict(access, permissions={'read': True, 'write': True, 'owner': False}))
    info = api.call('GetKeyInfo', query=query)
    require(not info.get('expired') and not info.get('permissions', {}).get('createBucket', True))
    grants = info.get('buckets', [])
    selected = [row for row in grants if row.get('id') == identifier]
    require(len(selected) == 1 and selected[0].get('permissions') ==
            {'read': True, 'write': True, 'owner': False})
    require(all(not any(row.get('permissions', {}).values()) for row in grants
                if row.get('id') != identifier))
    verified = api.call('GetBucketInfo', query={'globalAlias': settings.bucket})
    require(verified.get('id') == identifier and verified.get('quotas') == settings.quota)
    require(verified.get('websiteAccess') is False)
    return {'schemaVersion': 1, 'status': 'GARAGE_APPLICATION_BUCKET_VERIFIED'}


def main():
    try:
        settings = Settings(os.environ)
        print(json.dumps(configure(settings, Api(settings)), sort_keys=True))
    except (Rejected, KeyError, TypeError, ValueError, AttributeError):
        print(json.dumps({'status': 'GARAGE_CONFIGURATION_REJECTED', 'stage': STAGE}), file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
