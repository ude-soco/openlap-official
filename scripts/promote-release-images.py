#!/usr/bin/env python3
"""Promote a committed, reviewed release plan without building images."""
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile

RELEASES = Path(__file__).resolve().parents[1] / "docs/releases"
PLAN = RELEASES / "0.0.6-images.json"
REPOSITORY = "ude-soco/openlap-official"
SERVICES = ("analyticsframework", "indicatorframework")
# These committed releases retain their original package identities and digests.
# Future release plans must use the canonical pair; never reinterpret old plans.
LEGACY_SERVICES = ("openlap-analyticsframework", "openlap-indicatoreditor")
LEGACY_VERSIONS = frozenset({"0.0.6", "0.0.7"})
MEDIA_TYPES = {
    "application/vnd.docker.distribution.manifest.v2+json",
    "application/vnd.docker.distribution.manifest.list.v2+json",
    "application/vnd.oci.image.manifest.v1+json",
    "application/vnd.oci.image.index.v1+json",
}


class PromotionError(Exception):
    pass


def confirmed_version(environment):
    value = environment.get("CONFIRMATION_VERSION", "")
    if not isinstance(value, str) or len(value) > 32 or not re.fullmatch(
            r"(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)", value):
        raise PromotionError("Confirm a reviewed stable release version.")
    return value


def load_plan(environment):
    path = RELEASES / (confirmed_version(environment) + "-images.json")
    if path.is_symlink() or not path.is_file() or path.stat().st_size > 16384:
        raise PromotionError("A bounded committed release plan is required.")
    return json.loads(path.read_text())


def command(args):
    # Docker alone accesses its native credentials. Never forward its raw output.
    with tempfile.TemporaryFile() as out, tempfile.TemporaryFile() as err:
        try:
            result = subprocess.run(args, stdout=out, stderr=err, timeout=120, check=False)
        except (OSError, subprocess.TimeoutExpired) as exc:
            raise PromotionError("Registry command could not complete.") from exc
        values = []
        for stream in (out, err):
            stream.seek(0)
            value = stream.read(262145)
            if len(value) > 262144:
                raise PromotionError("Registry response exceeded its output limit.")
            values.append(value)
        return subprocess.CompletedProcess(args, result.returncode, *values)


def explicit_missing(stderr, reference):
    # Only an exact, reference-qualified manifest lookup error means absent.
    # Authentication, transport errors, generic HTTP404 and mixed errors fail closed.
    try:
        message = stderr.decode("utf-8").strip()
    except UnicodeDecodeError:
        return False
    return message in (
        "ERROR: " + reference + ": not found",
        "ERROR: " + reference + ": manifest unknown",
        "ERROR: " + reference + ": manifest unknown: manifest unknown",
    )


class Registry:
    def __init__(self, run=command):
        self.run = run

    def inspect(self, reference, allow_missing=False):
        result = self.run(["docker", "buildx", "imagetools", "inspect", reference,
                           "--format", "{{json .Manifest}}"])
        if result.returncode:
            if allow_missing and not result.stdout.strip() and explicit_missing(result.stderr, reference):
                return None
            raise PromotionError("Registry manifest lookup failed; no absence was assumed.")
        try:
            manifest = json.loads(result.stdout)
            digest = manifest["digest"]
            if not re.fullmatch(r"sha256:[a-f0-9]{64}", digest):
                raise ValueError()
            if manifest["mediaType"] not in MEDIA_TYPES:
                raise ValueError()
        except (ValueError, KeyError, TypeError):
            raise PromotionError("Registry returned an invalid manifest descriptor.") from None
        return digest

    def copy(self, source, target):
        result = self.run(["docker", "buildx", "imagetools", "create",
                           "--prefer-index=false", "--progress", "none", "--tag", target, source])
        if result.returncode:
            raise PromotionError("Registry manifest copy failed; rerun only after inspecting the release status.")


def checked_plan(plan, environment):
    if environment.get("GITHUB_REPOSITORY") != REPOSITORY:
        raise PromotionError("Promotion requires the official repository.")
    if environment.get("GITHUB_REF") != "refs/heads/main" or environment.get("GITHUB_EVENT_NAME") != "workflow_dispatch":
        raise PromotionError("Promotion requires a manual main-branch workflow run.")
    version = confirmed_version(environment)
    if version in LEGACY_VERSIONS:
        services = LEGACY_SERVICES
    elif tuple(map(int, version.split("."))) > (0, 0, 7):
        services = SERVICES
    else:
        raise PromotionError("An unsupported historical release cannot select image packages.")
    if not isinstance(plan, dict) or set(plan) != {"version", "repository", "sourceRevision", "images"} or plan["version"] != version or plan["repository"] != REPOSITORY:
        raise PromotionError("Unexpected release plan.")
    if not re.fullmatch(r"[a-f0-9]{40}", plan["sourceRevision"]):
        raise PromotionError("Invalid reviewed source revision.")
    if not isinstance(plan["images"], list) or len(plan["images"]) != len(services):
        raise PromotionError("Unexpected release services.")
    references = []
    for image, service in zip(plan["images"], services):
        if set(image) != {"service", "digest"} or image["service"] != service or not re.fullmatch(r"sha256:[a-f0-9]{64}", image["digest"]):
            raise PromotionError("Invalid reviewed image identity.")
        name = "ghcr.io/" + REPOSITORY + "-" + service
        references.append((name + "@" + image["digest"], name + ":" + plan["version"], image["digest"]))
    return references


def promote(plan, environment, registry):
    references = checked_plan(plan, environment)
    # Check BOTH immutable sources and BOTH destinations before the first write.
    for source, _, digest in references:
        if registry.inspect(source) != digest:
            raise PromotionError("Reviewed source digest did not match.")
    for _, target, digest in references:
        if registry.inspect(target, allow_missing=True) not in (None, digest):
            raise PromotionError("Release tag already points to another digest; refusing to overwrite.")
    images = []
    for source, target, digest in references:
        # Narrow the race with other publishers; this workflow also serializes runs.
        existing = registry.inspect(target, allow_missing=True)
        if existing not in (None, digest):
            raise PromotionError("Release tag changed; refusing to overwrite.")
        if existing is None:
            registry.copy(source, target)
        if registry.inspect(target) != digest:
            raise PromotionError("Published digest differs from the reviewed source; stop deployment.")
        images.append({"source": source, "target": target, "digest": digest})
    # Recheck the complete pair after publication, including idempotently skipped tags.
    if any(registry.inspect(target) != digest for _, target, digest in references):
        raise PromotionError("Final release digest verification failed.")
    return {"status": "REVIEWED_IMAGE_DIGESTS_PROMOTED", "version": plan["version"],
            "sourceRevision": plan["sourceRevision"], "images": images}


def main():
    try:
        report = promote(load_plan(os.environ), os.environ, Registry())
        Path("release-image-promotion.json").write_text(json.dumps(report, indent=2) + "\n")
        print(json.dumps(report, separators=(",", ":")))
    except (PromotionError, OSError, ValueError) as exc:
        # Error messages from registry processes and credentials are never printed.
        message = str(exc) if isinstance(exc, PromotionError) else "Could not read or record the reviewed release plan."
        raise SystemExit(message) from None


if __name__ == "__main__":
    main()
