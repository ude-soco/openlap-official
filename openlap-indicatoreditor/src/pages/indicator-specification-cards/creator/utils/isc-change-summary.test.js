// Regression tests for getIscChangeSummary (Node's built-in runner, no deps).
// Run with:  npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { getIscChangeSummary } from "./isc-change-summary.js";

const baseIsc = () => ({
  requirements: {
    indicatorName: "Course completion",
    goal: "Analyse",
    question: "How many finished?",
    selectedPath: "Dataset",
    data: [{ value: "Student", type: { value: "Categorical" } }],
  },
  dataset: {
    rows: [{ a: 1 }, { a: 2 }],
    columns: [{ headerName: "Student", dataType: { value: "Categorical" } }],
  },
  visRef: {
    filter: { type: "Trends" },
    chart: { type: "Line chart" },
    data: { axisOptions: { selectedXAxis: "a" }, options: { title: { text: "t" } } },
  },
  lockedStep: {},
});

test("identical ISCs → no changes", () => {
  const result = getIscChangeSummary(baseIsc(), baseIsc());
  assert.equal(result.hasChanges, false);
  assert.deepEqual(result.groups, []);
});

test("name + goal change → Indicator definition group", () => {
  const draft = baseIsc();
  draft.requirements.indicatorName = "Course completion rate";
  draft.requirements.goal = "Compare";
  const result = getIscChangeSummary(baseIsc(), draft);
  assert.equal(result.hasChanges, true);
  const def = result.groups.find((g) => g.title === "Indicator definition");
  assert.ok(def, "definition group present");
  assert.ok(def.changes.some((c) => c.includes("Name:")));
  assert.ok(def.changes.includes("Goal changed"));
});

test("chart + task change → Path & visualization group with old → new", () => {
  const draft = baseIsc();
  draft.visRef.chart.type = "Bar chart";
  draft.visRef.filter.type = "Distribution";
  const result = getIscChangeSummary(baseIsc(), draft);
  const grp = result.groups.find((g) => g.title === "Path & visualization");
  assert.ok(grp);
  assert.ok(grp.changes.some((c) => c.includes("Line chart → Bar chart")));
  assert.ok(grp.changes.some((c) => c.includes("Trends → Distribution")));
});

test("dataset size change → Dataset group", () => {
  const draft = baseIsc();
  draft.dataset.rows = [{ a: 1 }, { a: 2 }, { a: 3 }];
  const result = getIscChangeSummary(baseIsc(), draft);
  const grp = result.groups.find((g) => g.title === "Dataset");
  assert.ok(grp);
  assert.ok(grp.changes.some((c) => c.includes("Size:")));
});

test("chart appearance / axis change → Chart setup group", () => {
  const draft = baseIsc();
  draft.visRef.data.options.title.text = "New title";
  draft.visRef.data.axisOptions.selectedXAxis = "b";
  const result = getIscChangeSummary(baseIsc(), draft);
  const grp = result.groups.find((g) => g.title === "Chart setup");
  assert.ok(grp);
  assert.ok(grp.changes.includes("Axis mapping changed"));
  assert.ok(grp.changes.includes("Chart appearance changed"));
});

test("robust to missing/empty inputs", () => {
  assert.doesNotThrow(() => getIscChangeSummary(undefined, undefined));
  assert.equal(getIscChangeSummary({}, {}).hasChanges, false);
});
