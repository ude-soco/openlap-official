# Composite and multilevel indicators

Complex indicators reuse the **analyzed results of saved Basic indicators**.
They do not combine screenshots or copy a previously rendered chart.

| Type | Workflow | Combination rule |
| --- | --- | --- |
| Composite | Select indicators → Combine data → Visualization → Save | Include every key appearing in any source. Fill an absent numeric measure with zero and identify that fill in the preview. |
| Multilevel analysis | Select indicators → Combine data → Analysis → Visualization → Save | Include only keys present in every source, then apply another installed analytics method. |

Composite sources must use the **same installed analytics method**. Different
parameters or filters are allowed: for example, the same counting method can
count all accesses in one Basic indicator and distinct students in another.
Matching method names alone are insufficient; the saved method ID identifies the
installed implementation. Multilevel sources may use different methods when
their selected matching columns and measures are compatible.

## Create and review

1. Save at least two Basic indicators in your account. Select the complex type
   from **Indicators → Indicator Editor**.
2. Select sources. Review their methods, output columns and filter summaries.
   The first Composite source establishes its required analytics method.
3. Choose the matching column for each source, the numeric measures to retain,
   and readable source labels. Preview the combined table before continuing.
   Duplicate or missing keys must be resolved in the sources rather than silently
   overwriting a row. A Composite's filled zero is distinguishable from a measured
   zero; a Multilevel result shows excluded rows.
4. For Multilevel, map the next method's inputs to the **combined numeric columns**
   and review its declared parameters. K-means is available only when an installed
   plugin provides it; the editor does not install or invent analytics algorithms.
5. Map the resulting columns to a compatible chart, preview it and save. Reopen
   the saved indicator from **My Indicators** to preview or edit its configuration.

For Composite charts, **Combined series** provides matching-key, source-label and
measure columns in a long table suitable for grouped line/area charts. The normal
combined table retains separate numeric columns for reviewing values or mapping
an individual measure. The reviewed C3 plugin supplies a multiline chart; it does
not supply a grouped bar chart. Available choices follow the installed library.

The initial workflow accepts the user's saved Basic indicators, with up to ten
distinct sources. Nested complex sources are not supported. Recovery labelled
**saved in this tab** is browser recovery, not a cross-device database draft.

Source definitions remain live dependencies. Updating a source can change a
complex indicator's next result; changed schemas need reviewed mappings. A source
in use cannot be deleted until the dependent indicators are removed or updated.
Errors identify the affected source and allow retry rather than presenting an
empty table as a successful calculation.

An interrupted dependency write can deliberately keep deletion blocked. A
maintainer must establish the write's outcome before repairing its reservation;
elapsed time alone is not grounds for clearing it.

## Deploying the workflows

Source-deletion and dependency guarantees require **every backend writer** to run
this implementation. An older replica can bypass the reference guards. Coordinate
a backend write pause, upgrade all backend replicas, verify their readiness, then
make the complex editor available in the frontend and resume writes. Do not treat
a mixed-version rolling deployment as providing these guarantees. A rollback to
older writers requires another coordinated pause and dependency review.

The feature MR supplies application code; it does not perform an environment
deployment or authorize a maintenance window.

## Local synthetic examples

