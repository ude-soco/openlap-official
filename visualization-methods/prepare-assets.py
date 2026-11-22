#!/usr/bin/env python3
"""Prepare the checksummed manifest and browser resources for either plugin JAR."""

import argparse
import base64
import hashlib
import io
import json
import os
from pathlib import Path
import tarfile
from tempfile import NamedTemporaryFile
from urllib.request import urlopen


MODULE = Path(__file__).resolve().parent
ROOT = MODULE.parent
ICONS = ROOT / "indicatorframework/src/assets/images/indicator-editor-visualization"
VENDOR = ROOT / "analyticsframework/src/main/resources/openlap-chart-runtime/vendor"
APEX_VERSION = "4.7.0"
APEX_INTEGRITY = "iZSrrBGvVlL+nt2B1NpqfDuBZ9jX61X9I2+XV0hlYXHtTwhwLTHDKGXjNXAgFBDLuvSYCB/rq2nPWVPRv2DrGA=="
CHARTS = (
    ("bar", "Bar", "bar_graph.svg", "Compare one numerical measure across categories."),
    ("line", "Line", "multi_line_graph.svg", "Show a numerical trend across categories in the order of the data."),
    ("area", "Area", "area_graph.svg", "Show a numerical trend with the area under the line filled."),
    ("pie", "Pie", "pie_chart.svg", "Show each non-negative value as a share of a positive whole."),
    ("donut", "Donut", "donut_chart.svg", "Compare non-negative shares of a positive whole in a ring."),
    ("scatter", "ScatterPlot", "scatterplot.svg", "Compare two numerical measures. Add a label or color points by group if available."),
    ("grouped-area", "GroupedArea", "grouped_area_chart.svg", "Compare areas for several series across the same categories."),
    ("stacked-area", "StackedArea", None, "Show how multiple series contribute to the total across categories."),
    ("multi-line", "MultiLine", "multi_line_graph.svg", "Compare trends for several series across the same categories."),
)
GROUPED = {"grouped-area", "stacked-area", "multi-line"}
SLICES = {"pie", "donut"}


def apex_package():
    cache = MODULE / ".cache"
    archive = cache / f"apexcharts-{APEX_VERSION}.tgz"
    if archive.exists():
        content = archive.read_bytes()
    else:
        url = f"https://registry.npmjs.org/apexcharts/-/apexcharts-{APEX_VERSION}.tgz"
        with urlopen(url, timeout=30) as response:
            content = response.read()
    if base64.b64encode(hashlib.sha512(content).digest()).decode("ascii") != APEX_INTEGRITY:
        raise ValueError(f"ApexCharts {APEX_VERSION} does not match its pinned npm integrity.")
    if not archive.exists():
        cache.mkdir(exist_ok=True)
        with NamedTemporaryFile(dir=cache, delete=False) as temporary:
            temporary.write(content)
        os.replace(temporary.name, archive)
    with tarfile.open(fileobj=io.BytesIO(content), mode="r:gz") as package:
        return {
            name: package.extractfile("package/" + name).read()
            for name in ("dist/apexcharts.min.js", "LICENSE")
        }


def control(identifier, label, kind, default, group, **details):
    return {"id": identifier, "label": label, "type": kind, "defaultValue": default, "group": group, **details}


def customizations(kind):
    controls = [
        control("chartTitle", "Chart title", "text", "", "elements"),
        control("showLegend", "Show legend", "boolean", True, "elements"),
        control("showValues", "Show values", "boolean", False, "elements"),
    ]
    if kind not in SLICES:
        controls.extend((
            control("xAxisLabel", "X-axis label", "text", "", "elements"),
            control("yAxisLabel", "Y-axis label", "text", "", "elements"),
            control("showGrid", "Show grid lines", "boolean", True, "styles"),
        ))
    controls.extend((
        control("seriesColor", "Primary color", "color", "#1976d2", "styles",
                help="Color of the first series or slice."),
        control("height", "Chart height", "number", 420, "styles", min=320, max=800, step=20,
                help="Height of the chart in pixels. Its width follows the available space."),
    ))
    return controls


def prepare(library, output, version):
    assets = []

    def write(path, content):
        target = output / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)

    def asset(identifier, name, kind, content, generated=True):
        path = "web/" + name
        if generated:
            write(path, content)
        assets.append({"id": identifier, "path": path, "kind": kind, "sha256": hashlib.sha256(content).hexdigest()})

    if library == "c3":
        engine_version = "0.7.18"
        for identifier, filename, kind in (
            ("c3-style", "c3-0.7.18.min.css", "style"),
            ("d3", "d3-5.16.0.min.js", "script"),
            ("c3", "c3-0.7.18.min.js", "script"),
        ):
            asset(identifier, filename, kind, (VENDOR / filename).read_bytes())
        for filename in ("c3-LICENSE", "d3-LICENSE"):
            write("META-INF/licenses/" + filename, (VENDOR / filename).read_bytes())
        renderer = "c3-renderer.js"
    else:
        engine_version = APEX_VERSION
        apex = apex_package()
        asset("apexcharts", f"apexcharts-{APEX_VERSION}.min.js", "script", apex["dist/apexcharts.min.js"])
        write("META-INF/licenses/apexcharts-LICENSE", apex["LICENSE"])
        renderer = "apex-renderer.js"

    renderer_source = MODULE / library / "src/main/resources/web" / renderer
    asset("renderer", renderer, "script", renderer_source.read_bytes(), generated=False)
    runtime = {"id": library, "version": engine_version, "assets": [entry["id"] for entry in assets]}
    charts = []
    icon_ids = {}
    for key, java_class, icon, description in CHARTS:
        roles = {"category": "label" if key == "scatter" else "category"}
        if key in GROUPED or key == "scatter":
            roles["series"] = "series"
        chart = {
            "id": key,
            "implementingClass": f"org.openlap.visualizations.{library}.{java_class}",
            "runtimeId": library,
            "description": description,
            "inputRoles": roles,
            "customizations": customizations(key),
        }
        if icon:
            if icon not in icon_ids:
                icon_ids[icon] = f"{key}-icon"
                asset(icon_ids[icon], "icons/" + icon, "image", (ICONS / icon).read_bytes())
            chart["iconAssetId"] = icon_ids[icon]
        charts.append(chart)

    manifest = {
        "schemaVersion": 1,
        "pluginId": "openlap.visualization." + library,
        "pluginVersion": version,
        "assets": assets,
        "runtimes": [runtime],
        "charts": charts,
    }
    write("META-INF/openlap/visualization.json", (json.dumps(manifest, indent=2) + "\n").encode("utf-8"))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("library", choices=("c3", "apexcharts"))
    parser.add_argument("output", type=Path)
    parser.add_argument("version")
    arguments = parser.parse_args()
    prepare(arguments.library, arguments.output, arguments.version)
