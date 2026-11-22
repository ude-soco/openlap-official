import test from "node:test";
import assert from "node:assert/strict";
import { analyticsInputMenuList, compatibleAnalysisInputs, currentAnalysisSource, isEventInput, isIdentityAnalysisField,
  withAnalysisInput, withAnalysisInputDefaults } from "./analysis-data.js";

test("numeric and boolean methods receive compatible xAPI measurements rather than text labels", () => {
  const numeric = compatibleAnalysisInputs({ type: "Numeric" });
  assert.deepEqual(numeric.map((field) => field.id), ["raw", "scaled", "min", "max"].map((field) => `statement.result.score.${field}`));
  assert.equal(numeric.every((field) => field.type === "Numeric"), true);
  const booleans = compatibleAnalysisInputs({ type: "TrueFalse" });
  assert.deepEqual(booleans.map((field) => field.id), ["statement.result.success", "statement.result.completion"]);
  assert.equal(booleans.every((field) => field.type === "TrueFalse"), true);
  const categorical = compatibleAnalysisInputs({ type: "Text" });
  assert.equal(categorical.some((field) => field.id === "statement.timestamp"), true);
  assert.equal(categorical.some((field) => field.id === "statement.result.score.raw"), false);
  assert.equal(categorical.some((field) => field.id === "statement.verb.id" && field.name === "Action identifier"), true);
  assert.equal(categorical.some((field) => field.id === "statement.object.id" && field.name === "Activity identifier"), true);
  assert.equal(categorical.some((field) => field.id === "statement.id"), false, "The event marker is not offered as a general category");
  assert.equal(new Set(analyticsInputMenuList.map((field) => field.id)).size, analyticsInputMenuList.length);
});

const eventContract = [{ id: "rows", type: "Text", required: true }];
const withRoles = (inputRoles) => ({ id: "third-party", name: "Renamed method", metadata: { inputRoles } });
const eventAnalysis = () => ({ inputs: eventContract, params: [], analyzedData: {},
  selectedAnalyticsMethod: { method: withRoles({ rows: "EVENTS" }), mapping: { mapping: [] } } });

test("declared required event inputs receive an event marker regardless of plugin or port name", () => {
  const original = eventAnalysis();
  const selected = withAnalysisInputDefaults(original);
  assert.equal(selected.selectedAnalyticsMethod.mapping.mapping[0].outputPort.id, "statement.id");
  assert.equal(selected.selectedAnalyticsMethod.mapping.mapping[0].inputPort.id, "rows");
  assert.equal(original.selectedAnalyticsMethod.mapping.mapping.length, 0);
  assert.equal(isEventInput({ name: "Count selected events" }, eventContract[0]), false);
  for (const update of [
    (value) => { value.selectedAnalyticsMethod.method = withRoles({ rows: "CATEGORY" }); },
    (value) => { value.inputs = [{ ...eventContract[0], id: "category" }]; },
    (value) => { value.inputs = [{ ...eventContract[0], type: "Numeric" }]; },
    (value) => { value.inputs = [{ ...eventContract[0], required: false }]; },
  ]) {
    const other = eventAnalysis();
    update(other);
    assert.equal(withAnalysisInputDefaults(other), other);
  }
});

test("event defaults fill individual unmapped ports while preserving saved choices", () => {
  const saved = withAnalysisInput(eventAnalysis(), eventContract[0], { id: "statement.object.id", type: "Text" });
  assert.equal(withAnalysisInputDefaults(saved), saved);
  const marker = { id: "statement.id", type: "Text" };
  assert.equal(currentAnalysisSource(eventContract[0], marker).id, marker.id);
  assert.equal(currentAnalysisSource({ ...eventContract[0], type: "Numeric" }, marker), undefined);
  const additional = { id: "alternateRows", type: "Text", required: true };
  saved.inputs = [...saved.inputs, additional];
  saved.selectedAnalyticsMethod.method = withRoles({ rows: "EVENTS", alternateRows: "EVENTS" });
  assert.deepEqual(withAnalysisInputDefaults(saved).selectedAnalyticsMethod.mapping.mapping.map(({ outputPort }) => outputPort.id),
    ["statement.object.id", "statement.id"]);
});

