"""Read-only Git inputs and private, exclusive recovery-output regression tests.

Run with ``python3 -B -m unittest discover -s tests -p test_prepare_plugin_recovery.py``.
No test fetches objects, invokes Java, or contacts a service.
"""

import copy
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import shutil
import stat
import subprocess
import sys
import tempfile
import unittest
import warnings
import zipfile


sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "openlap-analyticsframework/scripts/prepare-plugin-recovery.py"
spec = importlib.util.spec_from_file_location("prepare_plugin_recovery", SCRIPT)
recovery = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = recovery
spec.loader.exec_module(recovery)

REPOSITORY = "https://github.com/ude-soco/openlap-official"
COMMIT = "4768ec732c667940e00dfc5a87e0300ed0a7ef75"
PINS = (
    (
        "analytics",
        "openlap-analyticsframework/jars/analytics_techniques/AnalyticsMethods-Prototypes-1.0-SNAPSHOT.jar",
        "jars/analytics/AnalyticsMethods-Prototypes-1.0-SNAPSHOT.jar",
        "086084d815143e880aea942bc843e6d72c3652f0",
        "5ed1a34bee570f1a8fc209a55f2ff69ff90c5c686c4a7b7fa35a6c010fff68c7",
        87176,
    ),
    (
        "visualizations",
        "openlap-analyticsframework/jars/visualization_methods/Visualizer-C3-1.0-SNAPSHOT.jar",
        "jars/visualizations/Visualizer-C3-1.0-SNAPSHOT.jar",
        "0c5774f0ea0df6aba2346dfa6e920f994a6b16bd",
        "ba08d00b3a26d7d5e6b127a55b1a965c08dd3e1bfd5da6ef865134f78d380033",
        60130,
    ),
)


def jar_bytes(extra_entries=()):
    content = io.BytesIO()
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", UserWarning)
        with zipfile.ZipFile(content, "w", zipfile.ZIP_DEFLATED) as archive:
            archive.writestr("META-INF/MANIFEST.MF", "Manifest-Version: 1.0\r\n\r\n")
            archive.writestr("fixture/Plugin.class", b"\xca\xfe\xba\xbe\x00\x00\x00\x34")
            for name, data in extra_entries:
                archive.writestr(name, data)
    return content.getvalue()


def git(repo, *arguments, input_bytes=None):
    # The fixtures have no hooks or global configuration; only local Git is used.
    environment = {
        "PATH": os.defpath,
        "GIT_CONFIG_NOSYSTEM": "1",
        "GIT_CONFIG_GLOBAL": os.devnull,
        "GIT_NO_LAZY_FETCH": "1",
        "GIT_NO_REPLACE_OBJECTS": "1",
        "GIT_TERMINAL_PROMPT": "0",
    }
    return subprocess.run(
        ["git", "--no-replace-objects", "-c", "protocol.allow=never", "-c", "core.hooksPath=/dev/null",
         "-C", str(repo), *arguments],
        input=input_bytes,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=environment,
        check=True,
    ).stdout


def fixture(repo):
    repo.mkdir()
    git(repo, "init", "--quiet")
    manifest = {"version": 1, "repository": REPOSITORY, "commit": "", "artifacts": []}
    for index, (kind, git_path, output_path, *_unused) in enumerate(PINS):
        data = jar_bytes(((f"fixture/{index}.txt", kind.encode("ascii")),))
        destination = repo / git_path
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(data)
        blob = git(repo, "hash-object", "-w", "--stdin", input_bytes=data).decode().strip()
        manifest["artifacts"].append(
            {
                "kind": kind,
                "git_path": git_path,
                "output_path": output_path,
                "git_blob": blob,
                "sha256": hashlib.sha256(data).hexdigest(),
                "size_bytes": len(data),
            }
        )
    git(repo, "add", "--", *(item[1] for item in PINS))
    git(
        repo,
        "-c", "user.name=Recovery fixture",
        "-c", "user.email=recovery-fixture@example.invalid",
        "commit", "--quiet", "-m", "Add synthetic public-path fixtures",
    )
    manifest["commit"] = git(repo, "rev-parse", "HEAD").decode().strip()
    return manifest


