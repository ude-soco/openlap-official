import test from "node:test";
import assert from "node:assert/strict";
import { analysisColumnHelp, analysisObservationCounts, analysisObservationMessage, defaultSourceMeasures,
  preferredAnalysisColumns, sourceMeasureHelp } from "./analytics-results.js";

const column = (id, data, type = "Numeric") => ({ configurationData: { id, type }, data });
const counts = (included, excluded) => ({ count: column("count", included), excluded_count: column("excluded_count", excluded) });

test("result column definitions stay readable without interpreting plugin text as HTML", () => {
  const help = analysisColumnHelp({ description: 'Sample SD: undefined for n < 2. <img src="x" onerror="alert(1)">' }, "Numerical values");
  assert.ok(help.includes("n &lt; 2"));
  assert.ok(help.includes("&lt;img"));
  assert.equal(help.includes("<img"), false);
  assert.ok(help.endsWith("<br/><br/>Numerical values"));
});

test("statistical result summaries distinguish observations from the number of output rows", () => {
  const dataset = { columns: { ...counts([40], [3]), mean: column("mean", [7.5]) } };
  assert.deepEqual(analysisObservationCounts(dataset), { included: 40, excluded: 3, ungrouped: 0 });
  assert.match(analysisObservationMessage(dataset), /40 observations analysed.*3 incomplete observations excluded/);
  assert.equal(analysisObservationCounts({ count: column("count", [40]) }), null, "legacy count results are not a statistical exclusion report");
});

test("grouped summaries total per-group counts but read the global ungrouped count once", () => {
  const dataset = { ...counts([4, 6], [1, 2]), ungrouped_count: column("ungrouped_count", [3, 3]) };
  assert.deepEqual(analysisObservationCounts(dataset), { included: 10, excluded: 3, ungrouped: 3, groups: 2 });
  assert.match(analysisObservationMessage(dataset), /10 observations analysed across 2 groups/);
  assert.match(analysisObservationMessage(dataset), /3 additional observations excluded because their group is missing/);
});

test("cluster result rows never multiply their repeated global counters", () => {
  const dataset = { ...counts([3, 3, 3], [2, 2, 2]),
    observation: column("observation", ["a", "b", "c"], "Text"),
    cluster: column("cluster", ["1", "1", "2"], "Text") };
  assert.deepEqual(analysisObservationCounts(dataset), { included: 3, excluded: 2, ungrouped: 0 });
  dataset.count.data[1] = 4;
  assert.equal(analysisObservationCounts(dataset), null, "contradictory global counters are not presented as a reliable summary");
});

test("invalid or unknown counters are not presented as analysed sample sizes", () => {
  for (const value of [counts([Number.NaN], [0]), counts([-1], [0]), counts([2], [1.5]), counts([3, 4], [0, 0])]) {
    assert.equal(analysisObservationCounts(value), null);
  }
});

test("statistical chart suggestions start with measures and preserve all diagnostic choices", () => {
  const columns = Object.values({ ...counts([10], [0]), median: column("median", [5]), mean: column("mean", [4]) });
  const reordered = preferredAnalysisColumns(columns, { type: "Numeric" });
  assert.deepEqual(reordered.map((field) => field.configurationData.id), ["mean", "median", "count", "excluded_count"]);
  assert.equal(reordered.length, columns.length);
  assert.equal(columns[0].configurationData.id, "count", "the original dataset order is unchanged");
  const legacy = [column("item_count", [10])];
  assert.equal(preferredAnalysisColumns(legacy), legacy, "legacy methods retain their defaults");
});

test("numeric scatter chart axes can prefer their corresponding cluster measurements", () => {
  const columns = [...Object.values(counts([3], [0])), column("x", [1]), column("y", [2])];
  assert.equal(preferredAnalysisColumns(columns, { id: "x_axis", title: "X-Axis" })[0].configurationData.id, "x");
  assert.equal(preferredAnalysisColumns(columns, { id: "y_axis", title: "Y-Axis" })[0].configurationData.id, "y");
});

test("statistical source defaults exclude diagnostics and undefined secondary statistics", () => {
  const result = { ...counts([1], [0]), mean: column("mean", [7]),
    standard_deviation: column("standard_deviation", [null]), median: column("median", [7]) };
  const outputs = Object.values(result).map((field) => field.configurationData);
  assert.deepEqual(defaultSourceMeasures(outputs), ["mean"]);
  assert.deepEqual(defaultSourceMeasures(outputs, result), ["mean"], "A one-observation group's undefined sampleSD does not invalidate mean defaults");
  result.mean.data = [null];
  assert.deepEqual(defaultSourceMeasures(outputs, result), [], "An undefined primary mean never silently changes the question to a count or median");
  assert.match(sourceMeasureHelp({ outputs, measureColumnIds: [] }), /Choose a complete numerical measure/);
});

test("correlation and clustering source defaults keep their primary measurements only", () => {
  const diagnostics = Object.values(counts([3], [0])).map((field) => field.configurationData);
  assert.deepEqual(defaultSourceMeasures([...diagnostics, { id: "correlation", type: "Numeric" }]), ["correlation"]);
  assert.deepEqual(defaultSourceMeasures([...diagnostics, { id: "observation", type: "Text" },
    { id: "cluster", type: "Text" }, { id: "x", type: "Numeric" }, { id: "y", type: "Numeric" }]), ["x", "y"]);
  assert.deepEqual(defaultSourceMeasures([{ id: "item_count", type: "Numeric" }, { id: "amount", type: "Numeric" }]),
    ["item_count", "amount"], "Existing plugins retain their historical defaults");
});

test("clustering chart grouping prefers cluster labels while categorical axes prefer observations", () => {
  const columns = [...Object.values(counts([3], [0])), column("observation", ["learner-1"], "Text"),
    column("cluster", ["Cluster 1"], "Text"), column("x", [1]), column("y", [2])];
  for (const title of ["Group", "Series", "Cluster", "Color", "Colour"]) {
    const selected = preferredAnalysisColumns(columns, { id: "categorical", title, type: "Text" })
      .find((field) => field.configurationData.type === "Text");
    assert.equal(selected.configurationData.id, "cluster");
  }
  const selected = preferredAnalysisColumns(columns, { id: "x_axis", title: "X-Axis", type: "Text" })
    .find((field) => field.configurationData.type === "Text");
  assert.equal(selected.configurationData.id, "observation");
});
