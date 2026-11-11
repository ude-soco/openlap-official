"""Materialize bounded projected credentials as private files in the RAM volume."""
import os
from pathlib import Path
import stat


def prepare(source=Path('/projected-secrets'), target=Path('/secrets')):
    for name in ('rpc-secret', 'admin-token', 'metrics-token'):
        with (source / name).open('rb') as stream:
            if not stat.S_ISREG(os.fstat(stream.fileno()).st_mode):
                raise ValueError('Invalid credential input.')
            value = stream.read(4097)
        if not 1 <= len(value) <= 4096:
            raise ValueError('Invalid credential input.')
        descriptor = os.open(target / name, os.O_WRONLY | os.O_NOFOLLOW | os.O_CREAT, 0o600)
        with os.fdopen(descriptor, 'wb') as output:
            info = os.fstat(output.fileno())
            if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1 or info.st_uid != os.getuid():
                raise ValueError('Invalid credential output.')
            os.fchmod(output.fileno(), 0o600)
            os.ftruncate(output.fileno(), 0)
            output.write(value)
    print('PRIVATE_SERVER_FILES_READY')


if __name__ == '__main__':
    prepare()
