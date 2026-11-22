# OpenLAP visualization plugins

**C3.js (bundled)**, **ApexCharts (bundled)**, **Plotly.js (bundled)**, and
**Recharts (bundled)** offer the same nine chart types.
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

The four plugins share the same customization controls. **Elements** includes
titles and subtitles, alignment, legend position, axis visibility, and value
labels with optional backgrounds. **Styles** includes chart height, grid lines,
and colors for individual slices or series where available. Bar charts also let
you position their labels and use **Filters** to sort by value or show and hide
categories. Category filters and colors follow exact data labels across reordering.

## Build and try locally

From the OpenLAP root with JDK 21, Python 3, and Node.js 22 or later with npm, run:

```sh
./analyticsframework/mvnw -f visualization-methods/pom.xml clean verify
```

The build writes one JAR to each library's `target/` directory.

| Directory | JAR |
| --- | --- |
| `c3/target/` | `OpenLAP-C3-1.2.0.jar` |
| `apexcharts/target/` | `OpenLAP-ApexCharts-1.2.0.jar` |
| `plotly/target/` | `OpenLAP-Plotly-1.2.0.jar` |
| `recharts/target/` | `OpenLAP-Recharts-1.2.0.jar` |

Keep local copies in the repository's ignored `artifacts/visualizations/` folder.

In managed mode, upload each JAR in **Admin Dashboard → Visualization Libraries**,
review the nine chart types and runtime assets, and activate it. In local mode,
copy the JARs into `analyticsframework/jars/visualization_methods/` and restart
the backend. In the Indicator Editor, choose the new library in **Visualization**.
The bundled libraries have distinct names and chart IDs, so they can be installed
alongside historical plugins used by existing saved indicators.

Version 1.2.0 uses the ISC Creator's **Elements**, **Style**, and **Filters** layout.
It adds independent axis-title controls, legend text colors and data label colors.
Use **Upload new version** to add the updated JAR to an existing managed library.
Saved charts continue to resolve their original plugin versions.

## Chart implementations

The Java classes use the [OpenLAP Visualization Template](https://github.com/ude-soco/openlap-official-visualization-template)
for typed inputs and chart generation. `common/` validates and serializes the
mapped rows. Each library draws those rows with its own browser renderer.
`prepare-assets.py` generates the manifests and declares the exact resource
versions, asset hashes, descriptions, and controls.

C3 uses C3.js 0.7.18 and D3 5.16.0 from the repository's pinned runtime assets.
ApexCharts 4.7.0 and the Plotly.js 4.3.0 basic bundle are fetched from npm and
checked against pinned integrity hashes. Recharts builds from its locked npm
dependencies in `recharts/browser/`, bundling React with the renderer inside its
own iframe. The JARs include the runtime license notices.

To check the packaged contracts against the backend:

```sh
cd analyticsframework
./mvnw -Dtest=BundledVisualizationQualification,VisualizationManifestInspectionTest,VisualizationCustomizationTest test
```
