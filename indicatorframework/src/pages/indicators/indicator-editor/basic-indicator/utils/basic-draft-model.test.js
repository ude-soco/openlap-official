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

test("numerical and boolean xAPI mappings survive draft serialization and adaptation reference refresh", async () => {
  const state = emptyBasicState();
  state.analysis.selectedAnalyticsMethod.method = { id: "typed-method", name: "Typed method" };
  const inputs = [{ id: "values", type: "Numeric", required: true }, { id: "completed", type: "TrueFalse", required: false }];
  const outputs = [{ id: "statement.result.score.raw", type: "Numeric", name: "Raw score" },
    { id: "statement.result.completion", type: "TrueFalse", name: "Completion" }];
  state.analysis.selectedAnalyticsMethod.mapping.mapping = inputs.map((inputPort, index) => ({ inputPort, outputPort: outputs[index] }));
  const api = { get: async (path) => ({ data: { data: path === "v1/analytics/methods"
    ? [{ id: "typed-method", name: "Typed method" }]
    : path === "v1/analytics/methods/input-params/typed-method" ? { inputs, params: [] } : [] } }) };
  const result = await refreshBasicReferences(api, serializeBasicDraft(state), { adaptation: true });
  assert.deepEqual(result.state.analysis.selectedAnalyticsMethod.mapping.mapping.map((entry) =>
    [entry.outputPort.id, entry.outputPort.type]), outputs.map((entry) => [entry.id, entry.type]));
  assert.deepEqual(result.state.analysis.inputs.map((input) => input.selectedInput.type), ["Numeric", "TrueFalse"]);
  assert.deepEqual(result.warnings, []);
});

test("resuming a Basic draft clears identity mappings and reopens Analysis for review", async () => {
  const state = emptyBasicState();
  const method = { id: "grouped-summary", name: "Summarize numeric values by group" };
  const values = { id: "values", type: "Numeric", required: true };
  const group = { id: "group", type: "Text", required: true };
  const score = { id: "statement.result.score.raw", type: "Numeric", name: "Raw score" };
  state.analysis.selectedAnalyticsMethod = { method, mapping: { mapping: [
    { inputPort: values, outputPort: score },
    { inputPort: group, outputPort: { id: "statement.actor.account.name", type: "Text" } },
  ] } };
  state.analysis.analyzedData = { group: ["Old learner"] };
  state.visualization.previewData = { displayCode: ["Old chart"] };
  state.lockedStep.analysis = { locked: false, openPanel: false, step: "3" };
  state.lockedStep.visualization = { locked: false, openPanel: true, step: "4" };
  const raw = serializeBasicDraft(state);
  const restored = restoreBasicState(raw);
  assert.equal(restored.analysis.selectedAnalyticsMethod.mapping.mapping.length, 1);
  assert.deepEqual(restored.analysis.analyzedData, {});
  assert.deepEqual(restored.visualization.previewData.displayCode, []);
  assert.equal(restored.lockedStep.analysis.openPanel, true);
  assert.equal(restored.lockedStep.visualization.locked, true);
  assert.equal(restored.lockedStep.visualization.openPanel, false);
  assert.match(restored.inputWarning, /Learner identity fields.*Review Method inputs/);
  const api = { get: async (path) => ({ data: { data: path === "v1/analytics/methods" ? [method]
    : path === "v1/analytics/methods/input-params/grouped-summary" ? { inputs: [values, group], params: [] } : [] } }) };
  for (const adaptation of [false, true]) {
    const result = await refreshBasicReferences(api, raw, { adaptation });
    assert.deepEqual(result.state.analysis.inputs.map(({ selectedInput }) => selectedInput?.id), [score.id, undefined]);
    assert.match(result.state.inputWarning, /Learner identity fields/);
    assert.deepEqual(result.warnings, [], "Removing an input does not block remapping");
    assert.equal(JSON.stringify(serializeBasicDraft(result.state)).includes("statement.actor.account.name"), false);
  }
});

test("count-events drafts acquire or retain the hidden row marker while ordinary methods remain unmapped", async () => {
  const state = emptyBasicState();
  const method = { id: "event-method", name: "Count selected events", metadata: { inputRoles: { event: "EVENTS" } } };
  const inputs = [{ id: "event", type: "Text", required: true }];
  state.analysis.selectedAnalyticsMethod.method = method;
  const api = { get: async (path) => ({ data: { data: path === "v1/analytics/methods" ? [method]
    : path === "v1/analytics/methods/input-params/event-method" ? { inputs, params: [] } : [] } }) };
  const first = await refreshBasicReferences(api, serializeBasicDraft(state), { adaptation: true });
  assert.equal(first.state.analysis.selectedAnalyticsMethod.mapping.mapping[0].outputPort.id, "statement.id");
  const resumed = await refreshBasicReferences(api, serializeBasicDraft(first.state), { adaptation: true });
  assert.equal(resumed.state.analysis.selectedAnalyticsMethod.mapping.mapping[0].outputPort.id, "statement.id");
  assert.equal(resumed.state.analysis.inputs[0].selectedInput.name, "Selected events");
  assert.deepEqual(resumed.warnings, []);
  assert.equal(serializeBasicDraft(resumed.state).analysis.selectedAnalyticsMethod.method.metadata, undefined);
});

