# OpenLAP visualization plugins

**C3.js (bundled)** and **ApexCharts (bundled)** offer the same nine chart types.
Each JAR includes its browser runtime, OpenLAP chart inputs, customization
controls, and dependency licenses. OpenLAP supplies the runtime for editor
previews, saved charts, and iframe embeds.

| Charts | Map these inputs |
| --- | --- |
| Bar, Line, Area | Category and numerical value |
| Pie, Donut | Category and non-negative value, with a positive total |
| Grouped Area, Stacked Area, Multi Line | Category, series, and a numerical value per category and series |
| Scatter Plot | Numerical X and Y, with optional point labels and series for coloring |

Grouped charts retain gaps where a series has no observation for a category.
Scatter plots keep separate observations when X values repeat.

## Build and try locally

From the OpenLAP root with JDK 21 and Python 3 installed, run:

```sh
./analyticsframework/mvnw -f visualization-methods/pom.xml clean verify
```

The build produces `c3/target/OpenLAP-C3-1.0.0.jar` and
`apexcharts/target/OpenLAP-ApexCharts-1.0.0.jar` inside this directory. To keep
local copies, use the repository's ignored `artifacts/visualizations/` folder.

In managed mode, upload each JAR in **Admin Dashboard → Visualization Libraries**,
review the nine chart types and runtime assets, and activate it. In local mode,
copy the JARs into `analyticsframework/jars/visualization_methods/` and restart
the backend. In the Indicator Editor, choose the new library in **Visualization**.
The bundled libraries have distinct names and chart IDs, so they can be installed
alongside historical plugins used by existing saved indicators.

## Chart implementations

The Java classes use the [OpenLAP Visualization Template](https://github.com/ude-soco/openlap-official-visualization-template)
for typed inputs and chart generation. `common/` validates and serializes the
mapped rows. Each library's renderer in `src/main/resources/web/` draws those
same rows with its own chart engine. `prepare-assets.py` generates the manifests
and declares the exact resource versions, asset hashes, descriptions, and controls.

C3 uses C3.js 0.7.18 and D3 5.16.0 from the repository's pinned runtime assets.
The first ApexCharts build fetches the exact 4.7.0 npm package, verifies its
integrity, and caches it locally. The packaged ApexCharts release is distributed
under its [MIT license](https://github.com/apexcharts/apexcharts.js/blob/v4.7.0/LICENSE).

To check the packaged contracts against the backend:

```sh
cd analyticsframework
./mvnw -Dtest=BundledVisualizationQualification,VisualizationManifestInspectionTest test
```
