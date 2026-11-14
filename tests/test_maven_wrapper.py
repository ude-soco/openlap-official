#!/usr/bin/env python3
"""Run the real wrapper with generated archives and isolated tools; no network."""
import hashlib
import io
import json
import os
from pathlib import Path
import shutil
import stat
import subprocess
import sys
import tarfile
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]
ZIP_URL = "https://fixture.invalid/org/apache/maven/apache-maven/fixture/apache-maven-fixture-bin.zip"
TAR_URL = ZIP_URL.removesuffix(".zip") + ".tar.gz"
TOOL_PREAMBLE = '''
import hashlib, json, os, shutil, sys, zipfile
from pathlib import Path
def record(tool, **details):
    with Path(os.environ["FIXTURE_LOG"]).open("a") as stream:
        stream.write(json.dumps({"tool": tool, **details}) + "\\n")
'''
CURL = TOOL_PREAMBLE + '''
args = sys.argv[1:]
url = args[-1]
record("curl", url=url)
if url == os.environ["FIXTURE_ZIP_URL"]:
    archive = os.environ["FIXTURE_ZIP"]
elif url == os.environ["FIXTURE_TAR_URL"]:
    archive = os.environ["FIXTURE_TAR"]
else:
    raise SystemExit("Unexpected fixture URL")
shutil.copyfile(archive, args[args.index("-o") + 1])
'''
SHA256SUM = TOOL_PREAMBLE + '''
if sys.argv[1:] != ["-c", "-"]:
    raise SystemExit("Unexpected checksum arguments")
expected, filename = sys.stdin.readline().split(None, 1)
filename = filename.rstrip("\\r\\n")
record("sha256sum", archive=Path(filename).name)
actual = hashlib.sha256(Path(filename).read_bytes()).hexdigest()
raise SystemExit(0 if actual == expected else 1)
'''
JAR = TOOL_PREAMBLE + '''
if len(sys.argv) != 3 or sys.argv[1] != "xf":
    raise SystemExit("Unexpected jar arguments")
record("jar", executable=sys.argv[0], archive=Path(sys.argv[2]).name)
# The JDK jar extractor does not preserve the ZIP's executable file mode.
with zipfile.ZipFile(sys.argv[2]) as archive:
    archive.extractall()
'''
MAVEN = TOOL_PREAMBLE + '''
record("maven", arguments=sys.argv[1:])
print("Fixture Maven executed")
'''
CYGPATH = TOOL_PREAMBLE + '''
args = sys.argv[1:]
record("cygpath", arguments=args)
if len(args) == 2 and args[0] == "--unix":
    print(args[1])
elif len(args) == 3 and args[:2] == ["--path", "--windows"]:
    # This POSIX-hosted simulation keeps paths executable while proving that
    # the wrapper requests native conversion for both jar and its ZIP argument.
    print(args[2])
else:
    raise SystemExit("Unexpected cygpath arguments")
'''


class MavenWrapperTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="openlap-wrapper-test-")
        self.addCleanup(temporary.cleanup)
        self.directory = Path(temporary.name)
        self.commands = self.directory / "restricted-path"
        self.commands.mkdir()
        # These utilities are the wrapper's normal shell dependencies. Deliberately
        # omit unzip, jar, java, javac, wget and any inherited command search path.
        for name in ("uname", "dirname", "basename", "tr", "mktemp", "rm", "mkdir", "mv", "chmod", "tar", "gzip"):
            executable = shutil.which(name, path=os.defpath)
            if executable is None:
                self.fail("Required shell fixture tool is unavailable: " + name)
            (self.commands / name).symlink_to(executable)
        self.write_tool(self.commands / "curl", CURL)
        self.write_tool(self.commands / "sha256sum", SHA256SUM)
        self.project = self.directory / "project"
        properties_dir = self.project / ".mvn/wrapper"
        properties_dir.mkdir(parents=True)
        self.properties = properties_dir / "maven-wrapper.properties"
        self.wrapper = self.project / "mvnw"
        shutil.copyfile(ROOT / "analyticsframework/mvnw", self.wrapper)
        self.jdk = self.directory / "fixture JDK"
        (self.jdk / "bin").mkdir(parents=True)
        self.write_tool(self.jdk / "bin/java", "raise SystemExit('Unexpected Java invocation')\n")
        self.write_tool(self.jdk / "bin/javac", "raise SystemExit('Unexpected javac invocation')\n")
        self.zip = self.directory / "distribution.zip"
        self.tar = self.directory / "distribution.tar.gz"
        payload = ("#!" + sys.executable + "\n" + MAVEN).encode()
        entry = zipfile.ZipInfo("apache-maven-fixture/bin/mvn")
        entry.external_attr = (stat.S_IFREG | 0o755) << 16
        with zipfile.ZipFile(self.zip, "w") as archive:
            archive.writestr(entry, payload)
        with tarfile.open(self.tar, "w:gz") as archive:
            entry = tarfile.TarInfo("apache-maven-fixture/bin/mvn")
            entry.size = len(payload)
            entry.mode = 0o755
            archive.addfile(entry, io.BytesIO(payload))
        self.checksum = hashlib.sha256(self.zip.read_bytes()).hexdigest()
        self.home = self.directory / "fresh Maven home"
        self.log = self.directory / "commands.jsonl"
        for name in ("home", "temporary downloads"):
            (self.directory / name).mkdir()
        self.environment = {
            "PATH": str(self.commands),
            "HOME": str(self.directory / "home"),
            "MAVEN_USER_HOME": str(self.home),
            "TMPDIR": str(self.directory / "temporary downloads"),
            "LANG": "C",
            "FIXTURE_LOG": str(self.log),
            "FIXTURE_ZIP": str(self.zip),
            "FIXTURE_TAR": str(self.tar),
            "FIXTURE_ZIP_URL": ZIP_URL,
            "FIXTURE_TAR_URL": TAR_URL,
        }

    @staticmethod
    def write_tool(path, source):
        path.write_text("#!" + sys.executable + "\n" + source)
        path.chmod(0o755)

    def run_wrapper(self, *, verified=True):
        self.properties.write_text("distributionUrl=" + ZIP_URL + "\n" + (
            "distributionSha256Sum=" + self.checksum + "\n" if verified else ""))
        self.assertFalse(self.home.exists(), "Each fixture must use a fresh wrapper installation")
        result = subprocess.run(["/bin/sh", str(self.wrapper), "--version"],
                                env=self.environment, capture_output=True, text=True, timeout=15)
        calls = [json.loads(line) for line in self.log.read_text().splitlines()] if self.log.exists() else []
        return result, calls

    def assert_verified_zip_ran(self, result, calls, jar):
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("Fixture Maven executed", result.stdout)
        self.assertEqual([call["tool"] for call in calls], ["curl", "sha256sum", "jar", "maven"])
        self.assertEqual(calls[0]["url"], ZIP_URL)
        self.assertEqual(calls[2]["executable"], str(jar))
        self.assertEqual(calls[2]["archive"], "apache-maven-fixture-bin.zip")
        self.assertEqual(calls[3]["arguments"], ["--version"])
        installations = list(self.home.glob("wrapper/dists/apache-maven-fixture/*/bin/mvn"))
        self.assertEqual(len(installations), 1)
        self.assertTrue(installations[0].stat().st_mode & stat.S_IXUSR,
                        "The jar extractor loses ZIP modes, so the wrapper must restore Maven execution")
        self.assertEqual((installations[0].parents[1] / "mvnw.url").read_text().strip(), ZIP_URL)

    def test_verified_zip_uses_java_home_jar_without_unzip_and_restores_execution(self):
        jar = self.jdk / "bin/jar"
        self.write_tool(jar, JAR)
        self.write_tool(self.commands / "jar", "raise SystemExit('PATH jar must not override JAVA_HOME')\n")
        self.environment["JAVA_HOME"] = str(self.jdk)
        result, calls = self.run_wrapper()
        self.assert_verified_zip_ran(result, calls, jar)

    def test_verified_zip_uses_path_jar_when_java_home_is_unset(self):
        jar = self.commands / "jar"
        self.write_tool(jar, JAR)
        result, calls = self.run_wrapper()
        self.assert_verified_zip_ran(result, calls, jar)

    def test_mingw_converts_java_home_jar_and_archive_paths(self):
        jar = self.jdk / "bin/jar"
        self.write_tool(jar, JAR)
        self.environment["JAVA_HOME"] = str(self.jdk)
        (self.commands / "uname").unlink()
        self.write_tool(self.commands / "uname", "print('MINGW64_NT-fixture')\n")
        self.write_tool(self.commands / "cygpath", CYGPATH)
        result, calls = self.run_wrapper()
        conversions = [call["arguments"] for call in calls if call["tool"] == "cygpath"]
        self.assertEqual(conversions[:2], [["--unix", str(self.jdk)], ["--path", "--windows", str(jar)]])
        self.assertEqual(len(conversions), 3)
        self.assertEqual(conversions[2][:2], ["--path", "--windows"])
        self.assertEqual(Path(conversions[2][2]).name, "apache-maven-fixture-bin.zip")
        self.assertIn("temporary downloads", conversions[2][2])
        self.assert_verified_zip_ran(result, [call for call in calls if call["tool"] != "cygpath"], jar)

    def test_corrupt_zip_is_rejected_before_extraction_or_maven_execution(self):
        self.write_tool(self.jdk / "bin/jar", JAR)
        self.environment["JAVA_HOME"] = str(self.jdk)
        # Appended bytes retain an extractable ZIP, so only checksum validation
        # prevents this archive from reaching the extractor and Maven launcher.
        with self.zip.open("ab") as stream:
            stream.write(b"corrupt fixture payload")
        result, calls = self.run_wrapper()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Failed to validate Maven distribution SHA-256", result.stderr)
        self.assertEqual([call["tool"] for call in calls], ["curl", "sha256sum"])
        self.assertEqual(calls[0]["url"], ZIP_URL)
        self.assertFalse(list(self.home.glob("wrapper/dists/*/*/bin/mvn")))

    def test_verified_zip_without_an_extractor_fails_clearly(self):
        result, calls = self.run_wrapper()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Cannot extract checksum-verified Maven ZIP", result.stderr)
        self.assertIn("unzip", result.stderr)
        self.assertIn("jar", result.stderr)
        self.assertFalse(any(call["tool"] in ("jar", "maven") for call in calls))

    def test_invalid_java_home_jar_does_not_fall_back_to_path_jar(self):
        self.write_tool(self.commands / "jar", JAR)
        self.environment["JAVA_HOME"] = str(self.jdk)
        result, calls = self.run_wrapper()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Cannot extract checksum-verified Maven ZIP", result.stderr)
        self.assertFalse(any(call["tool"] in ("jar", "maven") for call in calls))

    def test_unverified_distribution_keeps_the_existing_tar_fallback(self):
        self.write_tool(self.jdk / "bin/jar", "raise SystemExit('Unverified archives must retain tar fallback')\n")
        self.environment["JAVA_HOME"] = str(self.jdk)
        result, calls = self.run_wrapper(verified=False)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual([call["tool"] for call in calls], ["curl", "maven"])
        self.assertEqual(calls[0]["url"], TAR_URL)
        self.assertEqual(calls[1]["arguments"], ["--version"])


if __name__ == "__main__":
    unittest.main()
