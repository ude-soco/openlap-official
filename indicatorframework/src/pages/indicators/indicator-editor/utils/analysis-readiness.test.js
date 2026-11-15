import test from "node:test";
import assert from "node:assert/strict";
import { basicAnalysisReady, parametersReady } from "./analysis-readiness.js";

const requiredInput = { id: "items", type: "Text", required: true };
const optionalInput = { id: "users", type: "Text", required: false };
const textColumn = { id: "statement.object.definition.name.en-US", type: "Text" };
const mapped = (inputPort = requiredInput, outputPort = textColumn) => ({ inputPort, outputPort });
const fixture = () => ({
  dataset: { selectedLRSList: [{ id: "source" }] },
  filters: {
    selectedTime: { from: "2020-01-01T00:00:00Z", until: "2021-01-01T00:00:00Z" },
    selectedActivities: [{
      selectedActivityType: { id: "material" },
      selectedActivityList: [{ id: "material-1" }],
      selectedActionList: [],
    }],
  },
  analysis: {
    inputs: [requiredInput, optionalInput],
    params: [{ id: "limit", dataType: "INTEGER", required: true, defaultValue: 10 }],
    selectedAnalyticsMethod: {
      method: { id: "counts" }, mapping: { mapping: [mapped()] },
    },
  },
});
const ready = ({ dataset, filters, analysis }) => basicAnalysisReady(dataset, filters, analysis);

test("a valid Basic configuration uses parameter defaults without requiring optional inputs or actions", () => {
  assert.equal(ready(fixture()), true);
});

test("all required method inputs must have mappings from the current typed contract", () => {
  const value = fixture();
  value.analysis.inputs = [requiredInput, { ...optionalInput, required: true }];
  assert.equal(ready(value), false, "one selected required input does not complete another");
  value.analysis.selectedAnalyticsMethod.mapping.mapping.push(mapped(optionalInput));
  assert.equal(ready(value), true);
  value.analysis.selectedAnalyticsMethod.mapping.mapping[0].outputPort = { id: "number", type: "Numeric" };
  assert.equal(ready(value), false, "a mapped column must match the declared input type");
});

test("optional inputs can be omitted, but optional-only contracts still need a valid mapping", () => {
  const value = fixture();
  value.analysis.inputs = [optionalInput];
  value.analysis.selectedAnalyticsMethod.mapping.mapping = [];
  assert.equal(ready(value), false);
  value.analysis.selectedAnalyticsMethod.mapping.mapping = [mapped(optionalInput, { id: "number", type: "Numeric" })];
  assert.equal(ready(value), false);
  value.analysis.selectedAnalyticsMethod.mapping.mapping = [mapped(optionalInput)];
  assert.equal(ready(value), true);
});

test("selecting a method waits for its input contract and rejects an obsolete mapping", () => {
  for (const update of [
    (value) => { value.analysis.selectedAnalyticsMethod.method.id = ""; },
    (value) => { value.analysis.inputs = []; },
    (value) => { value.analysis.selectedAnalyticsMethod.mapping.mapping = [mapped({ id: "old-method-input", type: "Text" })]; },
    (value) => { value.analysis.selectedAnalyticsMethod.mapping.mapping[0].outputPort = { type: "Text" }; },
  ]) {
    const value = fixture();
    update(value);
    assert.equal(ready(value), false);
  }
});

test("analysis waits for selected LRS and complete activity filters", () => {
  for (const update of [
    (value) => { value.dataset.selectedLRSList = []; },
    (value) => { value.filters.selectedActivities = []; },
    (value) => { value.filters.selectedActivities[0].selectedActivityType.id = ""; },
    (value) => { value.filters.selectedActivities[0].selectedActivityList = []; },
    (value) => { value.filters.selectedActivities.push({ selectedActivityType: { id: "video" }, selectedActivityList: [] }); },
  ]) {
    const value = fixture();
    update(value);
    assert.equal(ready(value), false);
  }
});

test("analysis waits for a valid, ordered timeframe", () => {
  const value = fixture();
  for (const selectedTime of [
    { from: "", until: "2021-01-01" },
    { from: "2020-01-01", until: "not-a-date" },
    { from: "2022-01-01", until: "2021-01-01" },
  ]) {
    value.filters.selectedTime = selectedTime;
    assert.equal(ready(value), false);
  }
  value.filters.selectedTime = { from: "2021-01-01", until: "2021-01-01" };
  assert.equal(ready(value), true, "equal start and end are not inverted");
});

test("automatic Basic analysis pauses during incomplete or invalid parameter edits", () => {
  const value = fixture();
  for (const paramValue of ["", " ", "1.5", "Infinity", "invalid"]) {
    value.analysis.params[0].value = paramValue;
    assert.equal(ready(value), false);
  }
  value.analysis.params[0].value = "2";
  assert.equal(ready(value), true);
  value.analysis.params = [{ id: "direction", type: "Choice", possibleValues: "Most,Least", required: true, value: "Other" }];
  assert.equal(ready(value), false);
  value.analysis.params[0].value = "Most";
  assert.equal(ready(value), true);
});

test("shared parameter readiness accepts optional blank values and finite decimal parameters", () => {
  assert.equal(parametersReady([{ id: "optional", required: false, value: "" }]), true);
  assert.equal(parametersReady([{ id: "decimal", dataType: "DOUBLE", value: "2.75" }]), true);
  assert.equal(parametersReady([{ id: "decimal", dataType: "FLOAT", value: Number.NaN }]), false);
});
