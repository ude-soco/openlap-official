import test from "node:test";
import assert from "node:assert/strict";
import { analyticsInputMenuList, compatibleAnalysisInputs, currentAnalysisSource, isEventCountInput,
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

const eventContract = [{ id: "event", type: "Text", required: true }];
const eventAnalysis = () => ({ inputs: eventContract, params: [], analyzedData: {},
  selectedAnalyticsMethod: { method: { id: "event-method", name: "Count selected events" }, mapping: { mapping: [] } } });

test("only the agreed count-events method and contract receive the hidden event-row default", () => {
  const original = eventAnalysis();
  const selected = withAnalysisInputDefaults(original);
  assert.equal(selected.selectedAnalyticsMethod.mapping.mapping[0].outputPort.id, "statement.id");
  assert.equal(selected.selectedAnalyticsMethod.mapping.mapping[0].inputPort.id, "event");
  assert.equal(original.selectedAnalyticsMethod.mapping.mapping.length, 0);
  assert.equal(isEventCountInput({ name: "Count events" }, eventContract), false, "No undocumented aliases");
  for (const update of [
    (value) => { value.selectedAnalyticsMethod.method.name = "Count events by category"; },
    (value) => { value.inputs = [{ ...eventContract[0], id: "category" }]; },
    (value) => { value.inputs = [{ ...eventContract[0], type: "Numeric" }]; },
    (value) => { value.inputs = [{ ...eventContract[0], required: false }]; },
  ]) {
    const other = eventAnalysis();
    update(other);
    assert.equal(withAnalysisInputDefaults(other), other);
  }
});

test("count-events defaults preserve saved mappings and the hidden source survives reference refresh", () => {
  const saved = withAnalysisInput(eventAnalysis(), eventContract[0], { id: "statement.object.id", type: "Text" });
  assert.equal(withAnalysisInputDefaults(saved), saved);
  const marker = { id: "statement.id", type: "Text" };
  assert.equal(currentAnalysisSource({ name: "Count selected events" }, eventContract, eventContract[0], marker).id, marker.id);
  assert.equal(currentAnalysisSource({ name: "Count distinct values" }, eventContract, eventContract[0], marker), undefined);
});

test("new text analytics offer scalar categories and timestamps appropriate to their declared purpose", () => {
  const timestamps = compatibleAnalysisInputs({ id: "timestamp", type: "Text" }, undefined, { name: "Count events over time" });
  assert.deepEqual(timestamps.map((field) => field.id), ["statement.timestamp", "statement.stored"]);
  for (const [name, id] of [["Count events by category", "category"], ["Count distinct values", "value"],
    ["Count distinct values", "group"], ["Calculate percentage of true outcomes", "group"],
    ["Summarize numeric values by group", "group"], ["Group observations using reproducible K-means++", "observation"]]) {
    const options = compatibleAnalysisInputs({ id, type: "Text" }, undefined, { name });
    assert.equal(options.some((field) => field.id === "statement.verb.display"), false, name);
    assert.equal(options.some((field) => ["statement.timestamp", "statement.stored"].includes(field.id)), false, name);
    assert.equal(options.some((field) => field.id === "statement.verb.display.en-US"), true, name);
    assert.equal(options.some((field) => field.id === "statement.verb.id"), true, name);
  }
  const legacy = compatibleAnalysisInputs({ id: "items", type: "Text" }, undefined, { name: "Legacy method" });
  assert.equal(legacy.some((field) => field.id === "statement.verb.display"), true);
  assert.equal(legacy.some((field) => field.id === "statement.timestamp"), true);
  const saved = { id: "statement.result.extensions.customTime", name: "Existing timestamp", type: "Text" };
  assert.equal(compatibleAnalysisInputs({ id: "timestamp", type: "Text" }, saved, { name: "Count events over time" }).at(-1).id, saved.id);
});

test("an existing custom field stays visible with its original type and a usable label", () => {
  const selected = { id: "statement.result.extensions.score", type: "Numeric", title: "Recorded score" };
  const options = compatibleAnalysisInputs({ type: "Numeric" }, selected);
  assert.equal(options.at(-1).name, "Recorded score");
  assert.equal(options.at(-1).id, selected.id);
  assert.equal(compatibleAnalysisInputs({ type: "Text" }, selected).some((field) => field.id === selected.id), false);
});

test("changing and clearing one optional input preserves the required mapping and invalidates old results", () => {
  const required = { id: "values", type: "Numeric", required: true };
  const optional = { id: "group", type: "Text", required: false };
  const score = analyticsInputMenuList.find((field) => field.id === "statement.result.score.raw");
  const users = analyticsInputMenuList.find((field) => field.id === "statement.actor.account.name");
  const original = {
    inputs: [required, optional],
    selectedAnalyticsMethod: { method: { id: "summary" }, mapping: { mapping: [{ inputPort: required, outputPort: score }] } },
    analyzedData: { previous: [1] },
  };
  const selected = withAnalysisInput(original, optional, users);
  assert.equal(selected.selectedAnalyticsMethod.mapping.mapping.length, 2);
  assert.equal(selected.inputs[1].selectedInput, users);
  const cleared = withAnalysisInput(selected, optional, undefined);
  assert.deepEqual(cleared.selectedAnalyticsMethod.mapping.mapping, original.selectedAnalyticsMethod.mapping.mapping);
  assert.equal(cleared.inputs[1].selectedInput, undefined);
  assert.deepEqual(cleared.analyzedData, {});
  assert.deepEqual(original.analyzedData, { previous: [1] });
  assert.equal(original.inputs[1].selectedInput, undefined);
});
