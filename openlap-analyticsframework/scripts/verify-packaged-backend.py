#!/usr/bin/env python3
"""Verify the actual local backend image with disposable databases and HTTP.

Run after building/loading an image:
  python3 -B openlap-analyticsframework/scripts/verify-packaged-backend.py \
    --image sha256:IMAGE_ID

Only immutable, already-local application images are accepted. MongoDB images
are pinned public fixtures. Databases stay on a new internal Docker network.
The backend also joins a fresh application-only HTTP bridge and is published on
a random loopback port. Only synthetic credentials/data enter the containers;
no operator configuration, host bind mounts or existing databases are used.
"""
import argparse
import base64
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import signal
import subprocess
import sys
import tempfile
import time
from urllib import error, parse, request

MONGO_PRIMARY = "mongo@sha256:8ecb514b00bdcc0bde67ef4e6c330385377a9dc68e24ee94e28c07c891647348"  # 7.0
MONGO_SECONDARY = "mongo@sha256:4be76f674fc4b27859816811b8baa3c51830eb1dbf4ca81a51e26b79edd662ef"  # 4.4
MAX_RESPONSE_BYTES = 1024 * 1024
IMMUTABLE_IMAGE = re.compile(r"(?:[A-Za-z0-9][A-Za-z0-9._:/-]*@)?sha256:[a-f0-9]{64}")


class SmokeFailure(RuntimeError):
    pass


