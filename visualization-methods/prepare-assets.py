#!/usr/bin/env python3
"""Prepare the checksummed manifest and browser resources for a plugin JAR."""

import argparse
import base64
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import tarfile
from tempfile import NamedTemporaryFile
from urllib.request import urlopen


MODULE = Path(__file__).resolve().parent
ROOT = MODULE.parent
ICONS = ROOT / "indicatorframework/src/assets/images/indicator-editor-visualization"
VENDOR = ROOT / "analyticsframework/src/main/resources/openlap-chart-runtime/vendor"
APEX_VERSION = "4.7.0"
APEX_INTEGRITY = "iZSrrBGvVlL+nt2B1NpqfDuBZ9jX61X9I2+XV0hlYXHtTwhwLTHDKGXjNXAgFBDLuvSYCB/rq2nPWVPRv2DrGA=="
PLOTLY_VERSION = "4.3.0"
PLOTLY_INTEGRITY = "WNbx44cL+Z0dqTxMHeTJNKg/M7ldoTe3QcuknbnDba57IP/CXQiccIM0eyPT2glxvqQKrLzdyo5+mmDz16BXgA=="
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
PALETTES = {
    "c3": ["#1976d2", "#b2458b", "#168370", "#b85417", "#6253b4", "#7c6417", "#55744a", "#b64550"],
    "apexcharts": ["#1976d2", "#e66b19", "#368747", "#8054a6", "#c73e57", "#008883", "#ab7400", "#686cc3"],
    "plotly": ["#1976d2", "#c35b26", "#17816b", "#8c52aa", "#bd455f", "#76641f", "#5368b3"],
}
PALETTES["recharts"] = PALETTES["c3"]


def npm_package(package_name, version, integrity, *files):
    cache = MODULE / ".cache"
    archive = cache / f"{package_name}-{version}.tgz"
    if archive.exists():
        content = archive.read_bytes()
    else:
        url = f"https://registry.npmjs.org/{package_name}/-/{archive.name}"
        with urlopen(url, timeout=30) as response:
            content = response.read()
    if base64.b64encode(hashlib.sha512(content).digest()).decode("ascii") != integrity:
        raise ValueError(f"{package_name} {version} does not match its pinned npm integrity.")
    if not archive.exists():
        cache.mkdir(exist_ok=True)
        with NamedTemporaryFile(dir=cache, delete=False) as temporary:
            temporary.write(content)
        os.replace(temporary.name, archive)
    with tarfile.open(fileobj=io.BytesIO(content), mode="r:gz") as package:
        return {
            name: package.extractfile("package/" + name).read()
            for name in files
        }


def build_recharts(output):
    browser = MODULE / "recharts" / "browser"
    package = json.loads((browser / "package.json").read_text(encoding="utf-8"))
    subprocess.run(["npm", "ci", "--include=dev", "--ignore-scripts", "--no-audit", "--no-fund"],
                   cwd=browser, check=True)
    subprocess.run(["node", "build.mjs", str(output.resolve())], cwd=browser, check=True)
    return package["dependencies"]["recharts"]


def control(identifier, label, kind, default, group, **details):
    return {"id": identifier, "label": label, "type": kind, "defaultValue": default, "group": group, **details}


def choice(identifier, label, default, group, options, **details):
    return control(identifier, label, "select", default, group,
                   options=[{"value": value, "label": name} for value, name in options], **details)


def customizations(kind):
    controls = [
        control("chartTitle", "Chart title", "text", "", "elements"),
        control("chartSubtitle", "Chart subtitle", "text", "", "elements"),
        choice("titlePosition", "Title and Subtitle Position", "left", "elements",
               [("left", "Left"), ("center", "Center"), ("right", "Right")]),
        control("showLegend", "Show legend", "boolean", True, "elements"),
        choice("legendPosition", "Legend Position", "bottom", "elements",
               [("top", "Top"), ("right", "Right"), ("bottom", "Bottom"), ("left", "Left")]),
        control("showValues", "Show labels", "boolean", True, "elements"),
        control("showValuesBackground", "Show labels background", "boolean", False, "elements"),
    ]
    if kind == "bar":
        controls.append(choice("valuesPosition", "Labels Position", "center", "elements",
                               [("top", "Top"), ("center", "Center"), ("bottom", "Bottom")]))
    if kind not in SLICES:
        controls.extend((
            control("showXAxis", "Show X-axis", "boolean", True, "elements"),
            control("showYAxis", "Show Y-axis", "boolean", True, "elements"),
            control("showXAxisTitle", "Show X-axis title", "boolean", True, "elements"),
            control("showYAxisTitle", "Show Y-axis title", "boolean", True, "elements"),
            control("xAxisLabel", "X-axis title", "text", "", "elements"),
            control("yAxisLabel", "Y-axis title", "text", "", "elements"),
            control("showGrid", "Show grid lines", "boolean", True, "styles"),
        ))
    controls.extend((
        control("seriesColor", "Primary color", "color", "#1976d2", "styles",
                help="Color of the first series or slice."),
        control("useSeriesColors", "Use series colors", "boolean", False, "styles"),
        control("dataLabelsColor", "Data labels color", "color", "#000000", "styles"),
        control("dataLabelsForeColor", "Data labels fore color (when background activated)",
                "color", "#ffffff", "styles"),
        control("height", "Chart height", "number", 420, "styles", min=320, max=800, step=20,
                help="Height of the chart in pixels. Its width follows the available space."),
    ))
    if kind in SLICES:
        controls.append(control("seriesColors", "Slice colors", "seriesColors", [], "styles", source="category"))
    elif kind in GROUPED or kind == "scatter":
        controls.append(control("seriesColors", "Series colors", "seriesColors", [], "styles", source="series"))
    if kind == "bar":
        controls.extend((
            choice("sortingOrder", "Data order", "original", "filters",
                   [("original", "Original order"), ("asc", "Value ascending"), ("desc", "Value descending")]),
            control("hiddenCategories", "Visible categories", "categoryFilter", [], "filters"),
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
    elif library == "apexcharts":
        engine_version = APEX_VERSION
        apex = npm_package("apexcharts", APEX_VERSION, APEX_INTEGRITY, "dist/apexcharts.min.js", "LICENSE")
        asset("apexcharts", f"apexcharts-{APEX_VERSION}.min.js", "script", apex["dist/apexcharts.min.js"])
        write("META-INF/licenses/apexcharts-LICENSE", apex["LICENSE"])
        renderer = "apex-renderer.js"
    elif library == "plotly":
        engine_version = PLOTLY_VERSION
        plotly = npm_package("plotly.js-basic-dist-min", PLOTLY_VERSION, PLOTLY_INTEGRITY,
                             "plotly-basic.min.js", "LICENSE")
        asset("plotly", f"plotly-basic-{PLOTLY_VERSION}.min.js", "script", plotly["plotly-basic.min.js"])
        write("META-INF/licenses/plotly-LICENSE", plotly["LICENSE"])
        renderer = "plotly-renderer.js"
    else:
        engine_version = build_recharts(output)
        renderer = "recharts-renderer.js"

    asset("chart-options", "chart-options.js", "script", (MODULE / "chart-options.js").read_bytes())
    renderer_source = (output / "web" if library == "recharts"
                       else MODULE / library / "src/main/resources/web") / renderer
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
            "customizationLayout": "isc",
            "seriesPalette": PALETTES[library],
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
    parser.add_argument("library", choices=("c3", "apexcharts", "plotly", "recharts"))
    parser.add_argument("output", type=Path)
    parser.add_argument("version")
    arguments = parser.parse_args()
    prepare(arguments.library, arguments.output, arguments.version)
