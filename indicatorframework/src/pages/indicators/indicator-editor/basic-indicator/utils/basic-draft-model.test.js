import test from "node:test";
import assert from "node:assert/strict";
import { basicDraftMeaningful, emptyBasicState, readBasicDraft, refreshBasicReferences,
  restoreBasicState, serializeBasicDraft } from "./basic-draft-model.js";

test("draft projection keeps selections and explicit values while excluding catalogs, rows and executable previews", () => {
  const state = emptyBasicState();
  state.indicator.indicatorName = "Material counts";
  state.dataset.myLRSList = [{ password: "must-not-persist" }];
  state.dataset.selectedLRSList = [{ id: "consumer", lrsId: "lrs", uniqueIdentifier: "scope", lrsTitle: "Course", secret: "excluded" }];
  state.analysis.analyticsMethodList = [{ id: "unused" }];
  state.analysis.params = [{ id: "limit", value: 0, possibleValues: "stale" }, { id: "enabled", value: false }, { id: "text", value: "" }];
  state.analysis.analyzedData = { records: ["private data"] };
  state.visualization.previewData = { scriptData: "alert(1)" };
  state.visualization.selectedType = { id: "chart", name: "Bar", chartInputs: ["stale"], visualizationDescriptor: { unused: true } };
  const result = serializeBasicDraft(state);
  assert.deepEqual(result.analysis.params, [{ id: "limit", value: 0 }, { id: "enabled", value: false }, { id: "text", value: "" }]);
  assert.deepEqual(result.visualization.selectedType, { id: "chart", name: "Bar" });
  assert.deepEqual(result.dataset.selectedLRSList[0], { id: "consumer", lrsId: "lrs", uniqueIdentifier: "scope", lrsTitle: "Course" });
  const serialized = JSON.stringify(result);
  for (const excluded of ["must-not-persist", "private data", "alert(1)", "analyticsMethodList", "previewData", "chartInputs", "possibleValues", "secret"]) {
    assert.equal(serialized.includes(excluded), false, excluded);
  }
});

test("legacy Basic snapshots adapt safely and malformed or other-editor recovery never hydrates Basic", () => {
  const state = emptyBasicState();
  state.analysis.analyzedData = { records: [1] };
  state.visualization.previewData = { displayCode: ["<script>stale</script>"] };
  const restored = restoreBasicState(JSON.stringify(state));
  assert.deepEqual(restored.analysis.analyzedData, {});
  assert.deepEqual(restored.visualization.previewData.displayCode, []);
  for (const raw of ["{bad", "null", { ...state, schemaVersion: 2 }, { ...state, type: "COMPOSITE" }, { type: "BASIC" }]) {
    assert.equal(readBasicDraft(raw), null);
  }
  assert.equal(basicDraftMeaningful(serializeBasicDraft(emptyBasicState())), false);
  assert.equal(basicDraftMeaningful({ indicator: { indicatorName: "Named draft" } }), true);
});

test("resuming fetches current contracts, preserves edited false/zero/blank values and maps chart selections", async () => {
  const state = emptyBasicState();
  state.analysis.selectedAnalyticsMethod.method = { id: "method", name: "Old name" };
  state.analysis.params = [{ id: "count", value: 0 }, { id: "enabled", value: false }, { id: "label", value: "" }];
  state.analysis.selectedAnalyticsMethod.mapping.mapping = [{ inputPort: { id: "items" }, outputPort: { id: "activities", name: "Activities", type: "Text" } }];
  state.visualization.selectedLibrary = { id: "lib", name: "Old library" };
  state.visualization.selectedType = { id: "chart", name: "Bar" };
  state.visualization.mapping.mapping = [{ inputPort: { id: "x" }, outputPort: { id: "names", type: "Text" } }];
  const routes = {
    "v1/users/my/lrs": [], "v1/analytics/methods": [{ id: "method", name: "Current name" }],
    "v1/visualizations/libraries": [{ id: "lib", name: "Current library" }],
    "v1/analytics/methods/input-params/method": { inputs: [{ id: "items", type: "Text" }],
      params: [{ id: "count", defaultValue: 10 }, { id: "enabled", defaultValue: true }, { id: "label", defaultValue: "Default" }] },
    "v1/visualizations/libraries/lib/types": [{ id: "chart", name: "Current chart", chartInputs: [{ id: "x", type: "Text" }] }],
  };
  const api = { get: async (path) => { assert.ok(path in routes, path); return { data: { data: routes[path] } }; } };
  const result = await refreshBasicReferences(api, serializeBasicDraft(state));
  assert.deepEqual(result.warnings, []);
  assert.equal(result.state.analysis.selectedAnalyticsMethod.method.name, "Current name");
  assert.deepEqual(result.state.analysis.params.map((entry) => entry.value), [0, false, ""]);
  assert.equal(result.state.analysis.inputs[0].selectedInput.id, "activities");
  assert.equal(result.state.visualization.inputs[0].selectedInput.id, "names");
});

test("unavailable references preserve the saved choice and produce an actionable warning", async () => {
  const state = emptyBasicState();
  state.dataset.selectedLRSList = [{ lrsId: "gone", uniqueIdentifier: "scope", lrsTitle: "Old course" }];
  const api = { get: async () => ({ data: { data: [] } }), post: async () => { throw new Error("unavailable"); } };
  const result = await refreshBasicReferences(api, serializeBasicDraft(state));
  assert.equal(result.state.dataset.selectedLRSList[0].lrsId, "gone");
  assert.match(result.warnings.join(" "), /no longer available/);
});
