import test from "node:test";
import assert from "node:assert/strict";
import { filterPluginUsage, pluginUsageModel } from "./plugin-usage-model.js";

const catalogs = {
  analyticsMethods: [{ id: "old", name: "Average", enabled: false }, { id: "new", name: "Average", enabled: true }, { id: "sum", name: "Sum", enabled: true }],
  visualizationLibraries: [{ id: "lib", name: "Charts", enabled: false }],
  visualizationTypes: [{ id: "chart", libraryId: "lib", name: "Bars", enabled: true }],
};
const usage = { analyticsMethods: [{ id: "old", indicatorCount: 4, uniqueUserCount: 2 }, { id: "gone", indicatorCount: 3, uniqueUserCount: 1 }],
  visualizationLibraries: [], visualizationTypes: [{ id: "chart", indicatorCount: 2, uniqueUserCount: 1 }] };

test("counts versions independently and preserves disabled entries with saved work", () => {
  const model = pluginUsageModel(catalogs, usage);
  assert.deepEqual(model.summaries.analyticsMethods, { installed: 3, enabled: 2, disabled: 1, inUse: 1, unused: 2 });
  assert.equal(model.rows.find((row) => row.id === "old").indicatorCount, 4);
  assert.equal(model.rows.find((row) => row.id === "new").indicatorCount, 0);
  assert.equal(model.unresolvedReferences, 3);
});

test("enabled chart types still require an enabled parent for new selections", () => {
  assert.equal(pluginUsageModel(catalogs, usage).rows.find((row) => row.id === "chart").selectable, false);
  assert.equal(pluginUsageModel({ ...catalogs, visualizationLibraries: null }, usage).rows.find((row) => row.id === "chart").selectable, null);
});

test("request failure never becomes zero use or an empty installed catalog", () => {
  const model = pluginUsageModel({ ...catalogs, analyticsMethods: null }, null);
  assert.equal(model.summaries.analyticsMethods, null);
  assert.equal(model.summaries.visualizationLibraries.unused, null);
  assert.equal(model.rows[0].indicatorCount, null);
  assert.deepEqual(filterPluginUsage(model.rows, { category: "visualizationLibraries", filter: "unused" }), []);
});

test("filters and sorts all entries before the caller paginates, with stable duplicate names", () => {
  const rows = pluginUsageModel(catalogs, usage).rows;
  assert.deepEqual(filterPluginUsage(rows, { category: "analyticsMethods" }).map((row) => row.id), ["old", "new", "sum"]);
  assert.deepEqual(filterPluginUsage(rows, { category: "analyticsMethods", filter: "unused", search: "average" }).map((row) => row.id), ["new"]);
  assert.deepEqual(filterPluginUsage(rows, { category: "analyticsMethods", sort: "name", direction: "desc" }).slice(0, 1).map((row) => row.id), ["sum"]);
});