test("unavailable references preserve the saved choice and produce an actionable warning", async () => {
  const state = emptyBasicState();
  state.dataset.selectedLRSList = [{ lrsId: "gone", uniqueIdentifier: "scope", lrsTitle: "Old course" }];
  const api = { get: async () => ({ data: { data: [] } }), post: async () => { throw new Error("unavailable"); } };
  const result = await refreshBasicReferences(api, serializeBasicDraft(state));
  assert.equal(result.state.dataset.selectedLRSList[0].lrsId, "gone");
  assert.match(result.warnings.join(" "), /no longer available/);
});

test("partial versioned Basic documents retain completed choices and receive safe missing-section defaults", () => {
  const restored = restoreBasicState({ schemaVersion: 1, type: "BASIC", analysis: {
    selectedAnalyticsMethod: { method: { id: "selected-method", name: "Counting" }, mapping: { mapping: [] } },
    params: [{ id: "limit", value: 0 }],
  } });
  assert.equal(restored.analysis.selectedAnalyticsMethod.method.id, "selected-method");
  assert.equal(restored.analysis.params[0].value, 0);
  assert.equal(restored.filters.selectedUserFilter, "ONLY_ME");
  assert.deepEqual(restored.dataset.selectedLRSList, []);
});

test("adaptation hydration clears unavailable private choices and defaults an unrecognised scope to only-my-data", async () => {
  const state = emptyBasicState();
  state.dataset.selectedLRSList = [{ lrsId: "not-viewer-owned", uniqueIdentifier: "other", lrsTitle: "Foreign" }];
  state.analysis.selectedAnalyticsMethod.method = { id: "gone-method", name: "Unavailable" };
  state.visualization.selectedLibrary = { id: "gone-library", name: "Unavailable" };
  state.visualization.selectedType = { id: "gone-chart", name: "Unavailable" };
  state.filters.selectedUserFilter = "INCLUDE_ALL";
  state.filters.selectedActivities = [{ id: "slot", selectedActivityType: { id: "pdf", name: "Pdf" }, selectedActionList: [{ id: "accessed" }], selectedActivityList: [{ id: "creator-item" }] }];
  const result = await refreshBasicReferences({ get: async () => ({ data: { data: [] } }) }, serializeBasicDraft(state), { adaptation: true });
  assert.deepEqual(result.state.dataset.selectedLRSList, []);
  assert.equal(result.state.filters.selectedUserFilter, "ONLY_ME");
  assert.equal(result.state.analysis.selectedAnalyticsMethod.method.id, "");
  assert.equal(result.state.visualization.selectedType.id, "");
  assert.deepEqual(result.state.filters.selectedActivities[0].selectedActionList, []);
});
test("adaptation hydration preserves every explicitly selected user scope through serialization and reload", async () => {
  const api = { get: async () => ({ data: { data: [] } }) };
  for (const scope of ["ONLY_ME", "EXCLUDE_ME", "INCLUDE_ME"]) {
    const state = emptyBasicState();
    state.filters.selectedUserFilter = scope;
    const first = await refreshBasicReferences(api, serializeBasicDraft(state), { adaptation: true });
    const resumed = await refreshBasicReferences(api, serializeBasicDraft(first.state), { adaptation: true });
    assert.equal(first.state.filters.selectedUserFilter, scope);
    assert.equal(resumed.state.filters.selectedUserFilter, scope);
  }
  const fresh = await refreshBasicReferences(api, serializeBasicDraft(emptyBasicState()), { adaptation: true });
  assert.equal(fresh.state.filters.selectedUserFilter, "ONLY_ME", "Fresh adaptations still preselect only-my-data");
});
test("adaptation hydration never replaces accessed with clicked and drops stale activities", async () => {
  const state = emptyBasicState();
  state.dataset.selectedLRSList = [{ lrsId: "viewer", uniqueIdentifier: "own" }];
  state.filters.selectedActivities = [{ id: "slot", selectedActivityType: { id: "pdf", name: "Pdf" }, selectedActionList: [{ id: "accessed", name: "Accessed" }], selectedActivityList: [{ id: "private-item", name: "Private" }] }];
  const api = { get: async (path) => ({ data: { data: path.endsWith("/lrs") ? [{ lrsId: "viewer", uniqueIdentifier: "own" }] : [] } }),
    post: async (path) => ({ data: { data: path.endsWith("activity-types") ? [{ id: "pdf", name: "PDF" }] : [{ id: "clicked", name: "Clicked" }] } }) };
  const result = await refreshBasicReferences(api, serializeBasicDraft(state), { adaptation: true });
  assert.equal(result.state.filters.selectedActivities[0].selectedActivityType.id, "pdf");
  assert.deepEqual(result.state.filters.selectedActivities[0].selectedActionList, []);
  assert.deepEqual(result.state.filters.selectedActivities[0].selectedActivityList, []);
});
