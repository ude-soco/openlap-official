import test from "node:test";
import assert from "node:assert/strict";
import { getWorkflowSteps, openBasicStep } from "./basic-workflow-ui.js";

const workflow = () => ({
  dataset: { locked: false, openPanel: true, step: "1" },
  filters: { locked: false, openPanel: false, step: "2" },
  analysis: { locked: true, openPanel: false, step: "3" },
  visualization: { locked: true, openPanel: false, step: "4" },
  finalize: { locked: true, openPanel: false, step: "5" },
});

test("navigation reopens an available section without changing other panels or progress", () => {
  const previous = workflow();
  const completion = getWorkflowSteps(previous).map(({ completed }) => completed);
  const next = openBasicStep(previous, "filters");

  assert.equal(next.filters.openPanel, true);
  assert.equal(previous.filters.openPanel, false);
  assert.equal(next.dataset, previous.dataset, "another open panel stays open");
  for (const key of ["analysis", "visualization", "finalize"]) assert.equal(next[key], previous[key]);
  assert.deepEqual(getWorkflowSteps(next).map(({ completed }) => completed), completion);
  assert.equal(openBasicStep(next, "filters"), next, "repeated navigation does not write a new state");
});

test("navigation cannot unlock sections, finalize, or introduce unknown sections", () => {
  const previous = workflow();
  for (const key of ["analysis", "visualization", "finalize", "missing", "__proto__"]) {
    assert.equal(openBasicStep(previous, key), previous);
  }
  assert.equal(openBasicStep({}, "filters").filters, undefined);
  assert.equal(openBasicStep(undefined, "filters"), undefined);
});

test("locked navigation entries explain the actual prerequisite", () => {
  const steps = getWorkflowSteps(workflow());
  assert.match(steps.find(({ key }) => key === "analysis").lockedHint, /Filters/);
  assert.match(steps.find(({ key }) => key === "visualization").lockedHint, /analysis preview/);
});
