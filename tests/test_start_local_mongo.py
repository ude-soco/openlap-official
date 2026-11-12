"""Synthetic fake-Docker checks; never contact Docker or any existing volume."""

from contextlib import redirect_stderr, redirect_stdout
import importlib.util
import io
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest import mock


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "analyticsframework/scripts/start-local-mongo.py"
SPEC = importlib.util.spec_from_file_location("start_local_mongo", SOURCE)
mongo = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(mongo)

FAKE_DOCKER = r'''#!PYTHON
import json
import os
from pathlib import Path
import sys
import time

args = sys.argv[1:]
with open(os.environ["FAKE_DOCKER_LOG"], "a") as log:
    log.write(json.dumps({"args": args, "volume": os.environ.get("OPENLAP_MONGO_VOLUME"), "cwd": os.getcwd()}) + "\n")
case = os.environ.get("FAKE_DOCKER_CASE", "unused")
volume = os.environ["OPENLAP_MONGO_VOLUME"]
if args[:2] == ["volume", "inspect"]:
    assert args == ["volume", "inspect", "--format={{.Name}}", "--", volume]
    if case == "missing":
        print("SYNTHETIC_PRIVATE_DETAIL", file=sys.stderr)
        sys.exit(1)
    if case == "timeout":
        time.sleep(3)
    if case == "oversized":
        print("x" * (128 * 1024))
    else:
        print(volume)
elif args[0] == "ps":
    assert args == ["ps", "--no-trunc", "--filter=volume=" + volume, "--format={{.ID}}"]
    if case != "unused":
        print("a" * 64)
    if case == "multiple":
        print("b" * 64)
elif args[0] == "inspect":
    assert args[1] == "--type=container" and args[-2:] == ["--", "a" * 64]
    assert ".Config.Env" not in args[2] and "eq .Name \"" + volume + "\"" in args[2]
    owner = [os.environ.get("FAKE_OWNER_PROJECT", "analyticsframework"), "mongo", True, ["/data/db", True]]
    if case == "foreign": owner[0] = "old-project"
    if case == "wrong-service": owner[1] = "another-service"
    if case == "wrong-mount": owner[3] = ["/backup", False]
    if case == "stopped": owner[2] = False
    if case == "malformed": print("SYNTHETIC_PRIVATE_DETAIL")
    else:
        for value in owner: print(json.dumps(value))
elif args[0] == "compose":
    if case == "compose-failure":
        print("SYNTHETIC_PRIVATE_DETAIL", file=sys.stderr)
        sys.exit(1)
else:
    raise AssertionError("Unexpected Docker operation")
'''


class StartLocalMongoTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="openlap-compose-guard-test-")
        self.addCleanup(self.temporary.cleanup)
        self.directory = Path(self.temporary.name)
        self.bin = self.directory / "bin"
        self.bin.mkdir()
        docker = self.bin / "docker"
        docker.write_text(FAKE_DOCKER.replace("#!PYTHON", "#!" + sys.executable, 1))
        docker.chmod(0o700)
        self.log = self.directory / "calls.jsonl"
        self.environment = {
            "PATH": str(self.bin),
            "FAKE_DOCKER_LOG": str(self.log),
            "OPENLAP_MONGO_VOLUME": "explicit-synthetic-mongo-volume",
            "COMPOSE_PROJECT_NAME": "must-not-override-the-selected-project",
            "COMPOSE_FILE": "must-not-override-the-fixed-compose-files.yaml",
        }

    def run_guard(self, case="unused", arguments=()):
        self.environment["FAKE_DOCKER_CASE"] = case
        stdout, stderr = io.StringIO(), io.StringIO()
        with mock.patch.dict(os.environ, self.environment, clear=True), redirect_stdout(stdout), redirect_stderr(stderr):
            status = mongo.main(list(arguments))
        calls = [json.loads(line) for line in self.log.read_text().splitlines()] if self.log.exists() else []
        self.assertNotIn("SYNTHETIC_PRIVATE_DETAIL", stdout.getvalue() + stderr.getvalue())
        return status, calls, stdout.getvalue(), stderr.getvalue()

    def assert_read_only(self, calls):
        self.assertTrue(all(row["args"][0] in ("volume", "ps", "inspect") for row in calls))
        self.assertTrue(all(row["args"][1] == "inspect" for row in calls if row["args"][0] == "volume"))

    def test_explicit_volume_required_before_any_docker_operation(self):
        self.environment.pop("OPENLAP_MONGO_VOLUME")
        status, calls, _out, error = self.run_guard()
        self.assertEqual(status, 1)
        self.assertEqual(calls, [])
        self.assertIn("OPENLAP_MONGO_VOLUME", error)

    def test_invalid_volume_names_cannot_become_arguments_or_templates(self):
        for value in ("", "../mongo", "--all", 'name\"', "name\n", "name with spaces"):
            with self.subTest(value=value):
                self.environment["OPENLAP_MONGO_VOLUME"] = value
                status, calls, _out, _error = self.run_guard()
                self.assertEqual(status, 1)
                self.assertEqual(calls, [])

    def test_absent_selected_volume_is_not_created(self):
        status, calls, _out, _error = self.run_guard("missing")
        self.assertEqual(status, 1)
        self.assertEqual(len(calls), 1)
        self.assert_read_only(calls)

    def test_foreign_service_unverified_state_and_mount_are_rejected_without_writes(self):
        for case in ("foreign", "wrong-service", "wrong-mount", "stopped", "malformed"):
            with self.subTest(case=case):
                self.log.unlink(missing_ok=True)
                status, calls, _out, _error = self.run_guard(case)
                self.assertEqual(status, 1)
                self.assertEqual(len(calls), 3)
                self.assert_read_only(calls)

    def test_multiple_running_owners_are_rejected_without_starting_or_stopping(self):
        status, calls, _out, _error = self.run_guard("multiple")
        self.assertEqual(status, 1)
        self.assertEqual(len(calls), 2)
        self.assert_read_only(calls)

    def assert_fixed_start(self, calls, project):
        self.assertEqual(calls[-1]["args"], [
            "compose", "--project-name", project,
            "-f", str(ROOT / "analyticsframework/compose.yaml"),
            "-f", str(ROOT / "analyticsframework/compose.dev.yaml"),
            "up", "-d", "mongo",
        ])
        self.assertTrue(all(row["volume"] == self.environment["OPENLAP_MONGO_VOLUME"] for row in calls))
        self.assertTrue(all(row["cwd"] == str(ROOT / "analyticsframework") for row in calls))
        self.assertEqual(sum(row["args"][0] == "compose" for row in calls), 1)

    def test_unused_explicit_volume_starts_only_mongo_with_fixed_module_files(self):
        status, calls, _out, _error = self.run_guard()
        self.assertEqual(status, 0)
        self.assertEqual(len(calls), 3)
        self.assert_fixed_start(calls, "analyticsframework")

    def test_same_project_mongo_is_allowed_for_idempotent_start(self):
        status, calls, _out, _error = self.run_guard("owned")
        self.assertEqual(status, 0)
        self.assertEqual(len(calls), 4)
        self.assert_fixed_start(calls, "analyticsframework")

    def test_root_project_must_be_explicit_and_match_existing_owner(self):
        self.environment["FAKE_OWNER_PROJECT"] = "openlap-official"
        status, calls, _out, _error = self.run_guard("owned", ["--project", "openlap-official"])
        self.assertEqual(status, 0)
        self.assert_fixed_start(calls, "openlap-official")

    def test_other_projects_and_arbitrary_compose_passthrough_are_not_accepted(self):
        for arguments in (["--project", "another-project"], ["--", "down", "-v"], ["up", "analyticsframework"]):
            with self.subTest(arguments=arguments):
                status, calls, _out, _error = self.run_guard(arguments=arguments)
                self.assertEqual(status, 1)
                self.assertEqual(calls, [])

    def test_bounded_docker_output_fails_without_startup(self):
        status, calls, _out, _error = self.run_guard("oversized")
        self.assertEqual(status, 1)
        self.assertEqual(len(calls), 1)
        self.assert_read_only(calls)

    def test_docker_timeout_fails_without_startup(self):
        with mock.patch.object(mongo, "INSPECT_TIMEOUT", 0.05):
            status, calls, _out, _error = self.run_guard("timeout")
        self.assertEqual(status, 1)
        # A busy runner can hit the limit before the fake interpreter logs its
        # first call. Both cases must fail before any mutating Compose call.
        self.assertLessEqual(len(calls), 1)
        self.assert_read_only(calls)
        self.assertIn("timed out", _error)

    def test_startup_failure_keeps_private_docker_diagnostics_out_of_output(self):
        status, calls, _out, _error = self.run_guard("compose-failure")
        self.assertEqual(status, 1)
        self.assert_fixed_start(calls, "analyticsframework")


if __name__ == "__main__":
    unittest.main()