class NoRedirect(request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class Fixture:
    def __init__(self, image):
        self.image = image
        self.directory = Path(tempfile.mkdtemp(prefix="openlap-packaged-backend-"))
        self.directory.chmod(0o700)
        self.suffix = secrets.token_hex(6)
        self.network = "openlap-smoke-network-" + self.suffix
        self.containers = []
        self.http_network = "openlap-smoke-http-" + self.suffix
        self.networks = []
        self.app = "openlap-smoke-app-" + self.suffix
        self.primary_db = "fixture_primary_" + self.suffix
        self.secondary_db = "fixture_secondary_" + self.suffix
        self.admin_email = "smoke-admin@example.test"
        self.admin_password = "Fixture" + secrets.token_hex(12) + "A1!"
        self.user_password = "Fixture" + secrets.token_hex(12) + "B2!"
        self.jwt_key = secrets.token_urlsafe(48)
        self.private_values = {self.admin_password, self.user_password, self.jwt_key}
        self.opener = request.build_opener(request.ProxyHandler({}), NoRedirect())
        self.base = None
        self.secondary_fixture_counts = None
        self.fixture_lrs_id = None
        self.report = {"image": image, "checks": [], "result": "FAIL"}

    def redact(self, value):
        for private in self.private_values:
            value = value.replace(private, "[synthetic credential redacted]")
        return value

    def docker(self, *args, timeout=90, check=True):
        result = subprocess.run(["docker", *args], text=True, capture_output=True, timeout=timeout)
        if check and result.returncode:
            raise SmokeFailure("Docker " + args[0] + " failed: " + self.redact(result.stderr[-2000:]))
        return result

    def passed(self, description):
        self.report["checks"].append(description)
        print("PASS: " + description, flush=True)

    def require(self, condition, description):
        if not condition:
            raise SmokeFailure(description)

    def image_available(self, image):
        if self.docker("image", "inspect", image, timeout=20, check=False).returncode:
            self.docker("pull", image, timeout=240)

    def database(self, name, image, alias, cli):
        self.image_available(image)
        self.docker("create", "--name", name, "--network", self.network,
                    "--network-alias", alias, "--label", "openlap.fixture=" + self.suffix,
                    "--pull", "never", image)
        self.containers.append(name)
        self.docker("start", name)
        deadline = time.monotonic() + 80
        while time.monotonic() < deadline:
            result = self.docker("exec", name, cli, "--quiet", "--eval",
                                 "quit(db.runCommand({ping:1}).ok ? 0 : 1)", timeout=10, check=False)
            if result.returncode == 0:
                return
            time.sleep(.5)
        raise SmokeFailure("Disposable " + alias + " did not become ready")

    def mongo(self, container, cli, database, expression):
        output = self.docker("exec", container, cli, "--quiet", database, "--eval", expression).stdout
        return json.loads(output.strip().splitlines()[-1])

    def api(self, method, path, body=None, token=None, headers=None, expect=200):
        outgoing = {"Accept": "application/json", **(headers or {})}
        if token:
            outgoing["Authorization"] = "Bearer " + token
        data = body
        if body is not None and not isinstance(body, bytes):
            data = json.dumps(body).encode()
            outgoing["Content-Type"] = "application/json"
        req = request.Request(self.base + path, data=data, method=method, headers=outgoing)
        try:
            with self.opener.open(req, timeout=15) as response:
                status, raw, incoming = response.status, response.read(MAX_RESPONSE_BYTES + 1), response.headers
        except error.HTTPError as response:
            status, raw, incoming = response.code, response.read(MAX_RESPONSE_BYTES + 1), response.headers
        self.require(len(raw) <= MAX_RESPONSE_BYTES, "HTTP fixture response exceeded 1 MiB")
        self.require(status == expect, method + " " + path + " returned " + str(status) + "; expected " + str(expect))
        if raw:
            self.require("application/json" in incoming.get("Content-Type", ""), "Response must retain JSON content type")
            payload = json.loads(raw)
        else:
            payload = None
        return payload, incoming

    def login(self, email, password):
        form = parse.urlencode({"userEmail": email, "password": password}).encode()
        payload, _ = self.api("POST", "/login", form,
                              headers={"Content-Type": "application/x-www-form-urlencoded"})
        self.private_values.update([payload["access_token"], payload["refresh_token"]])
        return payload

    def wait_for_app(self):
        deadline = time.monotonic() + 150
        while time.monotonic() < deadline:
            running = self.docker("inspect", self.app, "--format", "{{.State.Running}}", timeout=15).stdout.strip()
            self.require(running == "true", "Packaged backend exited during startup; inspect protected container log")
            try:
                return self.login(self.admin_email, self.admin_password)
            except (SmokeFailure, error.URLError, TimeoutError, ConnectionError):
                time.sleep(.5)
        raise SmokeFailure("Packaged backend startup/form login timed out")

    def start(self):
        image_id = self.docker("image", "inspect", self.image, "--format", "{{.Id}}", timeout=20).stdout.strip()
        self.require(re.fullmatch(r"sha256:[a-f0-9]{64}", image_id) is not None, "Expected immutable local image ID")
        if self.image.startswith("sha256:"):
            self.require(image_id == self.image, "Resolved application image changed")
        platform = self.docker("image", "inspect", image_id, "--format", "{{.Os}}/{{.Architecture}}", timeout=20).stdout.strip()
        self.require(platform == "linux/amd64", "Expected the qualified Linux amd64 backend image")
        self.image = image_id
        self.report["tested_image_id"] = image_id
        self.docker("network", "create", "--internal", "--label", "openlap.fixture=" + self.suffix, self.network)
        self.networks.append(self.network)
        self.docker("network", "create", "--label", "openlap.fixture=" + self.suffix, self.http_network)
        self.networks.append(self.http_network)
        self.primary = "openlap-smoke-primary-" + self.suffix
        self.secondary = "openlap-smoke-secondary-" + self.suffix
        self.database(self.primary, MONGO_PRIMARY, "fixture-primary", "mongosh")
        self.database(self.secondary, MONGO_SECONDARY, "fixture-secondary", "mongo")
        environment = {
            "PORT": "8080", "MONGODB_PRIMARY_URI": "mongodb://fixture-primary:27017",
            "MONGODB_SECONDARY_URI": "mongodb://fixture-secondary:27017",
            "OPENLAP_MONGODB_DB": self.primary_db, "LRS_MONGODB_DB": self.secondary_db,
            "ADMIN_NAME": "Smoke Admin", "ADMIN_EMAIL": self.admin_email,
            "ADMIN_PASSWORD": self.admin_password, "JWT_SECRET_KEY": self.jwt_key,
            "DATA_DIR": "/tmp/openlap-smoke-data", "PLUGIN_STORAGE_MODE": "local",
            "WEBAPP_URL": "http://127.0.0.1:5173", "LOG_LEVEL": "INFO",
            "OPENLAP_LOG_LEVEL": "INFO", "LOGGING_FILE_PATH": "/tmp/openlap-smoke-logs",
            "ALLOW_INSECURE_DEFAULTS": "false",
        }
        self.env_file = self.directory / "synthetic-environment"
        descriptor = os.open(self.env_file, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(descriptor, "w") as output:
            output.write("".join(key + "=" + value + "\n" for key, value in environment.items()))
        self.docker("create", "--platform", "linux/amd64", "--name", self.app, "--network", self.http_network,
                    "--label", "openlap.fixture=" + self.suffix, "--env-file", str(self.env_file),
                    "--publish", "127.0.0.1::8080", "--pull", "never", self.image)
        self.containers.append(self.app)
        self.docker("network", "connect", self.network, self.app)
        data = self.directory / "empty-plugin-data"
        for subdirectory in ["analytics_techniques", "visualization_methods"]:
            (data / "jars" / subdirectory).mkdir(parents=True)
        self.docker("cp", str(data), self.app + ":/tmp/openlap-smoke-data")
        self.docker("start", self.app)
        self.discover_http()
        return self.wait_for_app()

    def discover_http(self):
        # Docker can allocate a different random host port after container restart.
        binding = self.docker("port", self.app, "8080/tcp").stdout.strip()
        self.require(re.fullmatch(r"127\.0\.0\.1:[0-9]+", binding) is not None, "HTTP must be published on loopback only")
        self.base = "http://" + binding + "/api"

    def verify_routing(self, expected_users):
        expression = ('print(JSON.stringify({roles:db.getCollection("openlap-roles").countDocuments({}),'
                      'users:db.getCollection("openlap-users").countDocuments({}),'
                      'goals:db.getCollection("analytics-goal").countDocuments({})}))')
        counts = self.mongo(self.primary, "mongosh", self.primary_db, expression)
        self.require(counts["roles"] == 4 and counts["users"] == expected_users and counts["goals"] > 0,
                     "Primary database must contain expected seed roles/users/goals")
        secondary = self.mongo(self.secondary, "mongo", self.secondary_db, "print(JSON.stringify(db.getCollectionNames()))")
        if self.secondary_fixture_counts is None:
            self.require(secondary == [], "Application bootstrap must not create collections in the secondary database")
        else:
            self.require(sorted(secondary) == sorted(self.secondary_fixture_counts),
                         "Secondary database must contain only the intentionally seeded xAPI collections")
            counts_secondary = self.mongo(self.secondary, "mongo", self.secondary_db,
                'print(JSON.stringify({lrs:db.lrs.countDocuments({}),statements:db.statements.countDocuments({})}))')
            self.require(counts_secondary == self.secondary_fixture_counts,
                         "Synthetic secondary xAPI records must remain unchanged")
        self.report["seed_counts"] = counts

    def verify_xapi_options(self, user):
        # All statements below belong only to this fixture's disposable Mongo 4.4.
        # Counterexamples isolate each query filter while retaining the same activity name.
        self.fixture_lrs_id = secrets.token_hex(12)
        other_lrs_id = secrets.token_hex(12)
        actor = "fixture-actor-" + self.suffix
        activity_type = "https://example.test/activity-types/pdf"
        other_type = "https://example.test/activity-types/course"
        viewed = "https://example.test/verbs/viewed"
        edited = "https://example.test/verbs/edited"
        label = "A PDF with Mixed CASE"
        other_label = "Another PDF"
        activity_field = "statement.object.definition.name.en-US"
        selected_objects = ["https://example.test/activities/selected-one",
                            "https://example.test/activities/selected-two"]
        cases = [
            (self.fixture_lrs_id, activity_type, viewed, label, selected_objects[0]),
            (self.fixture_lrs_id, activity_type, viewed, label, selected_objects[1]),
            (self.fixture_lrs_id, activity_type, viewed, other_label, "https://example.test/activities/other-label"),
            (self.fixture_lrs_id, activity_type, edited, label, "https://example.test/activities/other-action"),
            (self.fixture_lrs_id, other_type, viewed, label, "https://example.test/activities/other-type"),
            (other_lrs_id, activity_type, viewed, label, "https://example.test/activities/other-lrs"),
        ]
        statements = [{"lrs_id": store, "statement": {
            "actor": {"account": {"homePage": "https://example.test", "name": actor}},
            "verb": {"id": verb, "display": {"en-US": verb.rsplit("/", 1)[1]}},
            "object": {"id": object_id, "definition": {"type": kind, "name": {"en-US": name}}},
            "stored": "2026-02-03T04:05:06.000Z",
        }} for store, kind, verb, name, object_id in cases]
        stores = [{"_id": store_id, "title": title, "uniqueIdentifierType": "ACCOUNT_NAME",
                   "statementCount": sum(row["lrs_id"] == store_id for row in statements)}
                  for store_id, title in [(self.fixture_lrs_id, "Selected fixture LRS"),
                                          (other_lrs_id, "Other fixture LRS")]]
        fixture = json.dumps({"stores": stores, "statements": statements})
        expression = ('var fixture=' + fixture + ';'
            'fixture.stores.forEach(function(row){row._id=ObjectId(row._id)});'
            'fixture.statements.forEach(function(row){row.lrs_id=ObjectId(row.lrs_id)});'
            'db.lrs.insertMany(fixture.stores);db.statements.insertMany(fixture.statements);'
            'print(JSON.stringify({lrs:db.lrs.countDocuments({}),statements:db.statements.countDocuments({})}))')
        counts = self.mongo(self.secondary, "mongo", self.secondary_db, expression)
        self.secondary_fixture_counts = {"lrs": 2, "statements": len(statements)}
        self.require(counts == self.secondary_fixture_counts, "Synthetic xAPI fixture must be seeded completely")

        available = self.api("GET", "/v1/register/lrs")[0]["data"]
        self.require({store["lrsId"] for store in available} == {self.fixture_lrs_id, other_lrs_id},
                     "Available LRS metadata must come from the secondary database")
        self.api("POST", "/v1/users/my/lrs/add",
                 {"lrsId": self.fixture_lrs_id, "uniqueIdentifier": actor}, user)
        # The supported connection flow upgrades ROLE_USER_WITHOUT_LRS to ROLE_USER.
        user = self.login("smoke-user@example.test", self.user_password)["access_token"]
        linked = self.api("GET", "/v1/users/my/lrs", token=user)[0]["data"]
        self.require(len(linked) == 1 and linked[0]["lrsId"] == self.fixture_lrs_id,
                     "The normal user must see only its explicitly linked LRS")
        stores_request = [{"lrsId": self.fixture_lrs_id, "uniqueIdentifier": actor}]
        types = self.api("POST", "/v1/statements/activity-types", {"lrsStores": stores_request}, user)[0]["data"]
        self.require({row["id"] for row in types} == {activity_type, other_type},
                     "Activity types must be loaded through the linked secondary LRS")
        actions = self.api("POST", "/v1/statements/actions",
            {"lrsStores": stores_request, "activityTypes": [activity_type]}, user)[0]["data"]
        self.require(actions == [
            {"id": edited, "queryId": "statement.verb.display.en-US", "name": "Edited"},
            {"id": viewed, "queryId": "statement.verb.display.en-US", "name": "Viewed"},
        ], "Action options must retain their verb IDs and language-map labels")
        activities = self.api("POST", "/v1/statements/activities", {
            "lrsStores": stores_request, "activityTypes": [activity_type], "actionOnActivities": [viewed],
        }, user)[0]["data"]
        self.require(activities == [
            {"id": label, "queryId": activity_field, "name": label},
            {"id": other_label, "queryId": activity_field, "name": other_label},
        ], "Activity options must unpack language maps, deduplicate and preserve exact labels/query paths")
        result = self.api("POST", "/v1/statements/custom-query", {
            "lrsStores": stores_request, "activityTypes": [activity_type], "actionOnActivities": [viewed],
            "activities": {activities[0]["queryId"]: [activities[0]["id"]]},
            "duration": {"from": "2026-01-01T00:00:00.000Z", "until": "2026-12-31T23:59:59.999Z"},
            "outputs": [activity_field, "statement.object.id"], "userQueryCondition": "INCLUDE_ME",
        }, user)[0]["data"]["columns"]
        self.require(result[activity_field]["data"] == [label, label] and
                     sorted(result["statement.object.id"]["data"]) == sorted(selected_objects),
                     "A selected activity must query exactly the matching LRS/type/action/name statements")
        self.report["secondary_fixture_counts"] = self.secondary_fixture_counts
        self.passed("linked LRS and real xAPI type/action/activity options select exactly matching statements")

    def verify(self):
        tokens = self.start()
        admin = tokens["access_token"]
        segment = admin.split(".")[1]
        claims = json.loads(base64.urlsafe_b64decode(segment + "=" * (-len(segment) % 4)))
        self.require(claims["sub"] == self.admin_email and "ROLE_SUPER_ADMIN" in claims["roles"], "Login must issue admin subject/role")
        self.require(claims["exp"] - claims["iat"] == 900, "Access token lifetime must remain 15 minutes")
        self.passed("actual packaged image startup, form login and JWT policy")
        self.verify_routing(1)
        self.passed("primary Mongo 7 bootstrap and isolated empty secondary Mongo 4.4")
        body, headers = self.api("GET", "/v1/admin/usage", expect=403)
        self.require(body["code"] == "AUTH_REQUIRED" and "cause" not in body and headers.get("X-Request-Id"),
                     "Unauthenticated errors must preserve the unified envelope and request ID")
        me = self.api("GET", "/v1/users/my", token=admin)[0]["data"]
        self.require(me["email"] == self.admin_email and "password" not in me, "Account JSON must omit credentials")
        self.api("PATCH", "/v1/users/my/profile", {"name": "Updated Smoke Admin"}, admin)
        self.require(self.api("GET", "/v1/users/my", token=admin)[0]["data"]["name"] == "Updated Smoke Admin", "Profile update must persist")
        invalid = self.api("PATCH", "/v1/users/my/profile", {"name": ""}, admin, expect=400)[0]
        self.require(invalid["code"] == "VALIDATION_FAILED" and "cause" not in invalid, "Jakarta validation must retain JSON error contract")
        self.passed("authenticated account update, JSON validation and unified security errors")
        _, headers = self.api("OPTIONS", "/v1/admin/usage", headers={
            "Origin": "http://127.0.0.1:5173", "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Authorization"})
        self.require(headers.get("Access-Control-Allow-Origin") == "http://127.0.0.1:5173" and
                     headers.get("Access-Control-Allow-Credentials") == "true", "Allowed preflight must work without JWT")
        self.passed("allowed unauthenticated CORS preflight")
        self.api("POST", "/v1/register", {"name": "Smoke User", "email": "smoke-user@example.test",
            "password": self.user_password, "confirmPassword": self.user_password,
            "role": "ROLE_USER_WITHOUT_LRS"}, expect=201)
        user = self.login("smoke-user@example.test", self.user_password)["access_token"]
        for path in ["/v1/admin/usage", "/v1/users"]:
            self.require(self.api("GET", path, token=user, expect=403)[0]["code"] == "ACCESS_DENIED", "Normal users must not gain admin access")
        self.require(self.api("GET", "/v1/users/my", token=user)[0]["data"]["email"] == "smoke-user@example.test", "Normal self-service must remain accessible")
        users = self.api("GET", "/v1/users", token=admin)[0]["data"]
        self.require(users["totalElements"] == 2 and all("password" not in row for row in users["content"]), "Admin pagination must retain safe user JSON")
        self.passed("registration, normal-user/admin authorization and safe paginated JSON")
        self.verify_xapi_options(user)
        draft = {"title": "Migration fixture news", "date": "2026-11-11", "body": {
            "type": "doc", "content": [{"type": "paragraph", "content": [
                {"type": "text", "text": "Synthetic migration news"}]}]}}
        entry = self.api("POST", "/v1/admin/content/news", {"draft": draft}, admin, expect=201)[0]["data"]
        path = "/v1/admin/content/news/" + entry["id"]
        self.require(entry["status"] == "DRAFT" and entry["version"] == 1, "New content must remain a draft")
        self.require(self.api("GET", "/v1/content/news")[0]["data"]["totalElements"] == 0, "Draft must stay private")
        entry = self.api("POST", path + "/publish", {"version": 1}, admin)[0]["data"]
        self.require(entry["status"] == "PUBLISHED" and entry["version"] == 2, "Publish must atomically advance version")
        public = self.api("GET", "/v1/content/news")[0]["data"]
        self.require(public["totalElements"] == 1 and public["content"][0]["body"] == draft["body"], "Published rich JSON must survive persistence and serialization")
        stale = self.api("PUT", path, {"version": 1, "draft": draft}, admin, expect=409)[0]
        self.require(stale["code"] == "CONTENT_VERSION_CONFLICT", "Stale writes must remain conflicts")
        entry = self.api("DELETE", path + "?version=2", token=admin)[0]["data"]
        self.require(entry["status"] == "TRASH" and self.api("GET", "/v1/content/news")[0]["data"]["totalElements"] == 0, "Trash must remove public visibility")
        entry = self.api("POST", path + "/restore", {"version": entry["version"]}, admin)[0]["data"]
        self.require(entry["status"] == "DRAFT", "Restore must remain unpublished")
        self.api("POST", path + "/publish", {"version": entry["version"]}, admin)
        self.passed("rich content draft/publish/conflict/trash/restore lifecycle")
        self.docker("restart", "--time", "15", self.app, timeout=40)
        self.discover_http()
        admin = self.wait_for_app()["access_token"]
        self.require(self.api("GET", "/v1/users/my", token=admin)[0]["data"]["name"] == "Updated Smoke Admin", "Profile must survive restart")
        self.require(self.api("GET", "/v1/content/news")[0]["data"]["totalElements"] == 1, "Published content must survive restart")
        user = self.login("smoke-user@example.test", self.user_password)["access_token"]
        linked = self.api("GET", "/v1/users/my/lrs", token=user)[0]["data"]
        self.require(len(linked) == 1 and linked[0]["lrsId"] == self.fixture_lrs_id,
                     "The user LRS connection must survive restart")
        self.verify_routing(2)
        self.passed("restart persistence, idempotent seeding and continued database separation")
        self.report["result"] = "PASS"

    def cleanup(self):
        failures = []
        # Log collection must never prevent independent resource cleanup.
        if self.app in self.containers:
            try:
                logs = self.docker("logs", "--tail", "1000", self.app, check=False)
                text = self.redact((logs.stdout + logs.stderr)[-200000:])
                (self.directory / "backend.log").write_text(text)
            except Exception:
                self.report["backend_log_unavailable"] = True
        # Discover by the unique ownership label, not successful CLI returns:
        # daemon-side creation may have succeeded before a client timeout.
        # Delete immutable IDs so a foreign name collision is never selected.
        for kind, listing, removal in [
            ("container", ["container", "ls", "-a"], ["rm", "-fv"]),
            ("network", ["network", "ls"], ["network", "rm"]),
        ]:
            try:
                owned = self.docker(*listing, "--filter", "label=openlap.fixture=" + self.suffix,
                                    "--format", "{{.ID}}", timeout=20)
                identifiers = owned.stdout.split()
            except Exception:
                failures.append("owned " + kind + " discovery")
                continue
            for identifier in identifiers:
                if not re.fullmatch(r"[0-9a-f]{12,64}", identifier):
                    failures.append("invalid owned " + kind + " identifier")
                    continue
                try:
                    if self.docker(*removal, identifier, timeout=30, check=False).returncode:
                        failures.append(kind + " " + identifier)
                except Exception:
                    failures.append(kind + " " + identifier)
        try:
            (self.directory / "synthetic-environment").unlink(missing_ok=True)
            shutil.rmtree(self.directory / "empty-plugin-data", ignore_errors=True)
        except OSError:
            failures.append("owned temporary inputs")
        self.report["cleanup_complete"] = not failures
        if failures:
            self.report["result"] = "FAIL"
            self.report["cleanup_failures"] = failures
        (self.directory / "receipt.json").write_text(json.dumps(self.report, indent=2) + "\n")
        print("Receipt: " + str(self.directory / "receipt.json"), flush=True)
        if failures:
            raise SmokeFailure("Could not remove all owned fixture resources")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--image", required=True, help="Immutable application image ID or digest already loaded in local Docker")
    args = parser.parse_args()
    if not IMMUTABLE_IMAGE.fullmatch(args.image):
        parser.error("--image must be an immutable local sha256 image ID or repository@sha256 digest")
    fixture = Fixture(args.image)
    def interrupted(signum, frame):
        raise KeyboardInterrupt()
    signal.signal(signal.SIGTERM, interrupted)
    try:
        fixture.verify()
    except (Exception, KeyboardInterrupt) as exc:
        fixture.report["failure"] = fixture.redact(str(exc) or "Interrupted")
        print("FAIL: " + fixture.report["failure"], file=sys.stderr)
    finally:
        try:
            fixture.cleanup()
        except Exception as exc:
            print("FAIL: fixture cleanup: " + fixture.redact(str(exc)), file=sys.stderr)
            return 1
    return 0 if fixture.report["result"] == "PASS" else 1


if __name__ == "__main__":
    sys.exit(main())
