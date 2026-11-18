# Analytics methods package

The repository includes `artifacts/analytics/OpenLAP-Analytics-1.0.0.jar`, its
SHA-256 checksum, and reproducible source in `analytics-methods/`. The JAR contains
the calculations and its private numerical dependency. OpenLAP provides the
plugin API; the JAR does not bundle another copy of that API.

## Install locally

Use the backend and frontend from this feature branch together. The backend
changes preserve missing observations, prepare explicitly mapped numerical
inputs, and discover plugins outside the historical prototype package.

1. Stop your local backend.
2. From the repository root, verify the downloaded JAR and copy it:

   ```bash
   (cd artifacts/analytics && shasum -a 256 -c SHA256SUMS)
   cp artifacts/analytics/OpenLAP-Analytics-1.0.0.jar \
     analyticsframework/jars/analytics_techniques/
   ```

3. Restart the backend with your usual local database settings. In local storage
   mode, startup discovers the five new methods. Existing methods and saved
   indicators remain available. You still need a visualization plugin, learning
   records and a USER account linked to your LRS.
4. Open Indicator Editor and select one of the new method names below. The
   analysis preview runs automatically after the required selections are ready.

The delivered JAR stays outside the active plugin directory until you copy it.
Installing it does not require replacing `AnalyticsMethods-Prototypes` or editing
database records. Do not copy it into a running production container. Environments
using S3 storage should use **Admin Dashboard > Analytics Methods > Add analytics
methods**, then review and activate the uploaded package through the normal
[plugin administration workflow](plugin-administration.md).

## Methods and examples

| Method | Required inputs | Useful first test |
| --- | --- | --- |
| Summarize numeric values | Numeric measurement | Choose **Raw score** to summarize assessment events. |
| Summarize numeric values by group | Numeric measurement and text group | Choose **Raw score** and **Users (account name)** to calculate each learner's mean, median and spread. |
| Pearson correlation | Two numeric measurements | Compare two aligned, prepared learner measurements through a Multilevel indicator. |
| Spearman rank correlation | Two numeric measurements | Compare the rankings of two aligned learner measurements; tied values receive average ranks. |
| Group observations using reproducible K-means++ | Two numeric features; optional observation label | Combine learner-level summaries in a Multilevel indicator, map its learner key as the label, then choose a cluster count. |

Summary output includes count, excluded count, mean, median, minimum, maximum,
sample standard deviation, quartiles and interquartile range. Quartiles use R-7
interpolation. Standard deviation is undefined for one observation and appears
as an empty cell (`—`), rather than a fabricated zero. In a grouped summary,
groups with only missing measurements retain their count and empty statistics.

Correlation requires at least three complete pairs and variation in both inputs.
It reports a coefficient from -1 to 1, analysed pairs and excluded pairs. It does
not provide a significance test or establish causation.

K-means++ supports two features and up to 10,000 complete observations. Choose
2–20 clusters, no more than the number of distinct feature pairs. Defaults are
three clusters, seed 42, 300 maximum iterations, and standardized features. The
same inputs in the same order and the same parameters reproduce the assignments.
Output retains the original complete observations and labels; feature values
remain in their original units. These are exploratory groups, not learner
ability ratings. The older K-means methods remain available for compatibility.

## Choose the observation unit deliberately

In a Basic indicator, each extracted row is an xAPI event. A mean of assessment
events is not automatically a mean across learners: learners with more attempts
contribute more rows. Use **Summarize numeric values by group** when you need
one row per learner, activity or other chosen group.

For a learner-level correlation or clustering workflow:

1. Save Basic indicators whose outputs each contain one row per learner and a
   learner key, such as a mean score and an activity count.
2. Create a Multilevel analysis indicator and combine those results using that
   key. Review how many learners remain in the shared-key intersection.
3. Map the intended numeric output from each source into the further method.

The choice of the observation unit is part of the research question. OpenLAP
does not infer that two fields from unrelated rows describe the same learner.
Choose a group key that uniquely identifies the intended observation in the
selected data. Account names alone may overlap between LRSs or account providers;
restrict the selection to one source when necessary, or use a consistent unique
identifier. Grouping equal text labels does not establish that they identify the
same person.

If your statements contain clicks or views but no scores, first create activity
counts using an existing method. You can combine counts by a shared activity key
and apply the new correlation or clustering methods without inventing scores.
Selecting **Raw score** cannot produce numerical measurements that the LRS never
recorded.

Missing measurements are excluded together for correlation and clustering;
invalid nonnumeric or infinite measurements produce a validation error. Grouped
summaries report missing numerical values per group. `ungrouped_count` reports
rows with no group across the whole dataset. K-means whole-dataset counts are
also repeated on its output rows. Read those global counts once; do not sum them.
The editor displays these counts separately from the measurement table.
Historical prototype plugins receive complete mapped observations with missing
rows omitted together, preserving compatibility with their nonnull input
assumptions. The new methods receive aligned missing values and report their
exclusions explicitly.

For visualization, choose the statistic you want to plot, such as **Mean**
against **Group**. Diagnostic counts are still available for explicit mapping,
but the editor prioritizes measurement columns when suggesting chart inputs.

## Build and qualify the JAR

With the supported JDK installed, run from the repository root:

```bash
./analyticsframework/mvnw -f analytics-methods/pom.xml clean verify
```

This builds `analytics-methods/target/OpenLAP-Analytics-1.0.0.jar`. The fixed build
timestamp makes builds reproducible with the same compiler (the delivery uses
JDK 21.0.11). The package tests check known
statistical answers, missing data, tied ranks, decimal inputs, deterministic
clustering and observation correspondence.

The backend qualification also inspects and executes the *packaged* JAR through
the real plugin loader and checks stored-indicator round trips:

```bash
cd analyticsframework
./mvnw -Dtest=AnalyticsReleaseQualification test
```

That explicit test expects the repository delivery at `../artifacts/analytics/`.
The analytics package CI job rebuilds the JAR, compares it byte-for-byte with the
delivery, verifies its checksum and runs this qualification. The usual backend
and frontend checks cover the integration changes.

The plugin source contract details are documented in
[`analytics-methods/README.md`](../analytics-methods/README.md). A future algorithm
should declare its own inputs, outputs and parameters using the same template,
include analytical reference tests, and receive a new package version before
installation. This release does not add inferential tests, regression or a
prediction model lifecycle.
