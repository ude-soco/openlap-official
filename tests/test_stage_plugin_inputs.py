"""Synthetic, credential-free regressions for the historical-source input stager."""

from concurrent.futures import ThreadPoolExecutor
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import stat
import subprocess
import sys
import tempfile
import unittest
from unittest import mock
import zipfile


sys.dont_write_bytecode = True
SCRIPT = Path(__file__).resolve().parents[1] / "analyticsframework/scripts/stage-plugin-inputs.py"
spec = importlib.util.spec_from_file_location("stage_plugin_inputs", SCRIPT)
stager = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = stager
spec.loader.exec_module(stager)

ARTIFACT_PATHS = (
    "analytics/AnalyticsMethods-Prototypes-1.0-SNAPSHOT.jar",
    "visualizations/Visualizer-C3-1.0-SNAPSHOT.jar",
)


def jar_bytes(label):
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("META-INF/MANIFEST.MF", "Manifest-Version: 1.0\r\n\r\n")
        archive.writestr("fixture/Plugin.class", b"\xca\xfe\xba\xbe" + label)
    return output.getvalue()


@unittest.skipUnless(os.name == "posix" and hasattr(os, "O_NOFOLLOW") and os.geteuid() != 0,
                     "POSIX non-root ownership and permission checks are required")