@unittest.skipUnless(shutil.which("git"), "local Git is required")
class RecoveryPreparationTest(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.directory = Path(self.temporary.name).resolve()
        self.repo = self.directory / "source"
        self.manifest = fixture(self.repo)
        self.output = self.directory / "prepared"

    def prepare(self, manifest=None, output=None):
        return recovery.prepare(
            self.repo,
            self.output if output is None else output,
            self.manifest if manifest is None else manifest,
        )

    def assert_incomplete(self, output=None):
        output = self.output if output is None else output
        self.assertFalse((output / "provenance.json").exists())

    def test_two_artifact_bundle_is_verified_private_and_deterministic(self):
        self.prepare()
        record = json.loads((self.output / "provenance.json").read_text())
        for field in ("version", "repository", "commit", "artifacts"):
            self.assertEqual(record[field], self.manifest[field])
        self.assertIsInstance(record["verification"], dict)
        self.assertTrue(record["verification"])
        for artifact in self.manifest["artifacts"]:
            path = self.output / artifact["output_path"]
            content = path.read_bytes()
            self.assertEqual(hashlib.sha256(content).hexdigest(), artifact["sha256"])
            self.assertEqual(len(content), artifact["size_bytes"])
            blob = hashlib.sha1(b"blob " + str(len(content)).encode() + b"\0" + content).hexdigest()
            self.assertEqual(blob, artifact["git_blob"])
        for path in (self.output, *self.output.rglob("*")):
            self.assertFalse(path.is_symlink())
            self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o700 if path.is_dir() else 0o600)
        other = self.directory / "prepared-again"
        self.prepare(output=other)
        self.assertEqual((other / "provenance.json").read_bytes(), (self.output / "provenance.json").read_bytes())

    def test_existing_directory_file_and_symlink_are_never_reused(self):
        targets = [self.directory / name for name in ("directory", "file", "link")]
        targets[0].mkdir()
        (targets[0] / "keep").write_bytes(b"keep")
        targets[1].write_bytes(b"keep")
        targets[2].symlink_to(targets[0], target_is_directory=True)
        for target in targets:
            with self.subTest(target=target.name):
                with self.assertRaises(recovery.RecoveryError):
                    self.prepare(output=target)
        self.assertEqual((targets[0] / "keep").read_bytes(), b"keep")
        self.assertEqual(targets[1].read_bytes(), b"keep")
        self.assertEqual(list(targets[0].iterdir()), [targets[0] / "keep"])

    def test_symlink_ancestor_is_rejected(self):
        real = self.directory / "real"
        real.mkdir()
        link = self.directory / "linked"
        link.symlink_to(real, target_is_directory=True)
        with self.assertRaises(recovery.RecoveryError):
            self.prepare(output=link / "prepared")
        self.assertEqual(list(real.iterdir()), [])

    def test_destination_parent_traversal_is_rejected(self):
        intermediate = self.directory / "intermediate"
        intermediate.mkdir()
        with self.assertRaises(recovery.RecoveryError):
            self.prepare(output=intermediate / ".." / "escaped")
        self.assertFalse((self.directory / "escaped").exists())

    def test_digest_and_size_tampering_leave_no_success_manifest(self):
        for field, value in (("sha256", "0" * 64), ("size_bytes", self.manifest["artifacts"][1]["size_bytes"] + 1)):
            with self.subTest(field=field):
                manifest = copy.deepcopy(self.manifest)
                manifest["artifacts"][1][field] = value
                output = self.directory / field
                with self.assertRaises(recovery.RecoveryError):
                    self.prepare(manifest, output)
                self.assert_incomplete(output)
                # Failure must retain any private partial output rather than silently clean it.
                if output.exists():
                    self.assertEqual(stat.S_IMODE(output.stat().st_mode), 0o700)

    def test_git_path_must_resolve_to_the_expected_blob(self):
        manifest = copy.deepcopy(self.manifest)
        manifest["artifacts"][0]["git_blob"] = manifest["artifacts"][1]["git_blob"]
        with self.assertRaises(recovery.RecoveryError):
            self.prepare(manifest)
        self.assert_incomplete()

    def test_unapproved_paths_and_additional_artifacts_are_rejected(self):
        changes = [
            ("output_path", "../escape.jar"),
            ("output_path", "/escape.jar"),
            ("output_path", "jars/analytics/../escape.jar"),
            ("git_path", "README.md"),
            ("git_path", "../credentials.env"),
        ]
        for index, (field, value) in enumerate(changes):
            with self.subTest(field=field, value=value):
                manifest = copy.deepcopy(self.manifest)
                manifest["artifacts"][0][field] = value
                output = self.directory / f"invalid-{index}"
                with self.assertRaises(recovery.RecoveryError):
                    self.prepare(manifest, output)
                self.assert_incomplete(output)
        manifest = copy.deepcopy(self.manifest)
        manifest["artifacts"].append(copy.deepcopy(manifest["artifacts"][0]))
        with self.assertRaises(recovery.RecoveryError):
            self.prepare(manifest)
        self.assert_incomplete()

    def test_invalid_archive_cannot_be_published_even_with_matching_hashes(self):
        payload = b"this is not a ZIP archive"
        artifact = self.manifest["artifacts"][0]
        (self.repo / artifact["git_path"]).write_bytes(payload)
        git(self.repo, "add", "--", artifact["git_path"])
        git(self.repo, "-c", "user.name=Recovery fixture", "-c", "user.email=recovery-fixture@example.invalid",
            "commit", "--quiet", "-m", "Replace fixture archive")
        self.manifest["commit"] = git(self.repo, "rev-parse", "HEAD").decode().strip()
        artifact["git_blob"] = git(self.repo, "hash-object", "--stdin", input_bytes=payload).decode().strip()
        artifact["sha256"] = hashlib.sha256(payload).hexdigest()
        artifact["size_bytes"] = len(payload)
        with self.assertRaises(recovery.RecoveryError):
            self.prepare()
        self.assert_incomplete()