test("declared timestamp and category roles filter text inputs without treating every port alike", () => {
  const time = { id: "session_start", type: "Text" };
  const category = { id: "resource_name", type: "Text" };
  const method = withRoles({ session_start: "TIMESTAMP", resource_name: "CATEGORY" });
  assert.deepEqual(compatibleAnalysisInputs(time, undefined, method).map(({ id }) => id),
    ["statement.timestamp", "statement.stored"]);
  const choices = compatibleAnalysisInputs(category, undefined, method);
  assert.ok(choices.some(({ id }) => id === "statement.verb.display.en-US"));
  assert.ok(choices.some(({ id }) => id === "statement.verb.id"));
  assert.ok(!choices.some(({ id }) => ["statement.verb.display", "statement.timestamp", "statement.stored"].includes(id)));
  const legacy = compatibleAnalysisInputs(time, undefined, { name: "Count events over time" });
  assert.ok(legacy.some(({ id }) => id === "statement.verb.display"));
  assert.ok(legacy.some(({ id }) => id === "statement.timestamp"));
  const saved = { id: "statement.result.extensions.customTime", name: "Existing timestamp", type: "Text" };
  assert.equal(compatibleAnalysisInputs(time, saved, method).at(-1).id, saved.id);
});

test("an existing custom field stays visible with its original type and a usable label", () => {
  const selected = { id: "statement.result.extensions.score", type: "Numeric", title: "Recorded score" };
  const options = compatibleAnalysisInputs({ type: "Numeric" }, selected);
  assert.equal(options.at(-1).name, "Recorded score");
  assert.equal(options.at(-1).id, selected.id);
  assert.equal(compatibleAnalysisInputs({ type: "Text" }, selected).some((field) => field.id === selected.id), false);
});

test("picker and mapping reject old xAPI identity fields, including nested and whole-object paths", () => {
  const input = { id: "group", type: "Text" };
  const method = { name: "Count distinct values" };
  for (const path of [
    "statement", "statement.actor", "statement.actor.account.name", "statement.actor.mbox", "actor.openid",
    "statement.authority", "statement.object", "statement.object.object.actor.mbox", "statement.object.name",
    "statement.object.mbox.sha1sum", "statement.object.mbox_sha1sum", "statement.object.member.0.account.name",
    "statement.context", "statement.object.context.instructor.account.name", "statement.context.team",
    "statement.context.contextAgents.0.agent.account.name", "statement.context.contextGroups", "$statement", "$$ROOT", "$actor",
  ]) {
    const previousSelection = { id: path, type: input.type, name: "Saved field" };
    assert.equal(isIdentityAnalysisField(path), true, path);
    assert.ok(!compatibleAnalysisInputs(input, previousSelection, method).some((field) => field.id === path), path);
    const analysis = eventAnalysis();
    assert.equal(withAnalysisInput(analysis, input, previousSelection), analysis, path);
  }
  assert.ok(analyticsInputMenuList.every((field) => !isIdentityAnalysisField(field.id)));
  for (const path of [
    "statement.object.id", "statement.object.definition.name.en-US", "statement.context.platform", "statement.timestamp",
    "statement.id", "statement.result.extensions.score",
  ]) assert.equal(isIdentityAnalysisField(path), false, path);
});

test("changing and clearing one optional input preserves the required mapping and invalidates old results", () => {
  const required = { id: "values", type: "Numeric", required: true };
  const optional = { id: "group", type: "Text", required: false };
  const score = analyticsInputMenuList.find((field) => field.id === "statement.result.score.raw");
  const activities = analyticsInputMenuList.find((field) => field.id === "statement.object.definition.name.en-US");
  const original = {
    inputs: [required, optional],
    selectedAnalyticsMethod: { method: { id: "summary" }, mapping: { mapping: [{ inputPort: required, outputPort: score }] } },
    analyzedData: { previous: [1] },
  };
  const selected = withAnalysisInput(original, optional, activities);
  assert.equal(selected.selectedAnalyticsMethod.mapping.mapping.length, 2);
  assert.equal(selected.inputs[1].selectedInput, activities);
  const cleared = withAnalysisInput(selected, optional, undefined);
  assert.deepEqual(cleared.selectedAnalyticsMethod.mapping.mapping, original.selectedAnalyticsMethod.mapping.mapping);
  assert.equal(cleared.inputs[1].selectedInput, undefined);
  assert.deepEqual(cleared.analyzedData, {});
  assert.deepEqual(original.analyzedData, { previous: [1] });
  assert.equal(original.inputs[1].selectedInput, undefined);
});
