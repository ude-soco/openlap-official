#!/usr/bin/env python3
"""Reject Docker JDK flavor changes outside the qualified Java 25 LTS policy."""
from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]


def check(root=ROOT):
    backend = root / "analyticsframework"
    properties = (backend / ".mvn/wrapper/maven-wrapper.properties").read_text()
    distribution = re.search(r"^distributionUrl=.*apache-maven-(\d+\.\d+\.\d+)-bin\.zip$",
                             properties, re.MULTILINE)
    if distribution is None:
        raise ValueError("The Maven wrapper must declare an exact Maven release.")
    maven = distribution[1]
    expected = None
    for name in ("Dockerfile", "Dockerfile.plugin-migration", "Dockerfile.plugin-storage-versity"):
        stages = re.findall(r"^FROM\s+(?:--platform=\S+\s+)?(\S+)",
                            (backend / name).read_text(), re.MULTILINE)
        if len(stages) != 2:
            raise ValueError(name + ": review the toolchain policy for the changed build stages.")
        if not re.fullmatch(r"maven:" + re.escape(maven) + r"-eclipse-temurin-25@sha256:[a-f0-9]{64}", stages[0]):
            raise ValueError(name + ": builder must match Maven " + maven + " and the qualified Java 25 LTS line.")
        if not re.fullmatch(r"amazoncorretto:25\.\d+\.\d+@sha256:[a-f0-9]{64}", stages[1]):
            raise ValueError(name + ": runtime must stay on the qualified Java 25 LTS line with an exact digest.")
        if expected is not None and stages != expected:
            raise ValueError(name + ": align builder and runtime pins across all three backend images.")
        expected = stages


if __name__ == "__main__":
    try:
        check()
    except ValueError as error:
        raise SystemExit(str(error)) from None
    print("Backend toolchain verified: matching Maven releases and digest-pinned Java 25 LTS images.")
