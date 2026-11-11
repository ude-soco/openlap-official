import base64
import contextlib
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


SCRIPT = Path(__file__).resolve().parents[1] / "openlap-analyticsframework/scripts/plugin-storage-secret-setup.py"
SPEC = importlib.util.spec_from_file_location("storage_secret_setup", SCRIPT)
setup = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(setup)


class SecretSetupTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="openlap-secret-setup-test-")
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name).resolve()
        self.output = self.root / "output"
        self.output.mkdir(mode=0o700)
        self.config = self.root / "synthetic.conf"
        self.config.write_bytes(b"[synthetic]\ntype = alias\nremote = /synthetic-fixture\n")
        self.config.chmod(0o600)

    def assert_empty(self):
        self.assertEqual(list(self.output.iterdir()), [])

    def env(self, name):
        path = self.output / name
        self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o600)
        return dict(line.split("=", 1) for line in path.read_text().splitlines())

    def test_separate_strong_new_credentials_and_metadata_only_result(self):
        result = setup.prepare(self.output)
        root = self.env(setup.ROOT_FILE)
        client = self.env(setup.CLIENT_FILE)
        self.assertEqual(set(root), {"ROOT_ACCESS_KEY_ID", "ROOT_SECRET_ACCESS_KEY"})
        self.assertEqual(set(client), {"PLUGIN_STORAGE_S3_ACCESS_KEY", "PLUGIN_STORAGE_S3_SECRET_KEY"})
        self.assertRegex(root["ROOT_ACCESS_KEY_ID"], r"^OLR[A-Z2-7]{17}$")
        self.assertRegex(client["PLUGIN_STORAGE_S3_ACCESS_KEY"], r"^OLA[A-Z2-7]{17}$")
        for value in [root["ROOT_SECRET_ACCESS_KEY"], client["PLUGIN_STORAGE_S3_SECRET_KEY"]]:
            self.assertRegex(value, r"^[A-Za-z0-9_-]{40}$")
            self.assertNotIn(value, json.dumps(result))
        self.assertNotEqual(root["ROOT_SECRET_ACCESS_KEY"], client["PLUGIN_STORAGE_S3_SECRET_KEY"])
        self.assertEqual(result["files"], [setup.ROOT_FILE, setup.CLIENT_FILE])
        self.assertFalse(result["deployed"])
        self.assertFalse(result["serviceAccessVerified"])
        self.assertEqual(len(list(self.output.iterdir())), 2)

    def test_native_encoding_copies_only_selected_synthetic_profile(self):
        original = self.config.read_bytes()
        before = setup.identity(self.config.stat())
        result = setup.prepare(self.output, self.config)
        encoded = self.env(setup.BACKUP_FILE)
        self.assertEqual(set(encoded), {"RCLONE_CONFIG_BASE64"})
        self.assertEqual(base64.b64decode(encoded["RCLONE_CONFIG_BASE64"], validate=True), original)
        self.assertEqual(setup.identity(self.config.stat()), before)
        self.assertEqual(self.config.read_bytes(), original)
        self.assertNotIn(encoded["RCLONE_CONFIG_BASE64"], json.dumps(result))

    def test_existing_target_is_never_overwritten_or_rotated(self):
        existing = self.output / setup.CLIENT_FILE
        existing.write_text("keep-existing-synthetic-file")
        with mock.patch.object(setup.secrets, "choice", side_effect=AssertionError("must not generate")):
            with self.assertRaises(setup.SetupError):
                setup.prepare(self.output, self.config)
        self.assertEqual(existing.read_text(), "keep-existing-synthetic-file")
        self.assertEqual(list(self.output.iterdir()), [existing])

    def test_unsafe_config_and_links_fail_without_publishing(self):
        symlink = self.root / "linked.conf"
        symlink.symlink_to(self.config)
        hardlink = self.root / "hard.conf"
        os.link(self.config, hardlink)
        for source in [symlink, self.config, hardlink]:
            with self.subTest(source=source.name), self.assertRaises(setup.SetupError):
                setup.prepare(self.output, source)
            self.assert_empty()
        hardlink.unlink()
        self.config.chmod(0o644)
        with self.assertRaises(setup.SetupError):
            setup.prepare(self.output, self.config)
        self.assert_empty()
        self.config.chmod(0o600)
        self.config.write_bytes(b"x" * (setup.MAX_CONFIG + 1))
        with self.assertRaises(setup.SetupError):
            setup.prepare(self.output, self.config)
        self.assert_empty()
        fifo = self.root / "fifo.conf"
        os.mkfifo(fifo, 0o600)
        with self.assertRaises(setup.SetupError):
            setup.prepare(self.output, fifo)
        self.assert_empty()

    def test_unsafe_output_directory_is_rejected_without_changes(self):
        linked = self.root / "linked-output"
        linked.symlink_to(self.output, target_is_directory=True)
        with self.assertRaises(setup.SetupError):
            setup.prepare(linked)
        self.output.chmod(0o777)
        try:
            with self.assertRaises(setup.SetupError):
                setup.prepare(self.output)
        finally:
            self.output.chmod(0o700)
        self.assert_empty()

    def test_native_failure_removes_only_new_staging_files(self):
        with mock.patch.object(setup.subprocess, "Popen", side_effect=OSError("synthetic-private-detail")):
            with self.assertRaises(OSError):
                setup.prepare(self.output, self.config)
        self.assert_empty()
        self.assertIn(b"synthetic", self.config.read_bytes())

    def test_changed_config_fails_before_publication(self):
        original = setup.encode_config
        def change(source, before, destination):
            self.config.write_bytes(b"changed-synthetic-input")
            return original(source, before, destination)
        with mock.patch.object(setup, "encode_config", side_effect=change):
            with self.assertRaises(setup.SetupError):
                setup.prepare(self.output, self.config)
        self.assert_empty()

    def test_publication_collision_preserves_competing_target(self):
        link = setup.os.link
        competitor = self.output / setup.CLIENT_FILE
        def race(source, destination, **kwargs):
            if destination == setup.CLIENT_FILE:
                competitor.write_text("keep-concurrent-synthetic-file")
            return link(source, destination, **kwargs)
        with mock.patch.object(setup.os, "link", side_effect=race):
            with self.assertRaises(FileExistsError):
                setup.prepare(self.output)
        self.assertEqual(competitor.read_text(), "keep-concurrent-synthetic-file")
        self.assertEqual(list(self.output.iterdir()), [competitor])

    def test_publication_flush_failure_rolls_back_own_links(self):
        sync = setup.os.fsync
        output_inode = self.output.stat().st_ino
        def fail(fd):
            if os.fstat(fd).st_ino == output_inode and (self.output / setup.ROOT_FILE).exists():
                raise OSError("synthetic directory flush failure")
            return sync(fd)
        with mock.patch.object(setup.os, "fsync", side_effect=fail):
            with self.assertRaises(OSError):
                setup.prepare(self.output)
        self.assert_empty()

    def test_cli_requires_explicit_action_and_never_echoes_unknown_arguments(self):
        result = subprocess.run([sys.executable, "-B", str(SCRIPT), "--output-directory", str(self.output)],
                                capture_output=True, timeout=10)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(result.stdout, b"")
        self.assert_empty()
        marker = "synthetic-private-argument"
        result = subprocess.run([sys.executable, "-B", str(SCRIPT), "--unexpected", marker],
                                capture_output=True, timeout=10)
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn(marker.encode(), result.stdout + result.stderr)

    def test_cli_success_and_late_output_failure(self):
        result = subprocess.run([sys.executable, "-B", str(SCRIPT), "--prepare",
            "--output-directory", str(self.output), "--rclone-config", str(self.config)],
            capture_output=True, timeout=20)
        self.assertEqual(result.returncode, 0)
        metadata = json.loads(result.stdout)
        self.assertEqual(metadata["status"], "PRIVATE_ENV_FILES_PREPARED")
        self.assertEqual(result.stderr, b"")
        for name in metadata["files"]:
            for value in self.env(name).values():
                self.assertNotIn(value.encode(), result.stdout + result.stderr)
        another = self.root / "another-output"
        another.mkdir(mode=0o700)
        class FailingOutput(io.StringIO):
            def flush(self):
                raise OSError("synthetic output failure")
        with mock.patch.object(sys, "argv", [str(SCRIPT), "--prepare", "--output-directory", str(another)]):
            with contextlib.redirect_stdout(FailingOutput()), contextlib.redirect_stderr(io.StringIO()) as errors:
                self.assertEqual(setup.main(), 1)
        self.assertEqual(len(list(another.iterdir())), 2)
        self.assertNotIn("synthetic output failure", errors.getvalue())


if __name__ == "__main__":
    unittest.main()