class StagePluginInputsTest(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="plugin-input-fixture-")
        self.addCleanup(temporary.cleanup)
        self.directory = Path(temporary.name).resolve()
        self.source = self.directory / "public-jars"
        self.source.mkdir(mode=0o700)
        self.destination = self.directory / "inputs"
        self.manifest = self.directory / "reviewed-manifest.json"
        self.manifest_bytes = b'{"version":1,"files":[],"entries":[],"fixture":"SYNTHETIC-PRIVATE-CANDIDATE"}\n'
        self.manifest.write_bytes(self.manifest_bytes)
        self.manifest.chmod(0o600)
        self.manifest_hash = hashlib.sha256(self.manifest_bytes).hexdigest()
        self.binaries = {name: jar_bytes(str(index).encode("ascii")) for index, name in enumerate(ARTIFACT_PATHS)}
        self.artifacts = tuple({"path": name, "sha256": hashlib.sha256(data).hexdigest(), "size": len(data)}
                               for name, data in self.binaries.items())
        for name, data in self.binaries.items():
            path = self.source / name
            path.parent.mkdir(mode=0o700)
            path.write_bytes(data)
        patcher = mock.patch.object(stager, "ARTIFACTS", self.artifacts)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.addCleanup(self.restore_destination_permissions)

    def restore_destination_permissions(self):
        if self.destination.is_dir() and not self.destination.is_symlink():
            self.destination.chmod(0o700)
            for path in self.destination.rglob("*"):
                if not path.is_symlink():
                    path.chmod(0o700 if path.is_dir() else 0o600)

    def run_stage(self, *, manifest=None, digest=None, destination=None, source=None, verify=False):
        return stager.stage(
            self.manifest if manifest is None else manifest,
            self.manifest_hash if digest is None else digest,
            self.destination if destination is None else destination,
            source_root=self.source if source is None else source,
            verify=verify,
        )

    def assert_incomplete(self, destination=None):
        root = self.destination if destination is None else destination
        self.assertFalse((root / "staging-provenance.json").exists())

    def tree_snapshot(self, root=None):
        root = self.destination if root is None else root
        result = {}
        for path in [root, *sorted(root.rglob("*"))]:
            info = path.lstat()
            data = path.read_bytes() if stat.S_ISREG(info.st_mode) else None
            result[str(path.relative_to(root))] = (
                info.st_mode, info.st_uid, info.st_gid, info.st_ino, info.st_nlink,
                info.st_mtime_ns, info.st_ctime_ns, data,
            )
        return result

    def test_two_public_jars_and_private_manifest_are_staged_with_private_modes(self):
        previous = os.umask(0)
        try:
            self.run_stage()
        finally:
            os.umask(previous)
        expected = {"jars/" + name for name in self.binaries} | {"manifest.json", "staging-provenance.json"}
        self.assertEqual({str(path.relative_to(self.destination)) for path in self.destination.rglob("*")
                          if path.is_file()}, expected)
        for name, data in self.binaries.items():
            self.assertEqual((self.destination / "jars" / name).read_bytes(), data)
        self.assertEqual((self.destination / "manifest.json").read_bytes(), self.manifest_bytes)
        provenance = (self.destination / "staging-provenance.json").read_bytes()
        self.assertIsInstance(json.loads(provenance), dict)
        self.assertNotIn(b"SYNTHETIC-PRIVATE-CANDIDATE", provenance)
        for path in [self.destination, *self.destination.rglob("*")]:
            self.assertFalse(path.is_symlink())
            self.assertEqual(path.stat().st_uid, os.geteuid())
            self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o700 if path.is_dir() else 0o600)

    def test_completed_destination_is_never_overwritten_or_reused(self):
        self.run_stage()
        original = self.tree_snapshot()
        with self.assertRaises(stager.StageError):
            self.run_stage()
        self.assertEqual(self.tree_snapshot(), original)

    def test_nonempty_hidden_and_lost_found_destinations_are_rejected(self):
        for name in (".hidden", "lost+found", "jars", "manifest.json", "staging-provenance.json"):
            with self.subTest(name=name), tempfile.TemporaryDirectory(dir=self.directory) as temporary:
                destination = Path(temporary)
                marker = destination / name
                marker.write_bytes(b"existing data must survive")
                with self.assertRaises(stager.StageError):
                    self.run_stage(destination=destination)
                self.assertEqual(marker.read_bytes(), b"existing data must survive")
                self.assertEqual(list(destination.iterdir()), [marker])

    def test_even_an_existing_empty_destination_is_never_reused(self):
        self.destination.mkdir(mode=0o700)
        with self.assertRaises(stager.StageError):
            self.run_stage()
        self.assertEqual(list(self.destination.iterdir()), [])

    def test_destination_symlinks_and_symlink_ancestors_are_rejected(self):
        real = self.directory / "real"
        real.mkdir(mode=0o700)
        child = real / "child"
        child.mkdir(mode=0o700)
        linked = self.directory / "linked"
        linked.symlink_to(real, target_is_directory=True)
        for destination in (linked, linked / "child"):
            with self.subTest(destination=destination), self.assertRaises(stager.StageError):
                self.run_stage(destination=destination)
        self.assertEqual(list(real.iterdir()), [child])
        self.assertEqual(list(child.iterdir()), [])

    def test_existing_dangling_symlink_is_not_followed_or_replaced(self):
        self.destination.mkdir(mode=0o700)
        link = self.destination / "manifest.json"
        target = self.directory / "outside"
        link.symlink_to(target)
        with self.assertRaises(stager.StageError):
            self.run_stage()
        self.assertTrue(link.is_symlink())
        self.assertFalse(target.exists())

    def test_world_accessible_destination_is_rejected_without_permission_repair(self):
        self.destination.mkdir(mode=0o700)
        for mode in (0o701, 0o707, 0o777):
            with self.subTest(mode=oct(mode)):
                self.destination.chmod(mode)
                with self.assertRaises(stager.StageError):
                    self.run_stage()
                self.assertEqual(stat.S_IMODE(self.destination.stat().st_mode), mode)
                self.assertEqual(list(self.destination.iterdir()), [])

    def test_wrong_manifest_digest_and_oversized_manifest_never_publish_success(self):
        with self.assertRaises(stager.StageError):
            self.run_stage(digest="0" * 64)
        self.assert_incomplete()
        oversized = self.directory / "oversized-manifest.json"
        oversized.write_bytes(b"x" * (64 * 1024 + 1))
        destination = self.directory / "oversized-output"
        with self.assertRaises(stager.StageError):
            self.run_stage(manifest=oversized, digest=hashlib.sha256(oversized.read_bytes()).hexdigest(),
                           destination=destination)
        self.assert_incomplete(destination)

    def test_manifest_symlink_and_symlink_ancestor_are_rejected(self):
        link = self.directory / "manifest-link.json"
        link.symlink_to(self.manifest)
        directory_link = self.directory / "review-link"
        directory_link.symlink_to(self.directory, target_is_directory=True)
        for index, manifest in enumerate((link, directory_link / self.manifest.name)):
            destination = self.directory / ("manifest-link-output-" + str(index))
            with self.subTest(manifest=manifest), self.assertRaises(stager.StageError):
                self.run_stage(manifest=manifest, destination=destination)
            self.assert_incomplete(destination)

    def test_corrupt_short_and_oversized_source_never_publish_success(self):
        name = ARTIFACT_PATHS[1]
        original = self.binaries[name]
        for index, data in enumerate((b"x" * len(original), original[:-1], b"x" * (128 * 1024 + 1))):
            with self.subTest(case=index):
                destination = self.directory / ("corrupt-" + str(index))
                (self.source / name).write_bytes(data)
                with self.assertRaises(stager.StageError):
                    self.run_stage(destination=destination)
                self.assert_incomplete(destination)

    def test_source_file_and_ancestor_symlinks_are_rejected(self):
        first = self.source / ARTIFACT_PATHS[0]
        original = self.directory / "original.jar"
        first.rename(original)
        first.symlink_to(original)
        with self.assertRaises(stager.StageError):
            self.run_stage()
        self.assert_incomplete()
        first.unlink()
        original.rename(first)
        link = self.directory / "source-link"
        link.symlink_to(self.source, target_is_directory=True)
        with self.assertRaises(stager.StageError):
            self.run_stage(source=link, destination=self.directory / "source-link-output")
        self.assert_incomplete(self.directory / "source-link-output")

    def test_fifo_sources_and_manifest_fail_within_a_bounded_time(self):
        code = """
import importlib.util, json, pathlib, sys
spec = importlib.util.spec_from_file_location('stage_fixture', sys.argv[1])
module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = module
spec.loader.exec_module(module)
module.ARTIFACTS = tuple(json.loads(sys.argv[2]))
try:
    module.stage(pathlib.Path(sys.argv[3]), sys.argv[4], pathlib.Path(sys.argv[5]),
                 source_root=pathlib.Path(sys.argv[6]))
except module.StageError:
    raise SystemExit(23)
raise SystemExit(0)
"""
        for index, path in enumerate((self.source / ARTIFACT_PATHS[0], self.manifest)):
            with self.subTest(path=path):
                original = path.read_bytes()
                path.unlink()
                os.mkfifo(path, 0o600)
                destination = self.directory / ("fifo-" + str(index))
                try:
                    result = subprocess.run(
                        [sys.executable, "-B", "-c", code, str(SCRIPT), json.dumps(self.artifacts),
                         str(self.manifest), self.manifest_hash, str(destination), str(self.source)],
                        capture_output=True, timeout=5, check=False,
                    )
                    self.assertEqual(result.returncode, 23, result.stderr.decode("utf-8", errors="replace"))
                    self.assert_incomplete(destination)
                finally:
                    path.unlink()
                    path.write_bytes(original)

    def test_failure_creating_second_copy_never_publishes_success(self):
        original_open = os.open
        failed = []

        def fail_second(path, flags, *args, **kwargs):
            if flags & os.O_CREAT and ARTIFACT_PATHS[1].split("/")[-1] in os.fspath(path):
                failed.append(path)
                raise OSError("synthetic second-copy failure")
            return original_open(path, flags, *args, **kwargs)

        with mock.patch.object(stager.os, "open", side_effect=fail_second):
            with self.assertRaises(stager.StageError):
                self.run_stage()
        self.assertTrue(failed, "The synthetic write failure must reach the second JAR")
        self.assert_incomplete()
        with self.assertRaises(stager.StageError):
            self.run_stage()

    def test_sync_failure_after_provenance_publication_removes_only_our_marker(self):
        original_link = os.link
        original_fsync = os.fsync
        foreign_bytes = b"synthetic foreign marker must survive cleanup"
        for replace_marker in (False, True):
            with self.subTest(replace_marker=replace_marker):
                destination = self.directory / ("publication-failure-" + str(replace_marker))
                state = {"linked": False, "failed": False}

                def record_publication(source, target, *args, **kwargs):
                    result = original_link(source, target, *args, **kwargs)
                    if os.fspath(target) == "staging-provenance.json":
                        state["linked"] = True
                    return result

                def fail_once_after_publication(descriptor):
                    if state["linked"] and not state["failed"]:
                        state["failed"] = True
                        if replace_marker:
                            marker = destination / "staging-provenance.json"
                            # Keep the original inode allocated so replacement cannot reuse it.
                            original_link(marker, self.directory / "retained-original-marker")
                            marker.unlink()
                            marker.write_bytes(foreign_bytes)
                            marker.chmod(0o600)
                        raise OSError("synthetic post-publication sync failure")
                    return original_fsync(descriptor)

                with mock.patch.object(stager.os, "link", side_effect=record_publication):
                    with mock.patch.object(stager.os, "fsync", side_effect=fail_once_after_publication):
                        with self.assertRaises(stager.StageError):
                            self.run_stage(destination=destination)
                self.assertTrue(state["linked"], "The failure must happen after exclusive publication")
                self.assertTrue(state["failed"])
                marker = destination / "staging-provenance.json"
                if replace_marker:
                    self.assertEqual(marker.read_bytes(), foreign_bytes)
                else:
                    self.assertFalse(marker.exists())
                self.assertEqual((destination / "manifest.json").read_bytes(), self.manifest_bytes)
                for name, data in self.binaries.items():
                    self.assertEqual((destination / "jars" / name).read_bytes(), data)

    def test_verify_accepts_read_only_completed_input_without_any_writes(self):
        self.run_stage()
        original = self.tree_snapshot()
        original_open = os.open

        def read_only_open(path, flags, *args, **kwargs):
            self.assertFalse(flags & (os.O_WRONLY | os.O_RDWR | os.O_CREAT | os.O_TRUNC),
                             "Verification must open files read-only")
            return original_open(path, flags, *args, **kwargs)

        with mock.patch.object(stager.os, "open", side_effect=read_only_open):
            with mock.patch.multiple(stager.os, **{
                name: mock.Mock(side_effect=AssertionError("Verification must not mutate input"))
                for name in ("mkdir", "unlink", "link", "chmod", "fchmod", "chown", "rename", "replace")
            }):
                self.run_stage(verify=True)
        self.assertEqual(self.tree_snapshot(), original)

    def test_verify_rejects_nonprivate_modes_without_repair(self):
        self.run_stage()
        copied = self.destination / "manifest.json"
        copied.chmod(0o640)
        original = self.tree_snapshot()
        with self.assertRaises(stager.StageError):
            self.run_stage(verify=True)
        self.assertEqual(self.tree_snapshot(), original)

    def test_verify_needs_only_the_completed_bundle_and_approved_digest(self):
        self.run_stage()
        self.manifest.rename(self.directory / "retained-original-manifest.json")
        self.source.rename(self.directory / "retained-original-sources")
        original = self.tree_snapshot()
        self.run_stage(verify=True)
        self.assertEqual(self.tree_snapshot(), original)

    def test_verify_rejects_extra_entries_and_symlinks_without_repair(self):
        self.run_stage()
        unexpected = self.destination / ".unexpected"
        unexpected.write_bytes(b"unexpected staged file")
        original = self.tree_snapshot()
        with self.assertRaises(stager.StageError):
            self.run_stage(verify=True)
        self.assertEqual(self.tree_snapshot(), original)
        unexpected.unlink()
        copied = self.destination / "jars" / ARTIFACT_PATHS[0]
        retained = self.directory / "retained-original.jar"
        copied.rename(retained)
        copied.symlink_to(retained)
        original = self.tree_snapshot()
        with self.assertRaises(stager.StageError):
            self.run_stage(verify=True)
        self.assertEqual(self.tree_snapshot(), original)
        self.assertEqual(retained.read_bytes(), self.binaries[ARTIFACT_PATHS[0]])

    def test_verify_detects_destination_root_replacement_without_repair(self):
        self.run_stage()
        original_read = stager._read
        retained = self.directory / "retained-completed-inputs"
        state = {}

        def replace_root_after_manifest_read(directory, name, *args, **kwargs):
            data = original_read(directory, name, *args, **kwargs)
            if os.fspath(name) == "manifest.json" and not state:
                self.destination.rename(retained)
                self.destination.mkdir(mode=0o700)
                marker = self.destination / "foreign"
                marker.write_bytes(b"replacement root must survive untouched")
                marker.chmod(0o600)
                state["original"] = self.tree_snapshot(retained)
                state["replacement"] = self.tree_snapshot()
            return data

        with mock.patch.object(stager, "_read", side_effect=replace_root_after_manifest_read):
            with self.assertRaises(stager.StageError):
                self.run_stage(verify=True)
        self.assertTrue(state, "The root replacement must occur during verification")
        self.assertEqual(self.tree_snapshot(retained), state["original"])
        self.assertEqual(self.tree_snapshot(), state["replacement"])

    def test_verify_rejects_missing_or_corrupt_staged_files_without_repair(self):
        self.run_stage()
        copied = self.destination / "jars" / ARTIFACT_PATHS[0]
        copied.write_bytes(b"corrupt staged bytes")
        original = self.tree_snapshot()
        with self.assertRaises(stager.StageError):
            self.run_stage(verify=True)
        self.assertEqual(self.tree_snapshot(), original)
        copied.unlink()
        original = self.tree_snapshot()
        with self.assertRaises(stager.StageError):
            self.run_stage(verify=True)
        self.assertEqual(self.tree_snapshot(), original)

    def test_two_concurrent_stagers_cannot_both_claim_an_empty_destination(self):
        def attempt(_index):
            try:
                self.run_stage()
                return "staged"
            except stager.StageError:
                return "rejected"

        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(executor.map(attempt, range(2)))
        self.assertEqual(sorted(results), ["rejected", "staged"])
        self.run_stage(verify=True)


if __name__ == "__main__":
    unittest.main()
