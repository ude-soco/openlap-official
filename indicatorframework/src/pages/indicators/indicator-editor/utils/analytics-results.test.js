import test from "node:test";
import assert from "node:assert/strict";
import { analysisColumnHelp, analysisResultPresentation, defaultSourceMeasures, formatAnalysisValue,
  preferredAnalysisColumns, sourceMeasureHelp } from "./analytics-results.js";

const column = (id, data, type = "Numeric") => ({ configurationData: { id, type }, data });
const mapped = (input, source, title = "Old label") =>
  ({ inputPort: { id: input }, outputPort: { id: source, title } });

test("result column definitions stay readable without interpreting plugin text as HTML", () => {
  const help = analysisColumnHelp({ description: 'Sample SD: undefined for n < 2. <img src="x" onerror="alert(1)">' }, "Numerical values");
  assert.ok(help.includes("n &lt; 2"));
  assert.ok(help.includes("&lt;img"));
  assert.equal(help.includes("<img"), false);
  assert.ok(help.endsWith("<br/><br/>Numerical values"));
});

test("diagnostic hints sum per-group counts and show the global omitted-group count once", () => {
  const dataset = { columns: {
    used: column("used", [4, 6]),
    blank: column("blank", [1, 2]),
    no_section: column("no_section", [3, 3]),
  } };
  const hints = {
    used: { diagnostic: { kind: "INCLUDED", aggregation: "SUM" } },
    blank: { diagnostic: { kind: "EXCLUDED", aggregation: "SUM", input: "score", summaryOnly: true } },
    no_section: { diagnostic: { kind: "UNGROUPED", aggregation: "ONCE" } },
  };
  const presented = analysisResultPresentation(dataset, hints,
    { mapping: [mapped("score", "test_score", "Raw score")] });
  assert.deepEqual(presented.hiddenColumns, ["blank"]);
  assert.equal(presented.message,
    "10 observations analysed across 2 groups. 3 observations were skipped because Raw score was missing or unusable. 3 observations skipped because their group was missing.");
  assert.equal(analysisResultPresentation(dataset).message, "", "Legacy columns remain uninterpreted");
});

test("invalid diagnostic counts remain visible instead of producing misleading notes", () => {
  const hints = { skipped: { diagnostic: { kind: "EXCLUDED", aggregation: "ONCE", summaryOnly: true } } };
  for (const values of [[1, 2], [Number.NaN], [-1], [1.5], []]) {
    const result = analysisResultPresentation({ skipped: column("skipped", values) }, hints);
    assert.deepEqual(result.hiddenColumns, []);
    assert.equal(result.message, "");
  }
  const result = analysisResultPresentation({ skipped: column("skipped", [0, 0]) }, hints);
  assert.deepEqual(result.hiddenColumns, ["skipped"]);
  assert.equal(result.message, "");
});

test("declared scatter roles and current input labels describe outputs with arbitrary IDs", () => {
  const dataset = { columns: {
    name: column("name", ["A", "B"], "Text"),
    cohort: column("cohort", ["First", "Second"], "Text"),
    interest: column("interest", [2, 4]),
    volume: column("volume", [1, 8]),
  } };
  const hints = {
    interest: { role: "Y", labelFromInput: "first_measure" },
    volume: { role: "X", labelFromInput: "second_measure" },
    name: { role: "LABEL" },
    cohort: { role: "CLUSTER" },
  };
  const combined = { columns: {
    annotations: { configurationData: { title: "Material annotations" } },
    clicks: { configurationData: { title: "Material clicks" } },
  } };
  const result = analysisResultPresentation(dataset, hints,
    { mapping: [mapped("first_measure", "annotations"), mapped("second_measure", "clicks")] }, combined);
  assert.deepEqual(result.columnTitles, { interest: "Material annotations", volume: "Material clicks" });
  assert.deepEqual(result.columnOrder, ["name", "volume", "interest", "cohort"]);
  assert.equal(result.groupedScatter, true);
  assert.equal(analysisResultPresentation(dataset).groupedScatter, false);
});

test("only columns with the percentage format display percent symbols", () => {
  const percent = new Intl.NumberFormat(undefined, { style: "percent", maximumFractionDigits: 2 });
  assert.equal(formatAnalysisValue(100 / 3, { format: "PERCENTAGE" }), percent.format(1 / 3));
  assert.equal(formatAnalysisValue(20), "20");
  assert.equal(formatAnalysisValue(null, { format: "PERCENTAGE" }), "—");
});

test("chart suggestions prioritize hinted axes and grouping without relying on output IDs", () => {
  const columns = [column("wide", [4]), column("tight", [5]), column("used", [1]),
    column("resource", ["Item"], "Text"), column("bucket", ["Cluster 1"], "Text")];
  const hints = {
    wide: { primary: true, role: "X" },
    tight: { primary: true, role: "Y" },
    resource: { role: "LABEL" },
    bucket: { role: "CLUSTER" },
    used: { diagnostic: { kind: "INCLUDED" } },
  };
  const first = (input, role) => preferredAnalysisColumns(columns, input, hints, role)
    .find((entry) => entry.configurationData.type === input.type)?.configurationData.id;
  assert.equal(first({ id: "xAxisStrings", type: "Numeric" }), "wide");
  assert.equal(first({ id: "yAxisValues", type: "Numeric" }), "tight");
  assert.equal(first({ id: "unknown", type: "Text" }, { series: "unknown" }), "bucket");
  assert.equal(first({ id: "xAxisStrings", type: "Text" }), "resource");
  assert.equal(preferredAnalysisColumns(columns), columns, "Metadata-free methods retain generic order");
  assert.equal(preferredAnalysisColumns(columns, { type: "Numeric" }, hints).at(-1).configurationData.id, "used");
});

test("source defaults respect nominated primary outputs even when their data is unavailable", () => {
  const result = { used: column("used", [1]), average: column("average", [7]), median: column("median", [6]) };
  const outputs = Object.values(result).map((field) => field.configurationData);
  const hints = { average: { primary: true }, used: { diagnostic: { kind: "INCLUDED" } } };
  assert.deepEqual(defaultSourceMeasures(outputs, undefined, hints), ["average"]);
  assert.deepEqual(defaultSourceMeasures(outputs, result, hints), ["average"]);
  result.average.data = [null];
  assert.deepEqual(defaultSourceMeasures(outputs, result, hints), [], "An undefined primary value never silently changes the question");
  assert.deepEqual(defaultSourceMeasures(outputs), ["used", "average", "median"], "Legacy methods retain all numerical choices");
  assert.match(sourceMeasureHelp({ outputs, analyticsMethod: { metadata: { outputHints: hints } }, measureColumnIds: [] }),
    /Choose a complete numerical measure/);
});
