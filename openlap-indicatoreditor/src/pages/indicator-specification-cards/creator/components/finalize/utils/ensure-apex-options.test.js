// Regression tests for ensureApexOptions (Node's built-in test runner, no deps).
//
// Guards the "incomplete draft Finalize crash": a continued draft can reach the
// chart components with `visRef.data.options` missing or partial, after which the
// renderers read nested Apex fields like `options.xaxis.title`. ensureApexOptions
// must guarantee those containers exist while preserving any real values.
//
// Run with:  npm test   (node --test src)

import { test } from "node:test";
import assert from "node:assert/strict";
import { ensureApexOptions } from "./ensure-apex-options.js";

test("undefined input → safe nested containers exist", () => {
  const o = ensureApexOptions(undefined);
  assert.ok(o.xaxis && o.xaxis.title, "xaxis.title must exist");
  assert.ok(o.yaxis && o.yaxis.title, "yaxis.title must exist");
  assert.ok(o.chart, "chart must exist");
  assert.ok(o.legend, "legend must exist");
  assert.ok(o.dataLabels, "dataLabels must exist");
  // The exact path that crashed must be readable.
  assert.equal(typeof o.xaxis.title.text, "string");
});

test("empty object → same guarantees", () => {
  const o = ensureApexOptions({});
  assert.ok(o.xaxis.title);
  assert.ok(o.yaxis.title);
  assert.ok(o.chart);
  assert.ok(o.legend);
  assert.ok(o.dataLabels);
  assert.ok(o.plotOptions);
  assert.ok(Array.isArray(o.colors));
});

test("partial object → preserves values and fills containers", () => {
  const o = ensureApexOptions({ xaxis: { categories: ["A", "B"] } });
  assert.deepEqual(o.xaxis.categories, ["A", "B"], "categories preserved");
  assert.ok(o.xaxis.title, "xaxis.title backfilled");
  assert.ok(o.yaxis.title, "yaxis.title backfilled");
});

test("complete saved options → important values preserved", () => {
  const input = {
    chart: { id: "bar", type: "bar" },
    xaxis: { categories: ["x"], title: { text: "Group by" } },
    yaxis: { title: { text: "Measure" } },
    legend: { show: true, position: "bottom" },
    dataLabels: { enabled: true },
    colors: ["#008FFB"],
    title: { text: "My chart" },
  };
  const o = ensureApexOptions(input);
  assert.deepEqual(o.xaxis.categories, ["x"]);
  assert.equal(o.xaxis.title.text, "Group by");
  assert.equal(o.yaxis.title.text, "Measure");
  assert.equal(o.legend.position, "bottom");
  assert.equal(o.dataLabels.enabled, true);
  assert.deepEqual(o.colors, ["#008FFB"]);
  assert.equal(o.title.text, "My chart");
  assert.equal(o.chart.id, "bar");
});

test("yaxis array → stays an array (no object-spread corruption)", () => {
  const o = ensureApexOptions({
    yaxis: [{ title: { text: "A" } }, { title: { text: "B" } }],
  });
  assert.ok(Array.isArray(o.yaxis), "yaxis must remain an array");
  assert.equal(o.yaxis.length, 2);
  assert.equal(o.yaxis[0].title.text, "A");
  assert.equal(o.yaxis[1].title.text, "B");
});

test("does not mutate the input object", () => {
  const input = { xaxis: { categories: ["A"] } };
  const before = JSON.stringify(input);
  ensureApexOptions(input);
  assert.equal(JSON.stringify(input), before, "input must be untouched");
});
