# OpenLAP analytics methods

This standalone Java 17 plugin project implements five methods using the released
OpenLAP analytics-method template (1.2.0) and data-exchange formats (1.2.2).
Its JAR contains the methods and a relocated copy of Apache Commons Math 3.6.1.
OpenLAP's API classes stay outside the JAR so the application supplies one shared contract.

From the repository root, with Java 17 or 21 and Maven 3.6.3 or newer:

```sh
./analyticsframework/mvnw -f analytics-methods/pom.xml clean verify
```

The result is `analytics-methods/target/OpenLAP-Analytics-1.0.0.jar`.
The fixed `project.build.outputTimestamp` makes rebuilding unchanged sources reproducible.
Keep a manually installed copy outside this module's `target` directory.

## Method contracts

| Method | Required inputs | Output rows |
| --- | --- | --- |
| Summarize numeric values | `values` (Numeric) | One summary over actual numeric measurements |
| Summarize numeric values by group | `values` (Numeric), `group` (Text) | One summary per exact group key, in first-observed order |
| Pearson correlation | `x`, `y` (Numeric) | One coefficient for linear association |
| Spearman rank correlation | `x`, `y` (Numeric) | One coefficient for monotonic association, with average tied ranks |
| Group observations using reproducible K-means++ | `x`, `y` (Numeric), optional `observation` (Text) | One assignment per complete input row, in original input order |

Select the unit of observation before analysing. For a learner-level relationship,
prepare one row per learner and align both measurements by that learner's key.
Event-level rows describe events; their number is not the number of independent learners.
Multilevel indicators can join prepared Basic outputs by a unique learner or activity key.

### Numerical summaries

Summary outputs are `group` (Text) and Numeric `count`, `excluded_count`, `mean`,
`median`, `minimum`, `maximum`, `standard_deviation`, `q1`, `q3`, `iqr`.
The standard deviation uses the sample denominator `n - 1` and is `null` for one value.
Quartiles use R-7 linear interpolation: position `1 + (n - 1)p`.
The IQR is Q3 minus Q1. A group containing only missing measurements has count zero
and `null` summary statistics. An entirely unusable selection is rejected.

For grouped summaries, `count` and `excluded_count` apply to each group.
`ungrouped_count` reports rows lacking a group identifier across the whole dataset;
it repeats on each group row and must be read once, not summed.
Group keys are preserved exactly. Empty or whitespace-only group keys are missing.

### Correlation

Both columns must be aligned and equal in length. A missing value in either column
excludes the complete pair. At least three complete pairs and variation in both
measurements are required. Outputs are `comparison` (Text), `correlation`, `count`
and `excluded_count` (Numeric). The three-pair minimum is a preview policy, not a
claim that three pairs provide reliable inference. No p-values or causal conclusions
are produced. Pearson measures linear association; Spearman measures rank association.

### Reproducible K-means++

Parameters are `clusters` (2-20, default 3), `seed` (0-2147483647, default 42),
`max_iterations` (1-1000, default 300), and `scaling` (`Standardize` or `None`, default
`Standardize`). Standardization uses population standard deviation and maps a constant
feature to zero. Without scaling, distances depend on the original feature units.
At least as many distinct complete feature pairs as clusters are required.

The method supports at most 10,000 complete observations. Input exclusions never
shift the remaining feature rows or their labels. Duplicate coordinates remain separate
observations. Cluster labels are ordered lexicographically by their centres in the
analysis feature space. Results are reproducible for identical data, row order, seed
and parameters; cluster numbers do not have an inherent attainment meaning.

Outputs are `observation`, `cluster` (Text), `x`, `y`, `count`, `excluded_count` (Numeric).
Features retain their original units. The two counts describe the whole dataset and
repeat on every output row: read them once and never sum them.
Labels default to original input row numbers when no observation label is supplied.
The iteration limit may stop calculation before convergence, so the result is exploratory.

## Validation and limitations

All methods reject malformed, nonfinite or incorrectly typed numeric values instead of
silently treating them as missing. Only `null` represents a missing numeric observation.
Summary and correlation previews are limited to 100,000 input rows. No input list is
modified. Numerical overflow causes an explicit validation failure, never NaN/Infinity
in the returned dataset. These methods do not infer data quality, representative sampling,
causation, statistical significance or learner ability.

Tests use known-answer numeric fixtures, hand-calculated correlation, tied ranks,
missing paired values, decimal features, duplicate points, shuffled cluster membership,
invalid parameters and output-contract checks. The package does not change or remove
existing legacy analytics methods.

Apache Commons Math documentation:
- https://commons.apache.org/proper/commons-math/userguide/stat.html
- https://commons.apache.org/proper/commons-math/userguide/ml.html
