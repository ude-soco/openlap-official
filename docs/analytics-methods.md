# Analytics methods package

Build `OpenLAP-Analytics-1.3.0.jar` locally from the source in `analytics-methods/`.
The JAR contains the eight methods below and their private numerical dependency.
OpenLAP provides the plugin API.

## Install locally

Use the backend and frontend from this feature branch together. The backend
changes preserve missing observations, prepare explicitly mapped numerical
inputs, and discover plugins outside the historical prototype package.

1. Build the JAR from the repository root with Java 17 or 21.

   ```bash
   ./analyticsframework/mvnw -f analytics-methods/pom.xml clean verify
   ```

2. Stop your local backend and copy the JAR into a fresh local plugin setup.

   ```bash
   mkdir -p analyticsframework/jars/analytics_techniques
   cp analytics-methods/target/OpenLAP-Analytics-1.3.0.jar \
     analyticsframework/jars/analytics_techniques/
   ```

   If your backend uses `DATA_DIR`, use its `jars/analytics_techniques/` directory
   in place of the default path. An existing local catalog binds each method to
   its registered JAR. Use a separate test catalog and plugin directory to try
   version 1.3.0 if an earlier JAR is already installed. Keep version 1.1.0 at
   its registered path when saved indicators use Pearson or Spearman correlation.

3. Restart the backend with your usual local database settings. Local startup
   discovers the methods in the package. The editor offers eight methods from
   this package for selection. You still need a visualization plugin, learning
   records and a USER account linked to your LRS.
4. Open Indicator Editor and select a method below. The
   analysis preview runs automatically after the required selections are ready.

Installing it does not require replacing `AnalyticsMethods-Prototypes` or editing
database records. Do not copy it into a running production container. Environments
using S3 storage should use **Admin Dashboard > Analytics Methods > Add analytics
methods** for a fresh installation. For an existing managed installation, use
[Upload new version](plugin-administration.md#upload-a-replacement) and leave
legacy correlation entries bound to their original artifact.

## Methods and examples

The JAR's optional `META-INF/openlap/analytics.json` manifest supplies workflow
recommendations, input roles, and output hints. JARs without a manifest use their
Java input, output, and parameter contracts with the editor's generic controls.
The [analytics method template](https://github.com/ude-soco/openlap-official-analytics-method-template)
shows how to package the manifest with your own method.

| Method | Recommended for | Required inputs | Useful first test |
| --- | --- | --- | --- |
| Calculate completion or success rate | Basic | Completion or Success, optional text group | Compare the share of known outcomes marked true for each activity. |
| Count distinct values | Basic | Text value, optional text group | Count distinct activity identifiers for each recorded action. |
| Count events by category | Basic | Text category | Count events for each activity, action or platform. Use the rank and limit settings for a top-N list. |
| Count events over time | Basic | Event or stored timestamp | Count events by day, week, month or year. Periods use UTC and weeks start on Monday. |
| Count selected events | Basic | The editor selects the event field automatically | Count the views or clicks matching your filters. |
| Group observations using reproducible K-means++ | Multilevel | Two numeric features and an optional observation label | Combine summaries by activity, use the activity key as the label, then choose a cluster count. |
| Summarize numeric values | Basic and Multilevel | Numeric measurement | Summarize raw scores in Basic or one numeric measure across matched activities in Multilevel. |
| Summarize numeric values by group | Basic | Numeric measurement and text group | Choose **Raw score** and **Activity identifier** to calculate the mean, median and spread for each quiz. |

Basic indicators use filtered xAPI statements. Multilevel analysis works with
the matching key and numeric measures combined from Basic indicators.
Composite indicators combine and visualize Basic results directly.

In Basic Indicator, the method picker checks which fields are usable in the
matching statements and explains the recommendation. For example, a numeric
summary is recommended when a score field such as **Raw score**
(`result.score.raw`) has recorded numeric values. A grouped summary also needs a
group field, such as **Activity identifier**, on the same statements. The check
uses up to 2,000 matching statements and reports when it checked only part of
the selection. The method preview uses the inputs you choose.

For the local test data, choose **Stored timestamp** when trying the time method.
That field records when the LRS received the event. Use **Event timestamp** for
sources that record when the activity actually occurred.

Basic Indicator keeps learner names, account identifiers, email identifiers and
other xAPI actor fields out of analysis inputs. The **User scope** filter still
controls whose events are included in the calculation. For an older indicator
that used an identity field, open **My Indicators → More actions → Edit** and
choose a replacement such as **Activity identifier** in **Method inputs**.

The event total counts matching records. Category counts exclude missing labels
and report each category's share of all events with a category, even when only
the top or bottom categories are shown. Distinct counts use exact text values.
The time series includes observed periods. Success and completion percentages use
recorded true or false outcomes as their denominator, with missing outcomes
counted separately.

Numeric summaries return count, excluded count, sum, mean, median, minimum,
maximum, range, sample variance, sample standard deviation, quartiles and
interquartile range. Quartiles use R-7 interpolation. Sample variance and standard
deviation are undefined for one observation and appear as `—`. Groups with only
missing measurements retain their counts and empty statistics.

K-means++ supports two features and up to 10,000 complete observations. Choose
2–20 clusters, no more than the number of distinct feature pairs. Defaults are
three clusters, seed 42, 300 maximum iterations, and standardized features. The
same inputs in the same order and the same parameters reproduce the assignments.
Output retains the original complete observations and labels; feature values
remain in their original units. These are exploratory groups, not learner
ability ratings. The older K-means methods remain available for compatibility.

## Choose the observation unit deliberately

In a Basic indicator, each extracted row is an xAPI event. Learners with more
assessment attempts contribute more rows to a mean score. Use **Summarize
numeric values by group** with **Activity identifier** to get one summary row
per quiz or other activity.

For a clustering workflow across activities:

1. Save two Basic indicators grouped by the activity identifier. For example,
   calculate the mean score in one indicator and the completion rate in the other.
2. Create a Multilevel analysis indicator and combine those results using that
   key. Review which activities appear in both sources.
3. Map the intended numeric output from each source into the analysis method.

Choose a group key that uniquely identifies the intended activity in the selected
data. Use **Activity identifier** when different activities can share a title.

For clicks or views, use **Count events by category** or one of the other event
count methods directly in Basic Indicator. Combine two Basic indicators by a
shared activity key to compare their counts with a Multilevel method.

Clustering skips rows that lack either selected measurement. Invalid nonnumeric
or infinite measurements produce a validation error. Grouped
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

The build command above runs numerical tests for known answers, missing data,
decimal inputs, deterministic clustering and observation correspondence. The
fixed timestamp makes clean builds reproducible with the same compiler. CI uses
JDK 21.0.11.

The backend qualification also inspects and executes the *packaged* JAR through
the real plugin loader and checks stored-indicator round trips:

```bash
cd analyticsframework
./mvnw -Dtest=AnalyticsReleaseQualification test
```

The qualification uses the generated JAR in `../analytics-methods/target/`.
To also test an existing 1.1.0 JAR with the retired correlation methods, pass
its absolute path as `-Dopenlap.analytics.legacy.jar=/path/to/OpenLAP-Analytics-1.1.0.jar`.
CI compares two clean builds byte for byte and runs the backend qualification.

The plugin source contract details are documented in
[`analytics-methods/README.md`](../analytics-methods/README.md). A future algorithm
should declare its own inputs, outputs and parameters using the same template,
include analytical reference tests, and receive a new package version before
installation. This release does not add inferential tests, regression or a
prediction model lifecycle.