class ArchiveStructureTest(unittest.TestCase):
    def test_valid_jar_structure(self):
        recovery.validate_jar(jar_bytes())

    def test_zip_path_traversal_absolute_paths_and_duplicate_entries_are_rejected(self):
        for name in ("../escape.class", "/escape.class", "safe/../../escape.class", "fixture/Plugin.class"):
            with self.subTest(name=name):
                with self.assertRaises(recovery.RecoveryError):
                    recovery.validate_jar(jar_bytes(((name, b"unexpected"),)))

    def test_symlink_archive_member_is_rejected(self):
        buffer = io.BytesIO(jar_bytes())
        with zipfile.ZipFile(buffer, "a") as archive:
            member = zipfile.ZipInfo("fixture/link.class")
            member.create_system = 3
            member.external_attr = (stat.S_IFLNK | 0o777) << 16
            archive.writestr(member, "Plugin.class")
        with self.assertRaises(recovery.RecoveryError):
            recovery.validate_jar(buffer.getvalue())

    def test_empty_legacy_maven_directory_metadata_is_accepted(self):
        buffer = io.BytesIO(jar_bytes())
        with zipfile.ZipFile(buffer, "a") as archive:
            member = zipfile.ZipInfo("META-INF/maven/legacy/")
            member.external_attr = 0xFFFF << 16
            archive.writestr(member, b"")
        recovery.validate_jar(buffer.getvalue())

    def test_legacy_directory_metadata_exception_does_not_accept_files_or_data(self):
        for name, data in (("META-INF/maven/legacy/pom.xml", b""), ("META-INF/maven/legacy/", b"data")):
            with self.subTest(name=name):
                buffer = io.BytesIO(jar_bytes())
                with zipfile.ZipFile(buffer, "a") as archive:
                    member = zipfile.ZipInfo(name)
                    member.external_attr = 0xFFFF << 16
                    archive.writestr(member, data)
                with self.assertRaises(recovery.RecoveryError):
                    recovery.validate_jar(buffer.getvalue())


class FixedPolicyTest(unittest.TestCase):
    def test_reviewed_policy_contains_only_the_two_pinned_public_artifacts(self):
        manifest = recovery.load_manifest()
        self.assertEqual(manifest["version"], 1)
        self.assertEqual(manifest["repository"], REPOSITORY)
        self.assertEqual(manifest["commit"], COMMIT)
        self.assertEqual(
            manifest["artifacts"],
            [dict(zip(("kind", "git_path", "output_path", "git_blob", "sha256", "size_bytes"), pin)) for pin in PINS],
        )


@unittest.skipUnless(shutil.which("git"), "local Git is required")
class PublicHistoryIntegrationTest(unittest.TestCase):
    def test_fixed_policy_prepares_the_two_exact_public_historical_artifacts(self):
        try:
            git(ROOT, "cat-file", "-e", COMMIT + "^{commit}")
            for pin in PINS:
                git(ROOT, "cat-file", "-e", pin[3])
        except subprocess.CalledProcessError:
            self.skipTest("pinned historical public objects are absent; this test never fetches")
        manifest = recovery.load_manifest()
        self.assertEqual(manifest["repository"], REPOSITORY)
        self.assertEqual(manifest["commit"], COMMIT)
        expected = [
            dict(zip(("kind", "git_path", "output_path", "git_blob", "sha256", "size_bytes"), pin))
            for pin in PINS
        ]
        self.assertEqual(manifest["artifacts"], expected)
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory).resolve() / "approved"
            # With no --repo, source selection must use the owning repository,
            # independently of the caller's current directory.
            result = subprocess.run(
                [sys.executable, "-B", str(SCRIPT), "--output", str(output)],
                cwd=directory,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env={"PATH": os.defpath, "GIT_CONFIG_NOSYSTEM": "1", "GIT_CONFIG_GLOBAL": os.devnull,
                     "GIT_TERMINAL_PROMPT": "0"},
                check=False,
            )
            self.assertEqual(result.returncode, 0, result.stderr.decode(errors="replace"))
            provenance = json.loads((output / "provenance.json").read_text())
            self.assertEqual(provenance["artifacts"], expected)
            for artifact in expected:
                data = (output / artifact["output_path"]).read_bytes()
                self.assertEqual(len(data), artifact["size_bytes"])
                self.assertEqual(hashlib.sha256(data).hexdigest(), artifact["sha256"])


if __name__ == "__main__":
    unittest.main()
