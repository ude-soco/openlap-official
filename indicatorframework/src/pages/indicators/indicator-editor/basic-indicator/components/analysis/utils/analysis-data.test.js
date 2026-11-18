import test from "node:test";
import assert from "node:assert/strict";
import { analyticsInputMenuList, compatibleAnalysisInputs, withAnalysisInput } from "./analysis-data.js";

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
  assert.equal(new Set(analyticsInputMenuList.map((field) => field.id)).size, analyticsInputMenuList.length);
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
