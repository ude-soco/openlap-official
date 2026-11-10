#!/usr/bin/env python3
"""Compatibility launcher for the documented preservation CLI path."""
from pathlib import Path
import runpy

if __name__ == "__main__":
    runpy.run_path(str(Path(__file__).resolve().parents[1] / "plugin-preservation-code" / "client.py"), run_name="__main__")