The optional setup helper creates a **new local demo account**, synthetic Learning
Locker records and saved indicators through the actual APIs. It is intended for
a separate local installation, using the [normal startup procedure](../README.md#local-installation)
with explicit demo database names and ports. It never writes to an existing
OpenLAP primary database directly.

Prepare a new private directory outside the checkout for credentials and source
artifacts. Do not commit its contents:

```bash
DEMO_DIR="$HOME/.local/share/openlap-complex-demo"
mkdir -p "$DEMO_DIR"
chmod 700 "$DEMO_DIR"
python3 -B analyticsframework/scripts/prepare-plugin-recovery.py \
  --output "$DEMO_DIR/reviewed-plugins"
```

The recovery tool verifies the two historical analytics/C3 JAR identities from
local Git history; it neither downloads nor executes plugins. Review
[artifact preparation](plugin-artifact-migration.md#recover-reviewed-historical-source-artifacts)
before installing those trusted binaries. Prepare private demo plugin directories:

```bash
mkdir -p "$DEMO_DIR/runtime/jars/analytics_techniques" \
  "$DEMO_DIR/runtime/jars/visualization_methods"
cp "$DEMO_DIR/reviewed-plugins/jars/analytics/AnalyticsMethods-Prototypes-1.0-SNAPSHOT.jar" \
  "$DEMO_DIR/runtime/jars/analytics_techniques/"
cp "$DEMO_DIR/reviewed-plugins/jars/visualizations/Visualizer-C3-1.0-SNAPSHOT.jar" \
  "$DEMO_DIR/runtime/jars/visualization_methods/"
```

The analytics JAR includes
the counting and two-numeric-attribute K-means methods used by these examples.

For a **fresh** dedicated MongoDB container, choose unused names and ports:

```bash
docker volume create openlap-complex-demo-data
docker run -d --name openlap-complex-indicators-demo-mongo \
  --label org.openlap.demo=complex-indicators-v1 \
  -p 127.0.0.1:27119:27017 \
  -v openlap-complex-demo-data:/data/db mongo:7
```

Start this branch's backend using `openlap_complex_demo` as the primary database,
`learninglocker_complex_demo` as the secondary database, and loopback port 8092.
Both MongoDB URIs should point to `mongodb://127.0.0.1:27119`. Start this branch's
frontend on port 5174 with `VITE_BACKEND_URL=http://127.0.0.1:8092/api/`, and set the
backend's `WEBAPP_URL` to `http://localhost:5174`.

From the checkout root, with the intended JDK selected:

```bash
cd analyticsframework
ALLOW_INSECURE_DEFAULTS=true \
PLUGIN_STORAGE_MODE=local \
DATA_DIR="$DEMO_DIR/runtime" \
PORT=8092 \
MONGODB_PRIMARY_URI=mongodb://127.0.0.1:27119 \
OPENLAP_MONGODB_DB=openlap_complex_demo \
MONGODB_SECONDARY_URI=mongodb://127.0.0.1:27119 \
LRS_MONGODB_DB=learninglocker_complex_demo \
WEBAPP_URL=http://localhost:5174 \
./mvnw spring-boot:run
```

In another terminal, from the checkout root:

```bash
cd indicatorframework
npm ci
VITE_BACKEND_URL=http://127.0.0.1:8092/api/ npm run dev -- --port 5174 --strictPort
```

With those dedicated services running, execute from the repository root:

```bash
DEMO_DIR="$HOME/.local/share/openlap-complex-demo"
python3 -B analyticsframework/scripts/setup-complex-indicator-demo.py \
  --api-url http://127.0.0.1:8092/api \
  --mongo-container openlap-complex-indicators-demo-mongo \
  --secondary-db learninglocker_complex_demo \
  --receipt "$DEMO_DIR/demo-account.json"
```

The helper accepts explicit loopback API addresses only and requires the MongoDB
container's demo label. It refuses to seed an unrelated database or records. The
label is an ownership convention, not proof of the backend's connection settings:
check the backend database names above before running it. The setup generates a
password and stores it with the account email and saved indicator IDs in the
owner-only receipt. It prints the receipt path, not the password or access token.
Read the receipt locally to obtain the test credentials.

Four Basic sources and two complex examples are created:

| Saved example | Expected result |
| --- | --- |
| Material accesses | Five materials; all access occurrences counted |
| Students per material | Seven materials; distinct synthetic students counted using the same method |
| Accesses for clustering | Six materials, including Material 4 |
| Material annotations | Seven materials, including unmatched Item 6 |
| Accesses and students — all materials | Eight union rows and two labelled series |
| Access and annotation clusters | Six shared rows, followed by three K-means clusters and a scatter chart |

The fixture contains 3,352 synthetic xAPI statements. The setup checks real
analysis counts, union/intersection values, clustering output, saved configuration
and generated visualization code. It also checks JavaScript syntax and captures
the C3 configuration in a bounded JavaScript context to verify quotes, backslashes,
line separators and closing-script text survive as labels. This does not replace
browser rendering checks.
The scatter check also inspects the generated coordinates: all six analyzed
points must remain plotted across three groups with distinct palette colors.
If several installed K-means methods share a display name, it checks their
declared inputs, outputs and parameters, selects the first compatible ID in
sorted order, and records that choice in the private receipt.
It can resume using its existing private receipt; it does not reset credentials
or overwrite an indicator that has lost its demo marker through later editing.

Stop the dedicated MongoDB with `docker stop openlap-complex-indicators-demo-mongo`
and restart it with `docker start openlap-complex-indicators-demo-mongo`. Keep its
volume and private receipt while you want to review the saved examples.

## Verification

The source fixture and local-only setup boundaries have a dependency-free check:

```bash
python3 -B tests/test_complex_indicator_demo.py
```

Run the backend tests and the frontend unit/build/browser checks for changes to
the workflows. Include create, saved preview, direct edit, refresh and update,
source dependencies, missing plugins, stale requests, keyboard use and mobile
layouts. Preserve the existing Basic indicator regression checks.
