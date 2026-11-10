#!/usr/bin/env python3
"""Run artifact integration checks against disposable loopback-only Garage and MongoDB.

No deployment env files, AWS profiles or Kubernetes credentials are read.
"""

import argparse
import os
from pathlib import Path
import secrets
import shutil
import subprocess
import sys
import tempfile
import time

GARAGE = "dxflrs/garage@sha256:677e5b758e4425a325b811c425c026bf35a4bf42f7ddbaa773de3f4fd779a5a5"
MONGO = "mongo@sha256:4be76f674fc4b27859816811b8baa3c51830eb1dbf4ca81a51e26b79edd662ef"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--protocol-only", action="store_true")
    options = parser.parse_args()
    if any(not shutil.which(tool) for tool in ("docker", "aws")):
        raise RuntimeError("Docker and AWS CLI v2 are required.")
    root = Path(__file__).resolve().parents[1]
    instance = "openlap-artifacts-it-" + secrets.token_hex(6)
    garage = instance + "-garage"
    mongo = instance + "-mongo"
    key, secret, rpc = "GK" + secrets.token_hex(12), secrets.token_hex(32), secrets.token_hex(32)
    hidden = (key, secret, rpc)
    environment = dict(os.environ)
    for name in ("AWS_PROFILE", "AWS_SESSION_TOKEN", "AWS_WEB_IDENTITY_TOKEN_FILE", "AWS_ROLE_ARN"):
        environment.pop(name, None)
    environment.update(GARAGE_RPC_SECRET=rpc, GARAGE_DEFAULT_ACCESS_KEY=key,
                       GARAGE_DEFAULT_SECRET_KEY=secret, GARAGE_DEFAULT_BUCKET="openlap-plugin-integration",
                       AWS_ACCESS_KEY_ID=key, AWS_SECRET_ACCESS_KEY=secret, AWS_DEFAULT_REGION="garage",
                       AWS_CONFIG_FILE=os.devnull, AWS_SHARED_CREDENTIALS_FILE=os.devnull,
                       AWS_EC2_METADATA_DISABLED="true", AWS_PAGER="", AWS_MAX_ATTEMPTS="1")

    def run(arguments, check=True, timeout=90):
        result = subprocess.run(arguments, cwd=root, env=environment, capture_output=True,
                                text=True, timeout=timeout)
        if check and result.returncode:
            output = (result.stdout + result.stderr)[-8000:]
            for value in hidden:
                output = output.replace(value, "[REDACTED]")
            raise RuntimeError("Artifact test command failed:\n" + output)
        return result

    with tempfile.TemporaryDirectory(prefix="openlap-artifacts-it-") as folder:
        work = Path(folder)
        config = work / "garage.toml"
        config.write_text('''metadata_dir = "/data/meta"
data_dir = "/data/blocks"
db_engine = "lmdb"
replication_factor = 1
rpc_bind_addr = "127.0.0.1:3901"
rpc_public_addr = "127.0.0.1:3901"
[s3_api]
s3_region = "garage"
api_bind_addr = "[::]:3900"
''')
        data = work / "data"
        data.mkdir()
        try:
            run(["docker", "run", "-d", "--name", garage, "--user", f"{os.getuid()}:{os.getgid()}",
                 "--read-only", "--cap-drop", "ALL", "--security-opt", "no-new-privileges",
                 "-p", "127.0.0.1::3900", "--mount", f"type=bind,source={config},target=/etc/garage.toml,readonly",
                 "--mount", f"type=bind,source={data},target=/data", "--env", "GARAGE_RPC_SECRET",
                 "--env", "GARAGE_DEFAULT_ACCESS_KEY", "--env", "GARAGE_DEFAULT_SECRET_KEY",
                 "--env", "GARAGE_DEFAULT_BUCKET", GARAGE, "/garage", "server", "--single-node", "--default-bucket"])
            port = run(["docker", "port", garage, "3900/tcp"]).stdout.strip().rsplit(":", 1)[1]
            endpoint = "http://127.0.0.1:" + port

            def s3(*arguments, check=True):
                return run(["aws", "--endpoint-url", endpoint, "--region", "garage", "--no-cli-pager",
                            "--cli-connect-timeout", "2", "--cli-read-timeout", "5", "s3api", *arguments], check=check)

            deadline = time.monotonic() + 60
            while s3("head-bucket", "--bucket", "openlap-plugin-integration", check=False).returncode:
                if time.monotonic() > deadline:
                    raise RuntimeError("Disposable Garage did not become ready.")
                time.sleep(0.5)
            fixture = work / "conditional.txt"
            fixture.write_text("first object version\n")
            s3("put-object", "--bucket", "openlap-plugin-integration", "--key", "_fixture/conditional",
               "--if-none-match", "*", "--body", str(fixture))
            fixture.write_text("different object version\n")
            duplicate = s3("put-object", "--bucket", "openlap-plugin-integration", "--key", "_fixture/conditional",
                           "--if-none-match", "*", "--body", str(fixture), check=False)
            result = work / "conditional-result.txt"
            s3("get-object", "--bucket", "openlap-plugin-integration", "--key", "_fixture/conditional", str(result))
            conditional = duplicate.returncode != 0 and "PreconditionFailed" in duplicate.stderr
            if conditional and result.read_text() != "first object version\n":
                raise RuntimeError("The conditional-write response did not match stored bytes.")
            if not conditional and (duplicate.returncode or result.read_text() != "different object version\n"):
                raise RuntimeError("Unexpected conditional-write probe result.")
            print("PASS: Garage protocol probe; native conditional PUT enforcement=" + str(conditional)
                  + ". Application integrity checks are tested by the Java client.", flush=True)
            if options.protocol_only:
                return
            run(["docker", "run", "-d", "--name", mongo, "-p", "127.0.0.1::27017", MONGO])
            deadline = time.monotonic() + 60
            while run(["docker", "exec", mongo, "mongo", "--quiet", "--eval", "db.runCommand({ping:1}).ok"], check=False).returncode:
                if time.monotonic() > deadline:
                    raise RuntimeError("Disposable MongoDB did not become ready.")
                time.sleep(0.5)
            mongo_port = run(["docker", "port", mongo, "27017/tcp"]).stdout.strip().rsplit(":", 1)[1]
            environment.update(PLUGIN_IT_S3_ENDPOINT=endpoint, PLUGIN_IT_S3_ACCESS_KEY=key,
                               PLUGIN_IT_S3_SECRET_KEY=secret, PLUGIN_IT_S3_BUCKET="openlap-plugin-integration",
                               PLUGIN_IT_MONGO_URI="mongodb://127.0.0.1:" + mongo_port)
            run(["./mvnw", "-q", "-Pplugin-artifact-it", "verify"], timeout=600)
            print("PASS: real MongoDB/Garage migration, Java SDK and independent backend caches.", flush=True)
        finally:
            for name in (garage, mongo):
                run(["docker", "rm", "-f", name], check=False)


if __name__ == "__main__":
    try:
        main()
    except (OSError, RuntimeError, subprocess.SubprocessError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
